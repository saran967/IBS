// backend/controller/inventoryController.js
import Inventory from "../models/inventoryModel.js";
import Product from "../models/productModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../Error/customError.js";
import mongoose from "mongoose";

import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";

export const getAllInventory = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: "Please activate a financial year",
      });
    }

    const { page = 1, limit = 10, shopId, vendorId, productId, isFree } = req.query;

    // 🔥 ALWAYS FILTER BY FINANCIAL YEAR
    const query = {
      financialYearId: activeFY._id,
    };

    if (isFree === "true") {
      query.isFree = true;
    } else if (isFree === "false") {
      query.$or = [{ isFree: false }, { isFree: { $exists: false } }];
    }
    // If "ALL" or undefined, we don't add isFree to the query, so it returns everything.

    if (shopId && mongoose.Types.ObjectId.isValid(shopId))
      query.shopId = new mongoose.Types.ObjectId(shopId);

    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId))
      query.vendorId = new mongoose.Types.ObjectId(vendorId);

    if (productId && mongoose.Types.ObjectId.isValid(productId))
      query.productId = new mongoose.Types.ObjectId(productId);

    const skip = (page - 1) * limit;

    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate(
          "productId",
          "name category unit baseUnitType purchaseMode productCode",
        )
        .populate("shopId", "name")
        .populate("vendorId", "name")
        .populate({
          path: "godownId",
          select: "name shopId",
          populate: {
            path: "shopId",
            select: "name",
          },
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),

      Inventory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: inventory,
    });
  } catch (error) {
    console.error("Get Inventory Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching inventory",
    });
  }
};

export const getInventoryByProduct = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(200).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new BadRequestError("Invalid Product ID");
    }

    const product = await Product.findById(productId).select(
      "name category unit baseUnitType purchaseMode productCode",
    );

    if (!product) throw new NotFoundError("Product not found");

    // 🔥 IMPORTANT: FY FILTER
    const inventory = await Inventory.find({
      productId: new mongoose.Types.ObjectId(productId),
      financialYearId: activeFY._id,
    })
      .populate("shopId", "name")
      .populate("vendorId", "name");

    const totalWeight = inventory.reduce(
      (sum, i) => sum + (i.totalWeight || 0),
      0,
    );

    const remainingWeight = inventory.reduce(
      (sum, i) => sum + (i.remainingWeight || 0),
      0,
    );

    res.status(StatusCodes.OK).json({
      success: true,
      product,
      totalWeight,
      remainingWeight,
      records: inventory,
    });
  } catch (error) {
    console.error("Get Inventory By Product Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message,
    });
  }
};
export const adjustInventory = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(200).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { productId, shopId, packsChange, weightChange, meta } = req.body;

    if (!productId)
      throw new BadRequestError("productId required");

    if (!mongoose.Types.ObjectId.isValid(productId))
      throw new BadRequestError("Invalid productId");

    if (shopId && !mongoose.Types.ObjectId.isValid(shopId))
      throw new BadRequestError("Invalid shopId");

    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError("Product not found");

    if (!shopId && !godownId) {
      throw new BadRequestError("shopId or godownId required");
    }

    if (shopId && !mongoose.Types.ObjectId.isValid(shopId))
      throw new BadRequestError("Invalid shopId");

    if (godownId && !mongoose.Types.ObjectId.isValid(godownId))
      throw new BadRequestError("Invalid godownId");

    const query = {
      productId: new mongoose.Types.ObjectId(productId),
      financialYearId: activeFY._id,
      shopId: shopId ? new mongoose.Types.ObjectId(shopId) : null,
      godownId: godownId ? new mongoose.Types.ObjectId(godownId) : null,
    };

    const inventory = await Inventory.findOneAndUpdate(
      query,
      {
        $inc: {
          remainingPacks: Number(packsChange || 0),
          remainingWeight: Number(weightChange || 0),
        },
        $set: {
          lastUpdated: new Date(),
          meta,
          financialYearId: activeFY._id, // 🔥 ensure upsert saves FY
        },
      },
      { upsert: true, new: true, runValidators: true },

    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory updated",
      data: inventory,
    });
  } catch (error) {
    console.error("Adjust Inventory Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message,
    });
  }
};

