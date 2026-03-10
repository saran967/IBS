import mongoose from "mongoose";
import Order from "../models/orderModel.js";
import Inventory from "../models/inventoryModel.js";
import Product from "../models/productModel.js";
import Shop from "../models/shopModel.js";
import Customer from "../models/customerModel.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";


async function generateOrderNumber() {
  const last = await Order.findOne({
    orderNumber: { $regex: /^ORD\d+$/ },
  })
    .sort({ createdAt: -1 })
    .select("orderNumber");

  if (!last || !last.orderNumber) return "ORD0001";
  const numeric =
    parseInt(String(last.orderNumber).replace(/\D/g, ""), 10) || 0;
  return "ORD" + String(numeric + 1).padStart(4, "0");
}

// -----------------------------------------------------------------------------
// CREATE ORDER
// -----------------------------------------------------------------------------
export const createOrder = async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user?.role === "admin";
    const body = req.body;
    console.log("createOrder body:", JSON.stringify(body, null, 2));
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) {
      return res.status(400).json({ msg: "No active financial year found. Please activate one first." });
    }

    // Normalize to array
    const ordersArray = Array.isArray(body) ? body : [body];
    if (!ordersArray.length) {
      return res.status(400).json({ msg: "No order data provided" });
    }

    // Group orders by customerId (so multiple incoming records for same customer merge)
    const groupedOrders = {};
    for (const order of ordersArray) {
      const key = `${order.customerId}`;
      if (!groupedOrders[key]) {
        groupedOrders[key] = {
          customerId: order.customerId,
          pickupDate: order.pickupDate,
          orderItems: [],
        };
      }

      // Each incoming order may contain multiple orderItems
      for (const item of order.orderItems || []) {
        const orderItem = {
          shopId: item.shopId,
          godownId: item.godownId || null,
          productId: item.productId,
          status: "Pending",
          quantity: item.quantity ?? 0,
          price: Number(item.price) || 0, //  IMPORTANT
          companyItems: [],
        };

        // Handle multiple companies per item
        if (Array.isArray(item.companyItems) && item.companyItems.length > 0) {
          for (const comp of item.companyItems) {
            const q = Number(comp.quantity ?? 0);
            if (q > 0) {
              orderItem.companyItems.push({
                companyName: comp.companyName,
                quantity: q,
              });
            }
          }
          // Update total quantity as sum of company quantities
          orderItem.quantity = orderItem.companyItems.reduce(
            (sum, c) => sum + c.quantity,
            0,
          );
        }

        // Only add items with positive quantity
        if (orderItem.quantity > 0) {
          groupedOrders[key].orderItems.push(orderItem);
        }
      }
    }

    // Create each grouped order (one order per customer)
    const createdOrders = [];
    for (const key of Object.keys(groupedOrders)) {
      const { customerId, orderItems, pickupDate } = groupedOrders[key];

      if (
        !customerId ||
        !Array.isArray(orderItems) ||
        orderItems.length === 0
      ) {
        return res
          .status(400)
          .json({ msg: "Missing required fields for one of the orders" });
      }

      let newOrder = null;
      let saved = false;

      // Retry on duplicate order number to avoid race collisions.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const orderNumber = await generateOrderNumber();

        newOrder = new Order({
          financialYearId: activeFY._id,
          customerId,
          orderItems,
          orderNumber,
          pickupDate: pickupDate ? new Date(pickupDate) : undefined,
          createdBy: user?.userId,
          approvalStatus: isAdmin ? "approved" : "requested",
          orderStatus: isAdmin ? "pending" : "requested",
        });

        try {
          await newOrder.save();
          saved = true;
          break;
        } catch (saveErr) {
          const isDuplicateOrderNo =
            saveErr?.code === 11000 && saveErr?.keyPattern?.orderNumber;

          if (!isDuplicateOrderNo || attempt === 4) {
            throw saveErr;
          }
        }
      }

      if (!saved || !newOrder) {
        return res.status(500).json({ msg: "Failed to generate order number" });
      }

      createdOrders.push(newOrder);
    }

    return res.status(201).json({
      msg:
        createdOrders.length > 1
          ? `${createdOrders.length} orders created successfully`
          : "Order created successfully",
      orders: createdOrders,
    });
  } catch (error) {
    console.error("createOrder error full:", error);
    return res.status(500).json({ msg: "Server error", detail: error.message, stack: error.stack });
  }
};

// -----------------------------------------------------------------------------
// APPROVE ORDER REQUEST (ADMIN only)
// -----------------------------------------------------------------------------
export const approveOrderRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "No active financial year found." });
    }


    const user = req.user;

    if (!user || user.role !== "admin") {
      await session.abortTransaction();
      return res.status(403).json({ msg: "Only admins may approve requests" });
    }

    const { orderId } = req.params;
    const order = await Order.findOne({
      _id: orderId,
      financialYearId: activeFY._id,
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "Order not found" });
    }

    if (order.approvalStatus === "approved") {
      await session.abortTransaction();
      return res.status(400).json({ msg: "Order already approved" });
    }

    order.approvalStatus = "approved";
    order.approvedBy = user.userId;
    order.approvedAt = new Date();
    order.orderStatus = "pending";

    await order.save({ session });
    await session.commitTransaction();

    return res.status(200).json({ msg: "Order request approved", order });
  } catch (err) {
    await session.abortTransaction();
    console.error("approveOrderRequest error:", err);
    return res.status(500).json({ msg: err.message });
  } finally {
    session.endSession();
  }
};

