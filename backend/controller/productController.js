import Product from "../models/productModel.js";
import Inventory from "../models/inventoryModel.js";
import Purchase from "../models/purchaseModel.js";
import Shop from "../models/shopModel.js";
import productPriceHistoryModel from "../models/productPriceHistoryModel.js";

import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../Error/customError.js";
import cloudinary from "../utils/cloudinary.js";

import bwipjs from "bwip-js";
import XLSX from "xlsx";

/* ------------------------------------------------------------------ */
/* BARCODE GENERATOR */
/* ------------------------------------------------------------------ */
const generateBarcodeDataUrl = async (text, options = {}) => {
  const opts = {
    bcid: "code128",
    text: String(text || ""),
    scale: options.scale || 3,
    height: options.height || 10,
    includetext: options.includetext ?? true,
  };

  const buffer = await bwipjs.toBuffer(opts);
  return `data:image/png;base64,${buffer.toString("base64")}`;
};

/* ------------------------------------------------------------------ */
/* CREATE PRODUCT */
/* ------------------------------------------------------------------ */
export const createProduct = async (req, res) => {
  try {
    const createdBy = req.user?.userId;

    const {
      name,
      category,
      unit,
      pack,
      productCode,
      weight = 0,
      totalStock = 0,
      barcode,
      enableDelivery = false,

      fssaiNumber,
      packedDate,
      useByDate,
      mrp,

      purchasePrice = 0,
      profitPercentage = 0,
      sellingPrice = 0,
      cgstPercentage = 0,
      sgstPercentage = 0,

      sellingPriceforB2B,
      sellingPriceforB2C,
      sellingPriceforAgent,

      hsnCode = "",
      allowRetail = false,
      description,
      minStockLevel = 0,
    } = req.body;

    if (!name?.en)
      throw new BadRequestError("Product English name is required");
    if (!productCode) throw new BadRequestError("Product code is required");
    if (weight < 0) throw new BadRequestError("Weight cannot be negative");

    const exists = await Product.findOne({ productCode });
    if (exists) throw new BadRequestError("Product code already exists");

    const purchase = Number(purchasePrice);
    let finalSellingPrice = Number(sellingPrice);
    let finalProfitPercentage = Number(profitPercentage);

    // Profit % → Selling price
    if (profitPercentage > 0 && sellingPrice === 0) {
      finalSellingPrice = Number(
        (purchase + (purchase * profitPercentage) / 100).toFixed(2),
      );
    }

    // Selling price → Profit %
    if (sellingPrice > 0 && profitPercentage === 0 && purchase > 0) {
      finalProfitPercentage = Number(
        (((sellingPrice - purchase) / purchase) * 100).toFixed(2),
      );
    }

    const product = await Product.create({
      name,
      category,
      unit,
      pack,
      productCode,
      weight,
      totalStock,
      createdBy,
      enableDelivery,

      fssaiNumber,
      packedDate,
      useByDate,
      mrp,

      purchasePrice: purchase,
      profitPercentage: finalProfitPercentage,
      sellingPrice: finalSellingPrice,
      cgstPercentage,
      sgstPercentage,

      sellingPriceforB2B,
      sellingPriceforB2C,
      sellingPriceforAgent,

      hsnCode,
      allowRetail,
      description,
      minStockLevel,
    });

    const shortCode = productCode;
    product.shortCode = shortCode;
    product.barcode = barcode || shortCode;
    product.barcodeUrl = await generateBarcodeDataUrl(product.barcode);

    await product.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/* GET ALL PRODUCTS */
/* ------------------------------------------------------------------ */
export const getAllProducts = async (req, res) => {
  try {
    let { page = 1, limit = 10, category = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const filter = {};
    if (category) {
      filter.$or = [
        { "category.en": { $regex: category, $options: "i" } },
        { "category.ta": { $regex: category, $options: "i" } },
      ];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      products,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllProductsForMobile = async (req, res) => {
  try {
    let { category = "" } = req.query;

    const filter = {};
    if (category) {
      filter.$or = [
        { "category.en": { $regex: category, $options: "i" } },
        { "category.ta": { $regex: category, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

    const total = products.length;

    res.status(200).json({
      totalRecords: total,
      products,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// import Product from "../models/Product.js";

export const searchProductsByCategory = async (req, res) => {
  try {
    const { q, category } = req.query;

    console.log(req.query, "query data");

    const filter = {};

    // -----------------------------------
    // TEXT SEARCH (name OR productCode)
    // -----------------------------------
    if (q) {
      filter.$or = [
        { "name.en": { $regex: q, $options: "i" } },
        { "name.ta": { $regex: q, $options: "i" } },
        { productCode: { $regex: q, $options: "i" } },
      ];
    }

    // -----------------------------------
    // CATEGORY FILTER (IMPORTANT)
    // -----------------------------------
    if (category) {
      filter["category.en"] = category;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to search products",
    });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    console.log("Category is reached");
    const categories = await Product.aggregate([
      {
        $match: {
          "category.en": { $ne: "" },
        },
      },
      {
        $group: {
          _id: {
            en: "$category.en",
            ta: "$category.ta",
          },
        },
      },
      {
        $project: {
          _id: 0,
          en: "$_id.en",
          ta: "$_id.ta",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

export const getAllUnits = async (req, res) => {
  try {
    const units = await Product.aggregate([
      {
        $match: {
          "unit.en": { $ne: "" },
        },
      },
      {
        $group: {
          _id: {
            en: "$unit.en",
            ta: "$unit.ta",
          },
        },
      },
      {
        $project: {
          _id: 0,
          en: "$_id.en",
          ta: "$_id.ta",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      units,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch units",
    });
  }
};

/* ------------------------------------------------------------------ */
/* UPDATE PRODUCT */
/* ------------------------------------------------------------------ */

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // =====================================================
    //  FIND PRODUCT
    // =====================================================
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError("Product not found");

    // =====================================================
    //  STORE OLD PRICE (FOR HISTORY)
    // =====================================================
    const oldPrice = Number(product.sellingPrice || 0);

    // =====================================================
    // HANDLE EXISTING IMAGES (FROM FRONTEND)
    // =====================================================
    const existingImages = req.body.existingImages
      ? JSON.parse(req.body.existingImages)
      : product.images || [];

    // =====================================================
    //  UPLOAD NEW IMAGES TO CLOUDINARY
    // =====================================================
    let newImages = [];

    if (req.files && req.files.length > 0) {
      newImages = await Promise.all(
        req.files.map((file) => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "productImages",
                resource_type: "image",
              },
              (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
              },
            );
            uploadStream.end(file.buffer);
          });
        }),
      );
    }

    const images = [...existingImages, ...newImages];

    // =====================================================
    // 5️⃣ AUTO PRICE CALCULATION
    // =====================================================
    const purchasePrice =
      req.body.purchasePrice !== undefined
        ? Number(req.body.purchasePrice)
        : Number(product.purchasePrice || 0);

    // PROFIT % → SELLING PRICE
    if (
      req.body.profitPercentage !== undefined &&
      req.body.sellingPrice === undefined
    ) {
      const profit = Number(req.body.profitPercentage || 0);
      req.body.sellingPrice = Number(
        (purchasePrice + (purchasePrice * profit) / 100).toFixed(2),
      );
    }

    // SELLING PRICE → PROFIT %
    if (req.body.sellingPrice !== undefined && purchasePrice > 0) {
      const selling = Number(req.body.sellingPrice || 0);
      req.body.profitPercentage = Number(
        (((selling - purchasePrice) / purchasePrice) * 100).toFixed(2),
      );
    }

    // =====================================================
    // 6️⃣ GST / HSN SAFETY
    // =====================================================
    if (req.body.cgstPercentage !== undefined) {
      req.body.cgstPercentage = Number(req.body.cgstPercentage || 0);
    }

    if (req.body.sgstPercentage !== undefined) {
      req.body.sgstPercentage = Number(req.body.sgstPercentage || 0);
    }

    if (req.body.hsnCode !== undefined) {
      req.body.hsnCode = String(req.body.hsnCode || "");
    }

    // =====================================================
    // 7️⃣ BARCODE REGENERATION
    // =====================================================
    if (req.body.barcode) {
      req.body.barcodeUrl = await generateBarcodeDataUrl(req.body.barcode);
    }

    // =====================================================
    // 8️⃣ APPLY ALL FIELDS
    // =====================================================
    Object.keys(req.body).forEach((key) => {
      product[key] = req.body[key];
    });

    product.images = images;

    // =====================================================
    // 9️⃣ SAVE PRODUCT (TRIGGERS pre("save"))
    // =====================================================
    await product.save();

    // =====================================================
    // 🔟 PRICE HISTORY
    // =====================================================
    const newPrice = Number(product.sellingPrice || 0);
    if (oldPrice !== newPrice) {
      await productPriceHistoryModel.create({
        productId: product._id,
        oldPrice,
        newPrice,
        changedBy: req.user?.userId,
      });
    }

    // =====================================================
    //  RESPONSE
    // =====================================================
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/* DELETE PRODUCT */
/* ------------------------------------------------------------------ */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const invCount = await Inventory.countDocuments({ productId: id });
    if (invCount > 0) {
      throw new BadRequestError(
        "Cannot delete product with existing inventory",
      );
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundError("Product not found");

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/* GET PRODUCT BY CODE / BARCODE */
/* ------------------------------------------------------------------ */
export const getProductByBarcode = async (req, res) => {
  try {
    const { code } = req.params;

    const product = await Product.findOne({
      $or: [{ productCode: code }, { barcode: code }, { shortCode: code }],
    });

    if (!product) throw new NotFoundError("Product not found");

    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/* PRICE HISTORY */
/* ------------------------------------------------------------------ */

export const getProductPriceHistory = async (req, res) => {
  const { id } = req.params;

  //  fetch product details
  const product = await Product.findById(id).select("name weight unit");

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  //  fetch history of that product
  const history = await productPriceHistoryModel
    .find({ productId: id })
    .sort({ changedAt: -1 })
    .populate("changedBy", "name weight unit");

  return res.status(200).json({
    product,
    history,
  });
};

/* ------------------------------------------------------------------ */
/* BULK UPLOAD */
/* ------------------------------------------------------------------ */
export const bulkUploadProducts = async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let successCount = 0;
    let failed = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      if (!r.productCode || !r.name_en) {
        failed.push({ row: i + 2, reason: "Missing required fields" });
        continue;
      }

      const exists = await Product.findOne({ productCode: r.productCode });
      if (exists) {
        failed.push({ row: i + 2, reason: "Duplicate productCode" });
        continue;
      }

      const purchase = Number(r.purchasePrice || 0);
      const profit = Number(r.profitPercentage || 0);
      const selling =
        r.sellingPrice > 0
          ? Number(r.sellingPrice)
          : Number((purchase + (purchase * profit) / 100).toFixed(2));

      const p = await Product.create({
        name: { en: r.name_en, ta: r.name_ta || "" },
        category: { en: r.category_en, ta: r.category_ta || "" },
        unit: { en: r.unit_en, ta: r.unit_ta || "" },
        productCode: r.productCode,
        purchasePrice: purchase,
        profitPercentage: profit,
        sellingPrice: selling,
        cgstPercentage: Number(r.cgstPercentage || 0),
        sgstPercentage: Number(r.sgstPercentage || 0),
        hsnCode: r.hsnCode || "",
        fssaiNumber: r.fssaiNumber,
        packedDate: r.packedDate,
        useByDate: r.useByDate,
        mrp: r.mrp,
      });

      p.shortCode = r.productCode;
      p.barcode = r.productCode;
      p.barcodeUrl = await generateBarcodeDataUrl(r.productCode);
      await p.save();

      successCount++;
    }

    res.json({
      success: true,
      successCount,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).lean();
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductByCode = async (req, res) => {
  try {
    const { productCode } = req.params;

    const product = await Product.findOne({ productCode });
    if (!product) {
      throw new NotFoundError(`Product with code ${productCode} not found`);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      throw new NotFoundError("Product not found");
    }

    product.enableDelivery = !product.enableDelivery;
    await product.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Delivery status updated successfully",
      enableDelivery: product.enableDelivery,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const enableTheCategory = async (req, res) => {
  try {
    const { categoryName, enabled } = req.body;

    if (!categoryName || !categoryName.en) {
      throw new BadRequestError("Category English name is required");
    }

    if (typeof enabled !== "boolean") {
      throw new BadRequestError("enabled must be boolean");
    }

    const result = await Product.updateMany(
      {
        "category.en": {
          $regex: `^${categoryName.en}$`,
          $options: "i",
        },
      },
      { $set: { categoryDeliveryEnabled: enabled } },
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Category '${categoryName.en}' delivery ${enabled ? "enabled" : "disabled"
        }`,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllProductPriceHistory = async (req, res) => {
  try {
    const history = await productPriceHistoryModel
      .find()
      .populate("productId", "name productCode weight")
      .populate("changedBy", "name")
      .sort({ changedAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch price history",
    });
  }
};

export const getSelectedPriceHistory = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(StatusCodes.OK).json({
        success: true,
        history: [],
      });
    }

    const history = await productPriceHistoryModel
      .find({
        productId: { $in: productIds },
      })
      .populate("productId", "name productCode weight")
      .populate("changedBy", "name")
      .sort({ changedAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q = "" } = req.query;

    if (!q || q.length < 2) {
      return res.json({ products: [] });
    }

    const products = await Product.find({
      $or: [
        { productCode: { $regex: q, $options: "i" } },
        { "name.en": { $regex: q, $options: "i" } },
        { "name.ta": { $regex: q, $options: "i" } },
      ],
    })
      .select(
        "_id productCode name unit weight baseUnitType sellingPrice cgstPercentage sgstPercentage",
      )
      .limit(20)
      .lean();

    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
};