export const getProductStockSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(200).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId))
      throw new BadRequestError("Invalid Product ID");

    const product = await Product.findById(productId).select(
      "name category unit pack",
    );

    if (!product) throw new NotFoundError("Product not found");

    const stockData = await Inventory.aggregate([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
          financialYearId: activeFY._id,   // 🔥 IMPORTANT
        },
      },
      {
        $group: {
          _id: "$shopId",
          totalPacks: { $sum: "$remainingPacks" },
          totalWeight: { $sum: "$remainingWeight" },
        },
      },
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      product,
      stockData,
    });
  } catch (error) {
    console.error("Product Stock Summary Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message,
    });
  }
};


export const getProductStock = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(200).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { shopId, productId } = req.params;

    if (!shopId || !productId)
      throw new BadRequestError("Missing shopId or productId");

    if (!mongoose.Types.ObjectId.isValid(shopId))
      throw new BadRequestError("Invalid shopId");

    if (!mongoose.Types.ObjectId.isValid(productId))
      throw new BadRequestError("Invalid productId");

    const inventory = await Inventory.findOne({
      shopId: new mongoose.Types.ObjectId(shopId),
      productId: new mongoose.Types.ObjectId(productId),
      financialYearId: activeFY._id,   // 🔥 IMPORTANT
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: inventory || {
        productId,
        shopId,
        remainingPacks: 0,
        remainingWeight: 0,
      },
    });
  } catch (error) {
    console.error("Get Product Stock Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message,
    });
  }
};


export const syncInventoryFromPurchase = async (purchaseDoc, userId) => {
  try {
    if (!purchaseDoc.financialYearId) {
      throw new Error("Purchase document missing financialYearId");
    }

    const product = await Product.findById(purchaseDoc.productId).select(
      "baseUnitType purchaseMode unit category name productCode maintainInventory",
    );

    if (product && product.maintainInventory === false) {
      console.log(`Skipping inventory sync for product ${purchaseDoc.productId} (maintainInventory=false)`);
      return;
    }

    const purchaseMode =
      purchaseDoc.purchaseMode || purchaseDoc.purchaseType || "SKU";

    const baseUnitType =
      product?.baseUnitType || purchaseDoc.baseUnitType || "G";

    const upsertInventory = async ({ split, type }) => {
      const isShop = type === "shop";

      const query = {
        financialYearId: purchaseDoc.financialYearId,
        productId: purchaseDoc.productId,
        shopId: isShop ? split.shop : null,
        godownId: isShop ? null : split.godown,
        purchaseId: purchaseDoc._id,
      };

      const incData = {
        totalPacks: purchaseMode === "SKU" ? Number(split.packs || 0) : 0,
        remainingPacks: purchaseMode === "SKU" ? Number(split.packs || 0) : 0,
        totalWeight: Number(split.baseQty || 0),
        remainingWeight: Number(split.baseQty || 0),
      };

      await Inventory.findOneAndUpdate(
        query,
        {
          $setOnInsert: {
            financialYearId: purchaseDoc.financialYearId,
            productId: purchaseDoc.productId,
            shopId: isShop ? split.shop : null,
            godownId: isShop ? null : split.godown,
            vendorId: purchaseDoc.vendorId,
            purchaseId: purchaseDoc._id,
            productName: purchaseDoc.productName || product?.name,
            productCode: purchaseDoc.productCode || product?.productCode,
            category: purchaseDoc.category || product?.category,
            unit: purchaseDoc.unit || product?.unit,
            purchaseType: purchaseMode,
            baseUnitType,
            batchNo: purchaseDoc.batchNo || "",
            createdBy: userId,
          },
          $set: {
            lastUpdated: new Date(),
            vendorId: purchaseDoc.vendorId,
            purchaseId: purchaseDoc._id,
          },
          $inc: incData,
        },
        { upsert: true, new: true, runValidators: true },
      );
    };

    for (const split of purchaseDoc.shopSplits || []) {
      await upsertInventory({ split, type: "shop" });
    }

    for (const split of purchaseDoc.godownSplits || []) {
      await upsertInventory({ split, type: "godown" });
    }
  } catch (error) {
    console.error("Inventory sync error:", error.message);
    throw error; // IMPORTANT: do not swallow
  }
};



