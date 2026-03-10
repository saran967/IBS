import mongoose from "mongoose";
import Inventory from "../models/inventoryModel.js";
import StockTransfer from "../models/stockTransfer.js";
import Product from "../models/productModel.js";
import Shop from "../models/shopModel.js";
import Godown from "../models/godownModel.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";


export const getTransfers = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    let {
      page = 1,
      limit = 10,
      fromLocationId = "",
      toLocationId = "",
      productName = "",
      startDate = "",
      endDate = "",
    } = req.query;

    console.log(req.query);

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    // ================================
    // BUILD FILTER
    // ================================
    let filter = { financialYearId: activeFY._id };


    // FROM location (shop or godown)
    if (fromLocationId) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ fromShopId: fromLocationId }, { fromGodownId: fromLocationId }],
      });
    }

    // TO location (shop or godown)
    if (toLocationId) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ toShopId: toLocationId }, { toGodownId: toLocationId }],
      });
      console.log(toLocationId);
    }

    // Product filter
    // Product filter (FIXED)
    if (productName) {
  const matchedProducts = await Product.find(
    { "name.en": { $regex: productName, $options: "i" } },
    "_id",
  );
  const ids = matchedProducts.map((p) => p._id);
  filter.$and = filter.$and || [];
  filter.$and.push({ productId: { $in: ids } });
}


    // Date filter
    if (startDate || endDate) {
      const transferDate = {};
      if (startDate) transferDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        transferDate.$lte = end;
      }

      filter.$and = filter.$and || [];
      filter.$and.push({ transferDate });
    }

    // If no AND filters added → remove it
    if (filter.$and?.length === 0) delete filter.$and;

    // ================================
    // QUERY DB
    // ================================
    const transfers = await StockTransfer.find(filter)
    
      .populate("productId", "name")
      .populate("fromShopId", "name")
      .populate("toShopId", "name")
      .populate("fromGodownId", "name shopId")
      .populate("toGodownId", "name")
      .populate("transferredBy.userId", "name role")
      .sort({ transferDate: -1 })
      .skip(skip)
      .limit(limit);

    const totalRecords = await StockTransfer.countDocuments(filter);

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
      transfers,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ===============================================================
//  TRANSFER STOCK (Admin) — OR REQUEST (Subadmin/Employee)
// ===============================================================
const identifyLocation = async (id) => {
  if (!id) return { type: null, id: null };

  const shop = await Shop.findById(id);
  if (shop) return { type: "shop", id };

  const godown = await Godown.findById(id);
  if (godown) return { type: "godown", id };

  throw new Error(`Invalid location ID: ${id}`);
};

export const transferStock = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const { fromLocationId, toLocationId, products } = req.body;
    const user = req.admin; // Logged-in user

    if (!products?.length)
      return res.status(400).json({ msg: "Products required" });

    if (!fromLocationId || !toLocationId)
      return res.status(400).json({ msg: "Source and destination required" });

    if (fromLocationId === toLocationId)
      return res.status(400).json({ msg: "Cannot transfer to same location" });

    // Identify whether source/destination is shop or godown
    const from = await identifyLocation(fromLocationId);
    const to = await identifyLocation(toLocationId);

    // =============== NON-ADMIN USERS ===============
    // Only send transfer request → Admin approves later
    if (user.role !== "admin") {
      for (const p of products) {
        await StockTransfer.create({
          financialYearId: activeFY._id,
          productId: p.productId,
          quantity: p.quantity,

          fromShopId: from.type === "shop" ? from.id : null,
          fromGodownId: from.type === "godown" ? from.id : null,

          toShopId: to.type === "shop" ? to.id : null,
          toGodownId: to.type === "godown" ? to.id : null,

          status: "pending",
          transferDate: new Date(),

          //  STORE TRANSFERRED BY (FULL OBJECT)
          transferredBy: {
            userId: user.userId, // or user._id depending on your model
            name: user.name ?? "Unknown User",
            role: user.role,
          },
        });
      }

      return res
        .status(200)
        .json({ msg: "Transfer request sent to admin for approval" });
    }

    // =============== ADMIN EXECUTES THE TRANSFER ===============
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

      for (const { productId, quantity } of products) {
        const product = await Product.findById(productId);
        if (!product) throw new Error("Product not found");

        // -------- SOURCE INVENTORY --------
        const sourceQuery =
          from.type === "shop"
  ? { financialYearId: activeFY._id, productId, shopId: from.id, godownId: null }
  : { financialYearId: activeFY._id, productId, godownId: from.id, shopId: null };


        const sourceInv = await Inventory.findOne(sourceQuery).session(session);

        if (!sourceInv) throw new Error("No source stock found for product.");

        if ((sourceInv.remainingPacks ?? 0) < quantity)
          throw new Error(
            `Insufficient stock. Available: ${sourceInv.remainingPacks}`,
          );

        const unitWeight = sourceInv.unitWeight || product.unitWeight || 0;

        // Deduct stock
        sourceInv.remainingPacks -= quantity;
        sourceInv.remainingWeight -= quantity * unitWeight;
        sourceInv.lastUpdated = new Date();
        await sourceInv.save({ session });

        // -------- DESTINATION INVENTORY --------
        const destQuery =
          to.type === "shop"
            ? {
                financialYearId: activeFY._id,
                productId,
                shopId: to.id,
                godownId: null,
              }
            : {
                financialYearId: activeFY._id,
                productId,
                godownId: to.id,
                shopId: null,
              };

        await Inventory.findOneAndUpdate(
          destQuery,
          {
            $setOnInsert: {
              productId,
              productName: product.name,
              productCode: product.productCode,
              category: product.category,
              unit: product.unit,
              vendorId: sourceInv.vendorId,
              unitWeight,
              createdAt: new Date(),
            },

            $inc: {
              remainingPacks: quantity,
              remainingWeight: quantity * unitWeight,
              totalPacks: quantity,
              totalWeight: quantity * unitWeight,
            },
            $set: { lastUpdated: new Date() },
          },
          { upsert: true, new: true, session },
        );

        // -------- SAVE APPROVED TRANSFER LOG --------
        await StockTransfer.create(
          [
            {
              financialYearId: activeFY._id,

              productId,
              quantity,

              fromShopId: from.type === "shop" ? from.id : null,
              fromGodownId: from.type === "godown" ? from.id : null,

              toShopId: to.type === "shop" ? to.id : null,
              toGodownId: to.type === "godown" ? to.id : null,

              status: "approved",
              transferDate: new Date(),

              //  WHO REQUESTED THE TRANSFER
              transferredBy: {
                userId: user.userId, // or user._id depending on your model
                name: user.name ?? "Unknown User",
                role: user.role,
              },

              //  WHO APPROVED THE TRANSFER (ADMIN)
              approvedBy: {
                userId: user.userId,

                name: user.name || "Unknown User",
                role: user.role,
              },

              approvedAt: new Date(),
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ msg: "Stock transferred successfully" });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    return res.status(400).json({ msg: err.message });
  }
};

