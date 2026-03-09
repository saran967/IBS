import mongoose from "mongoose";
import Inventory from "../models/inventoryModel.js";
import Product from "../models/productModel.js";
import ProductPack from "../models/productPackModel.js";
import SKU from "../models/retail/RetailProductSkumodel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../Error/customError.js";
import { localize } from "../utils/localizationHelper.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";

export const classifyStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const createdBy = req.user.userId;

  try {
    const activeFY = await getActiveFinancialYear();
    const {
      productId,
      packSize,
      packCount,
      unit,
      gst = 16,
      profitPercentage = 16,
      shopId,
      pricePerPack, //  optional user input
      inventoryId, // Optional specific batch selection
      batchNo,
      packedDate,
      useByDate,
    } = req.body;

    //  Validate required fields
    if (!productId || !packSize || !packCount || !unit || !shopId) {
      throw new BadRequestError("All fields are required");
    }

    // 3️⃣ Manage Inventory Deduction (FIFO or Specific Batch)
    let totalToDeduct = packSize * packCount;

    let inventoryRecords = [];

    if (inventoryId) {
      // Deduct from a specific batch
      const record = await Inventory.findOne({
        _id: inventoryId,
        financialYearId: activeFY._id,
      }).session(session);
      if (!record) throw new NotFoundError("Selected inventory batch not found");
      inventoryRecords = [record];
    } else {
      // FIFO: Get all available batches for this product at this location
      inventoryRecords = await Inventory.find({
        financialYearId: activeFY._id,
        productId,
        shopId,
        godownId: null,
        remainingWeight: { $gt: 0 }
      })
        .sort({ createdAt: 1 }) // FIFO
        .session(session);
    }

    if (!inventoryRecords.length) {
      throw new BadRequestError("No stock available for this product at the selected location");
    }

    // Calculate total available across selected/all batches
    const totalAvailable = inventoryRecords.reduce((sum, r) => sum + (r.remainingWeight || 0), 0);
    if (totalAvailable < totalToDeduct) {
      throw new BadRequestError(`Insufficient stock. Available: ${totalAvailable}, Required: ${totalToDeduct}`);
    }

    // Fetch product info for logging/updates
    const product = await Product.findById(productId);
    if (!product) throw new NotFoundError("Product not found");

    // Process deduction
    let remainingToDeduct = totalToDeduct;
    for (const record of inventoryRecords) {
      if (remainingToDeduct <= 0) break;

      const deductFromThis = Math.min(record.remainingWeight, remainingToDeduct);
      record.remainingWeight -= deductFromThis;
      remainingToDeduct -= deductFromThis;

      record.lastUpdated = new Date();
      await record.save({ session });
    }

    // 6️⃣ Determine price per pack
    const finalPricePerPack =
      typeof pricePerPack === "number" && pricePerPack > 0
        ? pricePerPack
        : Number(product.sellingPrice || 0);

    // 7️⃣ Create ProductPack record
    const productPack = await ProductPack.create(
      [
        {
          financialYearId: activeFY._id,
          productId,
          shopId,
          packSize,
          packCount,
          totalWeight: totalToDeduct,
          unit,
          gst,
          profitPercentage,
          pricePerPack: finalPricePerPack,
          batchNo: batchNo || `B-${Date.now()}`,
          packedDate: packedDate || new Date(),
          useByDate: useByDate || null,
          createdBy,
        },
      ],
      { session },
    );

    // 8️⃣ Update/Create SKU Inventory for the packs
    const inv = await Inventory.findOneAndUpdate(
      {
        financialYearId: activeFY._id,
        productId,
        shopId,
        purchaseType: "SKU",
        unitWeight: packSize,
        sellUnit: typeof unit === "object" ? (unit.en || "") : (unit || ""),
      },
      {
        $inc: {
          totalPacks: packCount,
          remainingPacks: packCount,
          totalWeight: totalToDeduct,
          remainingWeight: totalToDeduct,
        },
        $set: {
          productName: product.name,
          productCode: product.productCode,
          category: product.category,
          unit: product.unit,
          lastUpdated: new Date(),
          createdBy,
        },
      },
      { upsert: true, session, new: true }
    );

    // 8.5️⃣ Upsert SKU record for the packs to be sellable
    await SKU.findOneAndUpdate(
      {
        productId,
        baseQty: packSize,
        sellUnit: typeof unit === "object" ? (unit.en || "") : (unit || ""),
      },
      {
        $set: {
          retailPrice: finalPricePerPack,
          sellQty: 1,
          baseQty: packSize,
          sellUnit: typeof unit === "object" ? (unit.en || "") : (unit || ""),
          allowRetail: true,
          allowWholesale: true,
          displayName: `${packSize} ${typeof unit === "object" ? (unit.en || "") : (unit || "")}`,
        },
      },
      { upsert: true, session }
    );

    // 9️⃣ Sync total stock in Product model
    const totalCurrentStockAgg = await Inventory.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, total: { $sum: "$remainingWeight" } } }
    ]).session(session);

    await Product.findByIdAndUpdate(productId, {
      totalStock: totalCurrentStockAgg[0]?.total || 0
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Stock classified successfully",
      data: localize(productPack[0].toObject(), req.query.lang || "en"),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Classification Error:", error);

    res.status(error.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Something went wrong",
      details: error.cause || error.errors,
    });
  }
};