// -----------------------------------------------------------------------------
// EDIT PICKUP DATE
// -----------------------------------------------------------------------------
export const editPickupDate = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) return res.status(400).json({ msg: "No active financial year found." });

    const user = req.user;
    const { orderId } = req.params;
    const { pickupDate } = req.body;
    if (!pickupDate)
      return res.status(400).json({ msg: "pickupDate required" });

    const order = await Order.findOne({
      _id: orderId,
      financialYearId: activeFY._id,
    });

    if (!order) return res.status(404).json({ msg: "Order not found" });

    // allow admin or the creator to edit
    if (
      user?.role !== "admin" &&
      String(order.createdBy) !== String(user?.userId)
    ) {
      return res.status(403).json({ msg: "Not allowed to edit pickup date" });
    }

    order.pickupDate = new Date(pickupDate);
    await order.save();

    return res.status(200).json({ msg: "Pickup date updated", order });
  } catch (err) {
    console.error("editPickupDate error:", err);
    return res.status(500).json({ msg: err.message });
  }
};

// -----------------------------------------------------------------------------
// CONFIRM ORDER
// -----------------------------------------------------------------------------
export const confirmOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "No active financial year found." });
    }

    const { orderId } = req.params;
    const order = await Order.findOne({
      _id: orderId,
      financialYearId: activeFY._id,
    }).session(session);

    if (!order) return res.status(404).json({ msg: "Order not found" });

    if (order.orderStatus === "cancelled") {
      throw new Error("Cannot confirm a cancelled order");
    }
    if (["confirmed", "fulfilled"].includes(order.orderStatus)) {
      return res
        .status(400)
        .json({ msg: "Order already confirmed or fulfilled" });
    }

    for (const item of order.orderItems) {
      let totalQuantity = item.quantity ?? 0;
      if (item.companyItems?.length) {
        totalQuantity = item.companyItems.reduce(
          (sum, c) => sum + c.quantity,
          0,
        );
      }

      item.price = Number(item.price) || 0;

      const product = await Product.findById(item.productId).lean();
      if (!product) continue;

      if (product.maintainInventory === false) {
        item.status = "Fulfilled";
        continue;
      }

      const inv = await Inventory.findOne({
        financialYearId: activeFY._id,
        productId: item.productId,
        shopId: item.shopId,
        godownId: item.godownId || null,
      }).session(session);

      // Use packs first (order quantity is pack/count oriented here)
      const availableQty = Number(inv?.remainingPacks ?? 0);

      if (!inv || availableQty < Number(totalQuantity || 0)) {
        item.status = "Pending";
      } else {
        inv.remainingPacks = availableQty - Number(totalQuantity || 0);
        inv.lastUpdated = new Date();
        await inv.save({ session });
        item.status = "Fulfilled";
      }

    }

    order.orderStatus = order.orderItems.every((i) => i.status === "Fulfilled")
      ? "fulfilled"
      : "confirmed";

    await order.save({ session });
    await session.commitTransaction();
    console.log(order, "res data");
    return res.status(200).json({ msg: "Order confirmed", order });
  } catch (err) {
    await session.abortTransaction();
    console.error("confirmOrder error:", err);
    return res.status(500).json({ msg: err.message });
  } finally {
    session.endSession();
  }
};

// -----------------------------------------------------------------------------
// CANCEL ORDER
// -----------------------------------------------------------------------------
export const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "No active financial year found." });
    }

    const { orderId } = req.params;
    const order = await Order.findOne({
      _id: orderId,
      financialYearId: activeFY._id,
    }).session(session);

    if (!order) return res.status(404).json({ msg: "Order not found" });

    for (const item of order.orderItems) {
      let totalQuantity = item.quantity ?? 0;
      if (item.companyItems?.length) {
        totalQuantity = item.companyItems.reduce(
          (sum, c) => sum + c.quantity,
          0,
        );
      }

      if (item.status === "Fulfilled") {
        const product = await Product.findById(item.productId).lean();
        if (product && product.maintainInventory === false) continue;

        await Inventory.findOneAndUpdate(
          {
            financialYearId: activeFY._id,
            productId: item.productId,
            shopId: item.shopId,
            godownId: item.godownId || null,
          },
          {
            $inc: { remainingPacks: Number(totalQuantity || 0) },
            $set: { lastUpdated: new Date() },
          },
          { upsert: false, session, runValidators: true },
        );

      }
    }

    order.orderStatus = "cancelled";
    await order.save({ session });
    await session.commitTransaction();

    return res
      .status(200)
      .json({ msg: "Order cancelled and stock restored", order });
  } catch (err) {
    await session.abortTransaction();
    console.error("cancelOrder error:", err);
    return res.status(500).json({ msg: err.message });
  } finally {
    session.endSession();
  }
};

