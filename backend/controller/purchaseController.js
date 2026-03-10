import mongoose from "mongoose";
import Purchase from "../models/purchaseModel.js";
import Product from "../models/productModel.js";
import Inventory from "../models/inventoryModel.js";
import Shop from "../models/shopModel.js";
import Godown from "../models/godownModel.js";
import { StatusCodes } from "http-status-codes";
import { publishLedgerEvent } from "../services/queue.js";
import SKU from "../models/retail/RetailProductSkumodel.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";
import Vendor from "../models/vendorModel.js";
import Notification from "../models/notificationReadLogSchema.js";

export const createPurchase = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const {
      vendorId,
      productCode,
      purchaseType = "SKU", // SKU | LOOSE
      skuId = null,

      totalPacks = 0, // SKU only
      baseQty = 0, // ALWAYS BASE (G / ML / PCS)
      unitPrice = 0, // SKU => ₹ per PACK | LOOSE => ₹ per KG/LTR/PCS

      splits = [],
      transport = {},
      isFree = false,
      assignToProduct = null,
    } = req.body;

    /* ---------------- BASIC VALIDATION ---------------- */
    if (!vendorId || !productCode) {
      return res.status(400).json({ message: "Vendor & Product required" });
    }

    const product = await Product.findOne({ productCode });
    // 🔥 Calculate Vendor Due Date
    const vendor = await Vendor.findById(vendorId);

    const dueDays = vendor?.dueDays || 15;

    const purchaseDate = new Date();
    const dueDate = new Date(purchaseDate);
    dueDate.setDate(dueDate.getDate() + dueDays);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    /* ---------------- BASE UNIT NORMALIZATION ---------------- */
    const baseUnitType = String(product.baseUnitType || "G")
      .trim()
      .toUpperCase(); // G | ML | PCS

    console.log("🧪 PRODUCT BASE UNIT RAW :", product.baseUnitType);
    console.log(
      "🧪 BASE UNIT NORMALIZED :",
      `[${baseUnitType}]`,
      baseUnitType.length,
    );

    const purchaseMode = purchaseType === "LOOSE" ? "LOOSE" : "SKU";

    /* ---------------- SKU SNAPSHOT ---------------- */
    let baseQtyPerPack = 0;
    let sellQtySnapshot = 1;
    let sellUnitSnapshot = "";

    if (purchaseMode === "SKU") {
      if (!skuId) {
        return res.status(400).json({ message: "SKU required" });
      }

      const sku = await SKU.findById(skuId).lean();
      if (!sku) {
        return res.status(404).json({ message: "SKU not found" });
      }

      baseQtyPerPack = Number(sku.baseQty || 0);
      if (!baseQtyPerPack || baseQtyPerPack <= 0) {
        return res.status(400).json({ message: "Invalid SKU baseQty" });
      }

      sellQtySnapshot = sku.sellQty || 1;
      sellUnitSnapshot = sku.sellUnit || "";
    }

    /* ---------------- TOTAL BASE QTY ---------------- */
    let totalBaseQty = 0;

    if (purchaseMode === "SKU") {
      totalBaseQty = Number(totalPacks) * Number(baseQtyPerPack);
    } else {
      totalBaseQty = Number(baseQty); // already BASE
    }

    if (!totalBaseQty || totalBaseQty <= 0) {
      return res.status(400).json({ message: "Quantity must be > 0" });
    }

    console.log("🧮 TOTAL BASE QTY :", totalBaseQty);

    /* ---------------- AMOUNT CALCULATION (EXPLICIT & SAFE) ---------------- */
    let baseAmount = 0;

    if (purchaseMode === "SKU") {
      // SKU → price per pack
      baseAmount = Number(unitPrice) * Number(totalPacks);

      console.log("🧮 SKU PRICE :", unitPrice);
      console.log("🧮 SKU PACKS :", totalPacks);
    } else {
      // LOOSE → price entered per KG / LTR / PCS
      let pricePerBase = 0;

      if (baseUnitType === "G" || baseUnitType === "ML") {
        pricePerBase = Number(unitPrice) / 1000; // KG→G or LTR→ML
      } else {
        pricePerBase = Number(unitPrice); // PCS
      }

      console.log("🧮 UNIT PRICE (UI) :", unitPrice);
      console.log("🧮 PRICE PER BASE :", pricePerBase);

      baseAmount = pricePerBase * Number(totalBaseQty);
    }

    const transportAmount = Number(transport?.amount || 0);
    const totalAmount = Number((baseAmount + transportAmount).toFixed(2));

    console.log("🧮 BASE AMOUNT :", baseAmount);
    console.log("🧮 TOTAL AMOUNT :", totalAmount);

    /* ---------------- SPLITS ---------------- */
    const shopSplits = [];
    const godownSplits = [];

    for (const s of splits) {
      const entry = {
        baseQty:
          purchaseMode === "SKU"
            ? Number(s.packs || 0) * baseQtyPerPack
            : Number(s.baseQty || 0),
        packs: purchaseMode === "SKU" ? Number(s.packs || 0) : 0,
      };

      if (s.type === "shop") shopSplits.push({ shop: s.id, ...entry });
      if (s.type === "godown") godownSplits.push({ godown: s.id, ...entry });
    }

    /* ---------------- SPLIT VALIDATION ---------------- */
    if (product.maintainInventory !== false) {
      if (purchaseMode === "SKU") {
        const splitPacks =
          shopSplits.reduce((a, s) => a + s.packs, 0) +
          godownSplits.reduce((a, g) => a + g.packs, 0);

        if (splitPacks !== Number(totalPacks)) {
          return res.status(400).json({
            message: `Split packs mismatch. Total: ${totalPacks}, Split: ${splitPacks}`,
          });
        }
      } else {
        const splitBaseQty =
          shopSplits.reduce((a, s) => a + s.baseQty, 0) +
          godownSplits.reduce((a, g) => a + g.baseQty, 0);

        if (splitBaseQty !== totalBaseQty) {
          return res.status(400).json({
            message: `Split quantity mismatch. Total: ${totalBaseQty}, Split: ${splitBaseQty}`,
          });
        }
      }
    }

    /* ---------------- CREATE PURCHASE ---------------- */
    const purchase = await Purchase.create({
      financialYearId: activeFY._id,
      vendorId,
      productId: product._id,
      productCode,

      purchaseMode,

      skuId: purchaseMode === "SKU" ? skuId : null,
      sellQty: purchaseMode === "SKU" ? sellQtySnapshot : 1,
      sellUnit: purchaseMode === "SKU" ? sellUnitSnapshot : "",
      baseUnitType,

      baseQtyPerPack: purchaseMode === "SKU" ? baseQtyPerPack : 0,
      totalPacks: purchaseMode === "SKU" ? totalPacks : 0,
      baseQty: totalBaseQty,

      unitPrice,
      totalAmount,

      shopSplits,
      godownSplits,
      transport,
      isFree,
      assignToProduct,
      createdBy: req.user?.userId,
      dueDate
    });

    /* ---------------- INVENTORY UPDATE ---------------- */
    const updateInventory = async (loc) => {
      const query = {
        financialYearId: activeFY._id,
        productId: product._id,
        shopId: loc.shop || null,
        godownId: loc.godown || null,
        isFree: isFree,
      };

      let inv = await Inventory.findOne(query);

      if (!inv) {
        inv = new Inventory({
          financialYearId: activeFY._id,
          productId: product._id,
          shopId: loc.shop || null,
          godownId: loc.godown || null,
          productCode,
          vendorId,
          baseUnitType,
          purchaseType: purchaseMode,
          isFree: isFree,
        });
      }

      inv.totalWeight = Number(inv.totalWeight || 0) + Number(loc.baseQty || 0);
      inv.remainingWeight =
        Number(inv.remainingWeight || 0) + Number(loc.baseQty || 0);

      if (purchaseMode === "SKU") {
        inv.totalPacks = Number(inv.totalPacks || 0) + Number(loc.packs || 0);
        inv.remainingPacks =
          Number(inv.remainingPacks || 0) + Number(loc.packs || 0);
        inv.unitWeight = Number(baseQtyPerPack || 0);
      }

      await inv.save();
    };


    if (product.maintainInventory !== false) {
      for (const s of shopSplits) await updateInventory(s);
      for (const g of godownSplits) await updateInventory(g);

      /* ---------------- PRODUCT UPDATE ---------------- */
      product.totalStock = Number(product.totalStock || 0) + Number(totalBaseQty);

      /* ---------------- FREE ITEM ASSIGNMENT ---------------- */
      if (isFree && assignToProduct) {
        await Product.findByIdAndUpdate(assignToProduct, {
          $addToSet: { freeItems: { productId: product._id, quantity: 1 } },
        });
      }
    }

    // ONLY LOOSE updates purchase price
    if (purchaseMode === "LOOSE") {
      product.purchasePrice = Number(unitPrice);
    }

    await product.save();

    /* ---------------- CREDIT LIMIT CHECK (VENDOR) ---------------- */

    try {
      const vendor = await Vendor.findById(vendorId);
      if (vendor) {

        // 🔥 Use already fetched activeFY (DO NOT call again)
        const totalPurchases = await Purchase.aggregate([
          {
            $match: {
              vendorId: vendor._id,
              financialYearId: activeFY._id,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalAmount" },
            },
          },
        ]);

        const totalPurchaseAmount = totalPurchases[0]?.total || 0;
        const openingBalance = Number(vendor.openingBalance || 0);
        const creditLimit = Number(vendor.creditLimit || 0);

        const totalExposure = totalPurchaseAmount + openingBalance;

        if (creditLimit > 0 && totalExposure > creditLimit) {
          console.log("⚠ Vendor credit limit exceeded");

          // 🔔 Create Notification properly
          // const Notification = mongoose.model("Notification");

          await Notification.create({
            type: "VENDOR_CREDIT_LIMIT",
            title: "Vendor Credit Limit Exceeded",
            message: `Vendor ${vendor.name?.en || ""} exceeded credit limit. 
Limit: ₹${creditLimit}, Current Exposure: ₹${totalExposure}`,
            refId: vendor._id,
            financialYearId: activeFY._id,
          });
        }
      }
    } catch (err) {
      console.error("Vendor credit limit check error:", err);
    }
    return res.status(201).json({
      success: true,
      purchase,
    });
  } catch (err) {
    console.error("❌ createPurchase error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const getAllPurchases = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY) {
      return res.status(200).json({ success: true, purchases: [] });
    }
    const purchases = await Purchase.find({
      financialYearId: activeFY._id,
    })
      .populate("productId")
      .populate("vendorId")
      .populate({ path: "shopSplits.shop", model: "Shop" })
      .populate({ path: "godownSplits.godown", model: "Godown" })
      .sort({ createdAt: -1 });

    const formatted = purchases.map((p) => {
      const isSKU = p.purchaseMode === "SKU";

      const splits = [];

      //  shop splits
      (p.shopSplits || []).forEach((s) => {
        splits.push({
          type: "shop",
          id: s.shop?._id || s.shop,
          packs: isSKU ? Number(s.packs || 0) : 0,
          baseQty: Number(s.baseQty || 0),
        });
      });

      //  godown splits
      (p.godownSplits || []).forEach((g) => {
        splits.push({
          type: "godown",
          id: g.godown?._id || g.godown,
          packs: isSKU ? Number(g.packs || 0) : 0,
          baseQty: Number(g.baseQty || 0),
        });
      });
      return {
        ...p.toObject(),
        purchaseMode: isSKU ? "SKU" : "LOOSE",

        //  show properly in list
        totalPacks: isSKU ? Number(p.totalPacks || 0) : 0,
        totalBaseQty: Number(p.totalWeight || 0), //  totalWeight = base qty

        splits,
      };
    });

    return res.status(200).json({
      success: true,
      purchases: formatted,
    });
  } catch (err) {
    console.error("getAllPurchases error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching purchases",
    });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const p = await Purchase.findOne({
      _id: req.params.id,
      financialYearId: activeFY._id,
    })
      .populate("productId")
      .populate("vendorId")
      .populate({ path: "shopSplits.shop", model: "Shop" })
      .populate({ path: "godownSplits.godown", model: "Godown" });

    if (!p)
      return res
        .status(404)
        .json({ success: false, message: "Purchase not found" });

    const splits = [];

    p.shopSplits.forEach((s) => {
      splits.push({
        type: "shop",
        id: s.shop._id,
        packs: s.packs,
      });
    });

    p.godownSplits.forEach((g) => {
      splits.push({
        type: "godown",
        id: g.godown._id,
        packs: g.packs,
      });
    });

    return res.status(200).json({
      success: true,
      purchase: { ...p.toObject(), splits },
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching purchase" });
  }
};

//  UPDATE
export const updatePurchase = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const purchase = await Purchase.findOneAndUpdate(
      {
        _id: req.params.id,
        financialYearId: activeFY._id,
      },
      req.body,
      { new: true, runValidators: true },
    );

    if (!purchase) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Purchase not found for current financial year",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Purchase updated",
      purchase,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || "Error updating purchase",
    });
  }
};

//  DELETE
export const deletePurchase = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const purchase = await Purchase.findOneAndDelete({
      _id: req.params.id,
      financialYearId: activeFY._id,
    });

    if (!purchase) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Purchase not found for current financial year",
      });
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Purchase deleted successfully",
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message || "Error deleting purchase",
    });
  }
};