export const deleteInventory = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestError("Invalid inventory ID");
    }

    const deleted = await Inventory.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      financialYearId: activeFY._id,   // 🔥 IMPORTANT
    });

    if (!deleted) {
      throw new NotFoundError(
        "Inventory record not found for current financial year",
      );
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Inventory record deleted",
    });
  } catch (error) {
    console.error("Delete Inventory Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message || "Error deleting inventory",
    });
  }
};

export const getAvailableStockForSales = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { productId, shopId, godownId } = req.query;

    console.log("DEBUG: getAvailableStockForSales", { productId, shopId, godownId });

    if (!productId || (!shopId && !godownId)) {
      throw new BadRequestError("Missing productId or location (shopId/godownId)");
    }

    const matchQuery = {
      financialYearId: activeFY._id,   // 🔥 IMPORTANT
    };

    try {
      matchQuery.productId = new mongoose.Types.ObjectId(productId);
    } catch (e) {
      console.error("Invalid Product ID format in stock lookup:", productId);
      throw new BadRequestError(`Invalid Product ID format: ${productId}`);
    }

    // Godown Priority
    if (godownId) {
      try {
        matchQuery.godownId = new mongoose.Types.ObjectId(godownId);
      } catch (e) {
        throw new BadRequestError(`Invalid godownId format: ${godownId}`);
      }
    } else {
      try {
        matchQuery.shopId = new mongoose.Types.ObjectId(shopId);
        matchQuery.$or = [
          { godownId: { $exists: false } },
          { godownId: null },
        ];
      } catch (e) {
        throw new BadRequestError(`Invalid shopId format: ${shopId}`);
      }
    }

    const stock = await Inventory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          remainingPacks: { $sum: { $toDouble: "$remainingPacks" } },
          remainingWeight: { $sum: { $toDouble: "$remainingWeight" } },
        },
      },
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      availablePacks: stock[0]?.remainingPacks || 0,
      availableWeight: stock[0]?.remainingWeight || 0,
    });
  } catch (error) {
    console.error("Available Stock Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message,
    });
  }
};

