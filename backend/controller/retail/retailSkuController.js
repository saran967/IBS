import SKU from "../../models/retail/RetailProductSkumodel.js";
import Product from "../../models/productModel.js";
import { BadRequestError, NotFoundError } from "../../Error/customError.js";

// --------------------------------------------------
// CREATE SKU
// --------------------------------------------------
export const createSKU = async (req, res) => {
  try {
    const {
      productId,
      sellUnit,
      sellQty = 1,
      baseQty,
      retailPrice,
      wholesalePrice = 0,
      agentPrice = 0,
      allowRetail = true,
      allowWholesale = true,
      barcode,
    } = req.body;

    //  validations
    if (!productId) throw new BadRequestError("Product ID is required");
    if (!sellUnit) throw new BadRequestError("Sell Unit is required");
    if (!sellQty || Number(sellQty) <= 0)
      throw new BadRequestError("Sell Qty must be greater than 0");

    if (!baseQty || Number(baseQty) <= 0)
      throw new BadRequestError("Base Qty must be greater than 0");

    if (retailPrice === undefined || Number(retailPrice) < 0)
      throw new BadRequestError("Retail Price is required");

    const product = await Product.findById(productId).select(
      "barcode baseUnitType name productCode",
    );

    if (!product) throw new NotFoundError("Product not found");

    //  SKU barcode fallback
    const skuBarcode = barcode && barcode.length ? barcode : product.barcode;

    //  display name like "1 BOX"
    const displayName = `${sellQty} ${sellUnit}`.trim();

    //  create SKU
    const sku = await SKU.create({
      productId,
      sellUnit: sellUnit.toUpperCase(),
      sellQty: Number(sellQty),
      baseQty: Number(baseQty),
      retailPrice: Number(retailPrice),
      wholesalePrice: Number(wholesalePrice),
      agentPrice: Number(agentPrice),
      allowRetail,
      allowWholesale,
      barcode: skuBarcode,
      displayName,
    });

    res.status(201).json({
      success: true,
      message: "SKU created successfully",
      data: sku,
      productBaseUnit: product.baseUnitType, // extra info for frontend
    });
  } catch (err) {
    console.log("Create SKU Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to create SKU",
    });
  }
};

// --------------------------------------------------
// GET SKUS FOR A PRODUCT
// --------------------------------------------------
export const getSKUsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) throw new BadRequestError("Product ID required");

    const skus = await SKU.find({ productId }).sort({ baseQty: 1 });

    res.status(200).json({
      success: true,
      data: skus,
    });
  } catch (err) {
    console.log("Get SKU Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to load SKUs",
    });
  }
};

// --------------------------------------------------
// UPDATE SKU
// --------------------------------------------------
export const updateSKU = async (req, res) => {
  try {
    const { id } = req.params;

    const sku = await SKU.findById(id);
    if (!sku) throw new NotFoundError("SKU not found");

    const {
      sellUnit,
      sellQty,
      baseQty,
      retailPrice,
      wholesalePrice,
      agentPrice,
      allowRetail,
      allowWholesale,
      barcode,
    } = req.body;

    if (sellUnit !== undefined) sku.sellUnit = sellUnit.toUpperCase();

    if (sellQty !== undefined) {
      if (Number(sellQty) <= 0)
        throw new BadRequestError("Sell Qty must be greater than 0");
      sku.sellQty = Number(sellQty);
    }

    if (baseQty !== undefined) {
      if (Number(baseQty) <= 0)
        throw new BadRequestError("Base Qty must be greater than 0");
      sku.baseQty = Number(baseQty);
    }

    if (retailPrice !== undefined) {
      if (Number(retailPrice) < 0)
        throw new BadRequestError("Retail price cannot be negative");
      sku.retailPrice = Number(retailPrice);
    }

    if (wholesalePrice !== undefined) {
      if (Number(wholesalePrice) < 0)
        throw new BadRequestError("Wholesale price cannot be negative");
      sku.wholesalePrice = Number(wholesalePrice);
    }

    if (agentPrice !== undefined) {
      if (Number(agentPrice) < 0)
        throw new BadRequestError("Agent price cannot be negative");
      sku.agentPrice = Number(agentPrice);
    }

    if (allowRetail !== undefined) sku.allowRetail = allowRetail;
    if (allowWholesale !== undefined) sku.allowWholesale = allowWholesale;

    if (barcode !== undefined) sku.barcode = barcode;

    //  regenerate displayName
    sku.displayName = `${sku.sellQty} ${sku.sellUnit}`.trim();

    await sku.save();

    res.status(200).json({
      success: true,
      message: "SKU updated successfully",
      data: sku,
    });
  } catch (err) {
    console.log("Update SKU Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update SKU",
    });
  }
};

// --------------------------------------------------
// DELETE SKU
// --------------------------------------------------
export const deleteSKU = async (req, res) => {
  try {
    const { id } = req.params;

    const sku = await SKU.findById(id);
    if (!sku) throw new NotFoundError("SKU not found");

    await sku.deleteOne();

    res.status(200).json({
      success: true,
      message: "SKU deleted successfully",
    });
  } catch (err) {
    console.log("Delete SKU Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to delete SKU",
    });
  }
};
