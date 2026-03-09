import orderdetails from "../../models/order/OrderModel.js";
import Cart from "../../models/cart/CartModel.js";

async function generateOrderNumber() {
  const lastOrder = await orderdetails
    .findOne()
    .sort({ createdAt: -1 })
    .select("orderNumber");

  if (!lastOrder || !lastOrder.orderNumber) return "ORD0001";

  const numeric =
    parseInt(String(lastOrder.orderNumber).replace(/\D/g, ""), 10) || 0;

  return "ORD" + String(numeric + 1).padStart(4, "0");
}

export const createOrder = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { items, totalAmount, status } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided" });
    }

    const orderItems = items.map((item) => ({
      product: item.productId,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      companyItems:
        item.companyItems?.map((c) => ({
          companyId: c.companyId,
          companyName: c.companyName,
          quantity:
            c.quantity !== undefined && c.quantity !== null
              ? Number(c.quantity)
              : 0,
        })) || [],
    }));

    const orderNumber = await generateOrderNumber();

    const newOrder = await orderdetails.create({
      orderNumber,
      customer: customerId,
      items: orderItems,
      totalAmount: Number(totalAmount) || 0,
      status: status || "Pending",
    });

    // 🧹 Clear cart after order
    const cart = await Cart.findOne({ customer: customerId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const customerId = req.user.userId;

    const orders = await orderdetails
      .find({ customer: customerId })
      .populate("items.product", "name price images")
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: { _id: order.customer },
      items: order.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        companyItems: item.companyItems || [],
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    res.status(200).json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    //  Pagination params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    //  Total count
    const totalOrders = await orderdetails.countDocuments();

    //  Fetch paginated orders
    const orders = await orderdetails
      .find()
      .populate("items.product", "name price images")
      .populate("customer", "customerName customerType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer
        ? {
            _id: order.customer._id,
            customerName: order.customer.customerName,
            customerType: order.customer.customerType,
          }
        : null,
      items: order.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        companyItems: item.companyItems || [],
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    res.status(200).json({
      success: true,
      orders: formattedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatus = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Completed",
    ];

    if (!validStatus.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order status" });
    }

    const order = await orderdetails
      .findById(orderId)
      .populate("items.product", "name sellingPriceforB2B sellingPriceforB2C")
      .populate("customer", "customerName");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ❗ Only Pending → Completed
    if (status === "Completed" && order.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be completed",
      });
    }

    order.status = status;
    await order.save();

    const orderForFrontend = {
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer
        ? {
            _id: order.customer._id || order.customer,
            customerName: order.customer.customerName || "Unknown",
          }
        : null,
      items: order.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        companyItems: item.companyItems || [],
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    res.status(200).json({ success: true, order: orderForFrontend });
  } catch (error) {
    console.error("Update order status error:", error.message);
    console.error(error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
