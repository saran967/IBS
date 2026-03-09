import Purchase from "../../models/purchaseModel.js";
import VendorPayment from "../../models/vendorPaymentModel.js";
import Vendor from "../../models/vendorModel.js";
import mongoose from "mongoose";

import getActiveFinancialYear from "../../utils/getActiveFinancialYear.js";
// Format month YYYY-MM
const formatMonth = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

//---------------------------------------------------
// MAIN LEDGER
//---------------------------------------------------
export const getPurchaseLedger = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY)
      return res.status(400).json({ error: "No active financial year" });

    const { vendorId, from, to } = req.query;

    const filter = {
      financialYearId: activeFY._id,  // 🔥 IMPORTANT
    };

    if (vendorId)
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const purchases = await Purchase.find(filter).populate("vendorId");

    const data = [];

    for (const p of purchases) {
      const billAmount = p.totalAmount || 0;

      const payments = await VendorPayment.find({
        purchaseId: p._id,
        financialYearId: activeFY._id,  // 🔥 IMPORTANT
      });

      const paidAmount = payments.reduce((s, x) => s + x.amount, 0);
      const balanceAmount = billAmount - paidAmount;

      data.push({
        purchaseId: p._id,
        vendor: p.vendorId?.name || "Unknown Vendor",
        billAmount,
        paidAmount,
        balanceAmount,
        date: p.createdAt,
        payments,
      });
    }

    res.json({ data });
  } catch (err) {
    console.error("Purchase Ledger Error:", err);
    res.status(500).json({ error: err.message });
  }
};


//---------------------------------------------------
// MONTHLY PURCHASE SUMMARY
//---------------------------------------------------
export const getMonthlyPurchaseSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    if (!activeFY)
      return res.status(400).json({ error: "No active financial year" });

    const purchases = await Purchase.find({
      financialYearId: activeFY._id,
    });

    const map = {};

    for (const p of purchases) {
      const month = formatMonth(p.createdAt);
      const bill = p.totalAmount || 0;
      map[month] = (map[month] || 0) + bill;
    }

    const formatted = Object.entries(map).map(([month, total]) => ({
      month,
      total,
    }));

    res.json({ data: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//---------------------------------------------------
// VENDOR-WISE PURCHASE SUMMARY
//---------------------------------------------------
export const getVendorSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        error: "No active financial year found",
      });
    }

    const purchases = await Purchase.find({
      financialYearId: activeFY._id,
    }).populate("vendorId");

    const map = {};

    for (const p of purchases) {
      const vendorName = p.vendorId?.name || "Unknown Vendor";
      const bill = p.totalAmount || 0;

      map[vendorName] = (map[vendorName] || 0) + bill;
    }

    const output = Object.entries(map).map(([vendor, amount]) => ({
      vendor,
      amount,
    }));

    res.json({ data: output });
  } catch (err) {
    console.error("Vendor Summary Error:", err);
    res.status(500).json({ error: err.message });
  }
};
//---------------------------------------------------
// PURCHASE VS PAID SUMMARY
//---------------------------------------------------
export const getPurchasePaymentSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const purchases = await Purchase.find({
  financialYearId: activeFY._id,
});
    const payments = await VendorPayment.find({
  financialYearId: activeFY._id,
});

    const monthly = {};

    // Purchase amounts
    for (const p of purchases) {
      const m = formatMonth(p.createdAt);
      if (!monthly[m]) monthly[m] = { purchase: 0, paid: 0 };

      monthly[m].purchase += p.totalAmount || 0;
    }

    // Payments
    for (const pay of payments) {
      const m = formatMonth(pay.paymentDate);
      if (!monthly[m]) monthly[m] = { purchase: 0, paid: 0 };

      monthly[m].paid += pay.amount || 0;
    }

    const formatted = Object.entries(monthly).map(([month, v]) => ({
      month,
      purchase: v.purchase,
      paid: v.paid,
      balance: v.purchase - v.paid,
    }));

    res.json({ data: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//---------------------------------------------------
// OUTSTANDING BY VENDOR
//---------------------------------------------------
export const getVendorOutstanding = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const purchases = await Purchase.find({
  financialYearId: activeFY._id,
}).populate("vendorId");
    const payments = await VendorPayment.find({
  financialYearId: activeFY._id,
});

    const map = {};

    // Add all purchase totals
    for (const p of purchases) {
      const vendorName = p.vendorId?.name || "Unknown Vendor";
      const bill = p.totalAmount || 0;

      map[vendorName] = (map[vendorName] || 0) + bill;
    }

    // Subtract payments
    for (const pay of payments) {
      const vendor = await Vendor.findById(pay.vendorId);

      if (vendor) {
        map[vendor.name] = (map[vendor.name] || 0) - pay.amount;
      }
    }

    const output = Object.entries(map).map(([vendor, pending]) => ({
      vendor,
      pending,
    }));

    res.json({ data: output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
