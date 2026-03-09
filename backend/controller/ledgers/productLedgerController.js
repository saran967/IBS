import Sale from "../../models/salesModel.js";
import Product from "../../models/productModel.js";
import Inventory from "../../models/inventoryModel.js";
import mongoose from "mongoose";
import getActiveFinancialYear from "../../utils/getActiveFinancialYear.js";

export const getProductLedgerFor = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY)
      return res.status(400).json({ error: "No active financial year" });

    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const pid = new mongoose.Types.ObjectId(productId);

    // 🔥 SALES (FY FILTERED)
    const sales = await Sale.aggregate([
      {
        $match: {
          financialYearId: activeFY._id,   // 🔥 IMPORTANT
        },
      },
      { $unwind: "$items" },
      { $match: { "items.productId": pid } },
      {
        $project: {
          date: "$createdAt",
          type: { $literal: "SALE" },
          ref: "$invoiceNumber",
          out: "$items.quantity",
          in: { $literal: 0 },
        },
      },
    ]);

    // 🔥 PURCHASE / INVENTORY (FY FILTERED)
    const purchase = await Inventory.aggregate([
      {
        $match: {
          productId: pid,
          financialYearId: activeFY._id,   // 🔥 IMPORTANT
        },
      },
      {
        $project: {
          date: "$createdAt",
          type: { $literal: "PURCHASE" },
          ref: "$purchaseId",
          in: "$totalPacks",
          out: { $literal: 0 },
        },
      },
    ]);

    const ledger = [...sales, ...purchase].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    let balance = 0;
    const finalLedger = ledger.map((entry) => {
      balance += (entry.in || 0) - (entry.out || 0);
      return { ...entry, balance };
    });

    res.json(finalLedger);
  } catch (error) {
    console.error("Product Ledger Error:", error);
    res.status(500).json({ error: error.message });
  }
};
export const getOverallLedger = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY)
      return res.status(400).json({ error: "No active financial year" });

    // 🔥 SALES
    const sales = await Sale.aggregate([
      { $match: { financialYearId: activeFY._id } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          date: "$createdAt",
          product: "$product.name.en",
          type: { $literal: "SALE" },
          ref: "$invoiceNumber",
          out: "$items.quantity",
          in: { $literal: 0 },
        },
      },
    ]);

    // 🔥 PURCHASE
    const purchases = await Inventory.aggregate([
      { $match: { financialYearId: activeFY._id } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          date: "$createdAt",
          product: "$product.name.en",
          type: { $literal: "PURCHASE" },
          ref: "$purchaseId",
          in: "$totalPacks",
          out: { $literal: 0 },
        },
      },
    ]);

    const ledger = [...sales, ...purchases].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    let balance = 0;
    const finalLedger = ledger.map((e) => {
      balance += (e.in || 0) - (e.out || 0);
      return { ...e, balance };
    });

    res.json(finalLedger);
  } catch (err) {
    console.error("Overall Ledger Error:", err);
    res.status(500).json({ error: err.message });
  }
};