// ===============================================================
// ADMIN APPROVES SUBADMIN/EMPLOYEE PENDING REQUEST
// ===============================================================
export const approveTransfer = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const { id } = req.params;
    // console.log(id, 'id is not find');
    const admin = req.admin; // logged-in admin

    const request = await StockTransfer.findOne({
  _id: id,
  financialYearId: activeFY._id,
});

    // console.log(request, 'Request data is find');

    if (!request)
      return res.status(404).json({ msg: "Transfer request not found" });

    if (request.status !== "pending")
      return res.status(400).json({ msg: "Request already processed" });

    // ----- Perform the actual stock movement -----
    await performActualTransfer(request);

    // ----- Update approval info -----
    request.status = "approved";
    request.approvedAt = new Date();
    request.approvedBy = {
      userId: admin.userId,
      name: admin.name,
      role: admin.role,
    };

    await request.save();

    res.status(200).json({ msg: "Transfer approved successfully" });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};

// CANCEL transfer request
// =======================
// CANCEL TRANSFER REQUEST
// =======================
export const cancelTransfer = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const { id } = req.params;
    const user = req.admin;

    const request = await StockTransfer.findOne({
  _id: id,
  financialYearId: activeFY._id,
});

    if (!request) return res.status(404).json({ msg: "Request not found" });

    if (request.status !== "pending")
      return res
        .status(400)
        .json({ msg: "Only pending requests can be cancelled" });

    request.status = "cancelled";
    request.cancelledAt = new Date();
    request.cancelledBy = {
      userId: user.userId,

      name: user.name,
      role: user.role,
    };

    await request.save();

    res.status(200).json({ msg: "Transfer request cancelled" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

async function performActualTransfer(request) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeFY = await getActiveFinancialYear();

    const {
      productId,
      quantity,
      fromShopId,
      toShopId,
      fromGodownId,
      toGodownId,
    } = request;

    console.log(request, "Request data");

    console.log(productId, "ProductData");

    // ----- Determine source -----
    const sourceQuery = fromShopId
      ? {
          financialYearId: activeFY._id,
          productId,
          shopId: fromShopId,
          godownId: null,
        }
      : {
          financialYearId: activeFY._id,
          productId,
          godownId: fromGodownId,
          shopId: null,
        };

    const sourceInv = await Inventory.findOne(sourceQuery).session(session);
    if (!sourceInv) throw new Error("Source inventory missing");

    if (sourceInv.remainingPacks < quantity)
      throw new Error("Insufficient stock in source");

    const unitWeight = sourceInv.unitWeight || 0;

    const product = await Product.findById(productId);

    // Deduct
    sourceInv.remainingPacks -= quantity;
    sourceInv.remainingWeight -= quantity * unitWeight;
    sourceInv.lastUpdated = new Date();
    await sourceInv.save({ session });

    // ----- Destination -----
    const destQuery = toShopId
      ? {
          financialYearId: activeFY._id,
          productId,
          shopId: toShopId,
          godownId: null,
        }
      : {
          financialYearId: activeFY._id,
          productId,
          godownId: toGodownId,
          shopId: null,
        };

    await Inventory.findOneAndUpdate(
      destQuery,
      {
        $setOnInsert: {
          productId,
          productName: product.name,
          productCode: product.productCode,
          category: product.category,
          unit: product.unit,
          vendorId: sourceInv.vendorId,
          unitWeight,
          createdAt: new Date(),
        },

        $inc: {
          remainingPacks: quantity,
          remainingWeight: quantity * unitWeight,
          totalPacks: quantity,
          totalWeight: quantity * unitWeight,
        },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true, new: true, session },
    );

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

export const getPendingTransfers = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const requests = await StockTransfer.find({ financialYearId: activeFY._id, status: "pending" })

      .populate("productId", "name")
      .populate("fromShopId", "name")
      .populate("toShopId", "name")
      .populate("fromGodownId", "name")
      .populate("toGodownId", "name")
      .populate("transferredBy.userId", "name role");

    res.status(200).json({ requests });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};