export const getBatchesForProduct = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) {
      throw new BadRequestError("No active financial year found");
    }

    const { productId, shopId, godownId } = req.query;

    console.log("DEBUG: getBatchesForProduct", { productId, shopId, godownId });

    if (!productId) {
      throw new BadRequestError("productId required");
    }

    const query = {
      financialYearId: activeFY._id,
      remainingWeight: { $gt: 0 },
    };

    try {
      query.productId = new mongoose.Types.ObjectId(productId);
    } catch (e) {
      console.error("Invalid Product ID format:", productId);
      throw new BadRequestError(`Invalid Product ID format: ${productId}`);
    }

    if (godownId) {
      try {
        query.godownId = new mongoose.Types.ObjectId(godownId);
      } catch (e) {
        throw new BadRequestError(`Invalid godownId format: ${godownId}`);
      }
    } else if (shopId) {
      try {
        query.shopId = new mongoose.Types.ObjectId(shopId);
      } catch (e) {
        throw new BadRequestError(`Invalid shopId format: ${shopId}`);
      }
    }

    const batches = await Inventory.find(query)
      .select("batchNo purchaseId remainingPacks remainingWeight updatedAt")
      .sort({ updatedAt: -1 });

    res.status(StatusCodes.OK).json({ success: true, batches });
  } catch (error) {
    console.error("Get Batches Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getLowStockReport = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: true,
        message: "No active financial year found",
      });
    }

    const { shopId, godownId } = req.query;

    const match = { financialYearId: activeFY._id };
    if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
      match.shopId = new mongoose.Types.ObjectId(shopId);
    }
    if (godownId && mongoose.Types.ObjectId.isValid(godownId)) {
      match.godownId = new mongoose.Types.ObjectId(godownId);
    }

    const lowStockItems = await Inventory.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$productId",
          totalPacks: { $sum: "$remainingPacks" },
          totalWeight: { $sum: "$remainingWeight" },
          baseUnitType: { $first: "$baseUnitType" },
          purchaseType: { $first: "$purchaseType" }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDoc"
        }
      },
      { $unwind: "$productDoc" },
      {
        $project: {
          productId: "$_id",
          productName: "$productDoc.name",
          productCode: "$productDoc.productCode",
          category: "$productDoc.category",
          minStockLevel: "$productDoc.minStockLevel",
          baseUnitType: 1,
          purchaseType: 1,
          totalPacks: 1,
          totalWeight: 1,
          // Evaluate if it's below minimum stock level (handles falsy/0 min stock by checking against literal value. If minStockLevel is 0, nothing is considered low stock unless we have < 0)
          isLowStock: {
            $cond: {
              if: { $eq: ["$purchaseType", "SKU"] },
              then: {
                $and: [
                  { $gt: ["$productDoc.minStockLevel", 0] },
                  { $lt: ["$totalPacks", "$productDoc.minStockLevel"] }
                ]
              },
              else: {
                $and: [
                  { $gt: ["$productDoc.minStockLevel", 0] },
                  {
                    $lt: [
                      { $divide: ["$totalWeight", { $cond: { if: { $in: ["$baseUnitType", ["G", "ML"]] }, then: 1000, else: 1 } }] },
                      "$productDoc.minStockLevel"
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      { $match: { isLowStock: true } },
      { $sort: { totalPacks: 1, totalWeight: 1 } }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      data: lowStockItems
    });

  } catch (error) {
    console.error("Low Stock Report Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: true,
      message: error.message,
    });
  }
};

export const addFreeStock = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) throw new BadRequestError("No active financial year found");

    const {
      productId,
      quantity,
      type,
      locationId,
      locationType,
      linkedProductId,
    } = req.body;

    if (!productId || !quantity || !locationId || !locationType) {
      throw new BadRequestError("Missing required fields");
    }

    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError("Product not found");

    const qtyNum = Number(quantity);
    let addedBaseQty = qtyNum;
    if (product.baseUnitType === "G" || product.baseUnitType === "ML") {
       addedBaseQty = qtyNum * 1000; // UI enters KG/LTR
    }

    const query = {
      financialYearId: activeFY._id,
      productId: productId,
      isFree: true,
      [locationType === "shop" ? "shopId" : "godownId"]: locationId,
    };

    let inv = await Inventory.findOne(query);
    if (!inv) {
      inv = new Inventory({
        ...query,
        productCode: product.productCode,
        baseUnitType: product.baseUnitType,
        purchaseType: "LOOSE", // Keep free items as LOOSE for simple deduction
      });
    }

    inv.totalWeight = (inv.totalWeight || 0) + addedBaseQty;
    inv.remainingWeight = (inv.remainingWeight || 0) + addedBaseQty;
    
    if (product.baseUnitType === "PCS") {
        inv.totalPacks = (inv.totalPacks || 0) + qtyNum;
        inv.remainingPacks = (inv.remainingPacks || 0) + qtyNum;
    }

    await inv.save();

    // Link to Main Product if provided
    if (linkedProductId && mongoose.Types.ObjectId.isValid(linkedProductId)) {
      await Product.findByIdAndUpdate(linkedProductId, {
        $addToSet: { freeItems: { productId: product._id, quantity: 1 } },
      });
    }

    // Update product global stock counter (always in base weight)
    product.totalStock = (product.totalStock || 0) + addedBaseQty;
    await product.save();

    res.status(StatusCodes.OK).json({ 
      success: true, 
      message: "Free stock added successfully" 
    });

  } catch (error) {
    console.error("Add Free Stock Error:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