// -----------------------------------------------------------------------------
// GET ORDERS
// -----------------------------------------------------------------------------
export const getOrders = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) return res.status(200).json({ orders: [], total: 0 }); // Or appropriate default response

    let { page = 1, limit = 10, status, shopId } = req.query;
    page = Number(page);
    limit = Number(limit);

    const filter = { financialYearId: activeFY._id };

    if (status) filter.orderStatus = status;
    if (shopId)
      filter["orderItems.shopId"] = new mongoose.Types.ObjectId(shopId);

    const skip = limit > 0 ? (page - 1) * limit : 0;
    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate({
        path: "customerId",
        select: "customerName name email companies",
      })
      .populate({ path: "orderItems.shopId", select: "name" })
      .populate({
        path: "orderItems.productId",
        select:
          "name unit pack sellingPrice gstPercentage profitPercentage purchasePrice productCode",
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit === 0 ? total : limit);

    return res.status(200).json({
      currentPage: page,
      totalPages: limit === 0 ? 1 : Math.ceil(total / limit),
      totalRecords: total,
      orders,
    });
  } catch (err) {
    console.error("getOrders error:", err);
    return res.status(500).json({ msg: err.message });
  }
};

// -----------------------------------------------------------------------------
// GET SINGLE ORDER BY ID
// -----------------------------------------------------------------------------
export const getOrderById = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const order = await Order.findOne({
      _id: req.params.orderId,
      financialYearId: activeFY._id,
    })

      .populate({
        path: "customerId",
        select: "customerName customerType companies",
      })
      .populate({ path: "orderItems.shopId", select: "name address" })
      .populate({
        path: "orderItems.productId",
        select:
          "name unit pack sellingPrice gstPercentage profitPercentage purchasePrice productCode sellingpriceforB2C sellingPriceforB2B",
      });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("getOrderById error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    });
  }
};

export const getPendingOrderItems = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const { shopId } = req.query;
    const match = {
      financialYearId: activeFY._id,
      "orderItems.status": "Pending",
    };

    if (shopId)
      match["orderItems.shopId"] = new mongoose.Types.ObjectId(shopId);

    const pendingOrders = await Order.aggregate([
      { $match: match },
      {
        $project: {
          orderNumber: 1,
          customerId: 1,
          orderItems: {
            $map: {
              input: "$orderItems",
              as: "item",
              in: {
                shopId: "$$item.shopId",
                productId: "$$item.productId",
                status: "$$item.status",
                quantity: "$$item.quantity",
                companyItems: {
                  $filter: {
                    input: "$$item.companyItems",
                    as: "c",
                    cond: { $gt: ["$$c.quantity", 0] },
                  },
                },
              },
            },
          },
          orderStatus: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({ total: pendingOrders.length, pendingOrders });
  } catch (err) {
    console.error("getPendingOrderItems error:", err);
    return res.status(500).json({ msg: err.message });
  }
};

export const attemptFulfillPending = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeFY = await getActiveFinancialYear();

    const { shopId, productId } = req.body;
    if (!shopId || !productId) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "shopId and productId are required" });
    }

    const pendingOrders = await Order.find({
      financialYearId: activeFY._id,
      "orderItems.productId": productId,
      "orderItems.status": "Pending",
      "orderItems.shopId": shopId,
    }).session(session);


    for (const order of pendingOrders) {
      let changed = false;

      for (const item of order.orderItems) {
        if (
          String(item.productId) !== String(productId) ||
          String(item.shopId) !== String(shopId) ||
          item.status !== "Pending"
        ) continue;

        // Total quantity including company items
        let totalQuantity = item.quantity ?? 0;
        if (item.companyItems?.length) {
          totalQuantity = item.companyItems.reduce((sum, c) => sum + c.quantity, 0);
        }

        const product = await Product.findById(productId).lean();
        if (product && product.maintainInventory === false) {
          item.status = "Fulfilled";
          changed = true;
          continue;
        }

        const inv = await Inventory.findOne({
          financialYearId: activeFY._id,
          productId,
          shopId,
          godownId: item.godownId || null,
        }).session(session);

        if (!inv) continue;

        const availableQty = Number(inv.remainingPacks ?? 0);
        if (availableQty < Number(totalQuantity || 0)) continue;

        inv.remainingPacks = availableQty - Number(totalQuantity || 0);
        inv.lastUpdated = new Date();
        await inv.save({ session });

        item.status = "Fulfilled";
        changed = true;
      }


      if (changed) {
        order.orderStatus = order.orderItems.every(
          (i) => i.status === "Fulfilled",
        )
          ? "fulfilled"
          : "confirmed";
        await order.save({ session });
      }
    }

    await session.commitTransaction();
    return res.status(200).json({ msg: "Pending items fulfillment attempted" });
  } catch (err) {
    await session.abortTransaction();
    console.error("attemptFulfillPending error:", err);
    return res.status(500).json({ msg: err.message });
  } finally {
    session.endSession();
  }
};