export const getAllProductPacks = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const lang = req.query.lang || "en";

    const packs = await ProductPack.find({ financialYearId: activeFY._id })
      .populate("productId", "name category unit")
      .populate("shopId", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const localizedPacks = packs.map((pack) => {
      const localizedProduct = pack.productId
        ? {
          _id: pack.productId._id.toString(),
          name: localize(pack.productId.name, lang),
          category: localize(pack.productId.category, lang),
          unit: localize(pack.productId.unit, lang),
        }
        : null;

      return {
        _id: pack._id.toString(),
        productId: localizedProduct,
        shopId: pack.shopId
          ? {
            _id: pack.shopId._id.toString(),
            name: localize(pack.shopId.name, lang),
          }
          : null,
        packSize: pack.packSize,
        packCount: pack.packCount,
        totalWeight: pack.totalWeight,
        unit: localize(pack.unit, lang) || "",
        gst: pack.gst,
        profitPercentage: pack.profitPercentage,
        pricePerPack: pack.pricePerPack,
        batchNo: pack.batchNo || "",
        packedDate: pack.packedDate,
        useByDate: pack.useByDate,
        createdBy: pack.createdBy
          ? {
            _id: pack.createdBy._id.toString(),
            name: pack.createdBy.name,
            email: pack.createdBy.email,
          }
          : null,
        createdAt: pack.createdAt ? pack.createdAt.toISOString() : null,
        updatedAt: pack.updatedAt ? pack.updatedAt.toISOString() : null,
        __v: pack.__v,
      };
    });

    res.status(StatusCodes.OK).json({
      total: localizedPacks.length,
      packs: localizedPacks,
    });
  } catch (error) {
    console.error("Error fetching product packs:", error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPacksByProduct = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const { productId } = req.params;
    const lang = req.query.lang || "en";

    const packs = await ProductPack.find({
      financialYearId: activeFY._id,
      productId,
    })
      .populate("productId", "name category unit")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    if (!packs || packs.length === 0) {
      throw new NotFoundError("No packs found for this product");
    }

    // Localize each pack
    const localizedPacks = packs.map((pack) => {
      const localized = localize(pack, lang);
      if (localized.productId) {
        localized.productId = localize(localized.productId, lang);
      }
      return localized;
    });

    res.status(StatusCodes.OK).json({
      total: localizedPacks.length,
      packs: localizedPacks,
    });
  } catch (error) {
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProductPack = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const activeFY = await getActiveFinancialYear();
    const { id } = req.params;
    const packId = id;
    const {
      productId,
      shopId,
      packSize,
      packCount,
      unit,
      gst,
      profitPercentage,
      pricePerPack,
    } = req.body;

    const pack = await ProductPack.findOne({
      _id: packId,
      financialYearId: activeFY._id,
    }).session(session);
    if (!pack) throw new NotFoundError("Product pack not found");

    pack.productId = productId || pack.productId;
    pack.shopId = shopId || pack.shopId;
    pack.packSize = packSize || pack.packSize;
    pack.packCount = packCount || pack.packCount;
    pack.totalWeight =
      (packSize || pack.packSize) * (packCount || pack.packCount);
    pack.unit = unit || pack.unit;
    pack.gst = gst !== undefined ? gst : pack.gst;
    pack.profitPercentage =
      profitPercentage !== undefined ? profitPercentage : pack.profitPercentage;
    pack.pricePerPack =
      pricePerPack !== undefined ? pricePerPack : pack.pricePerPack;

    await pack.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product pack updated successfully",
      data: localize(pack.toObject(), req.query.lang || "en"),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update Error:", error);
    res.status(error.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to update product pack",
    });
  }
};

export const deleteProductPack = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const { id } = req.params;
    console.log(id);

    const pack = await ProductPack.findOneAndDelete({
      _id: id,
      financialYearId: activeFY._id,
    });
    if (!pack) throw new NotFoundError("Product pack not found");

    // await pack.remove();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product pack deleted successfully",
    });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(error.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to delete product pack",
    });
  }
};
