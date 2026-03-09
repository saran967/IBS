import mongoose from "mongoose";
import Purchase from "../models/purchaseModel.js";
import Vendor from "../models/vendorModel.js";
import VendorPayment from "../models/vendorPaymentModel.js";
import Product from "../models/productModel.js";
import VendorLedger from "../models/vendors/VendorLedgerSchema.js";
import { publishLedgerEvent } from "../services/queue.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";

// ======================================================================
//  GLOBAL PIE CHART — Total Purchase / Total Paid / Balance (FY Based)
// ======================================================================
export const vendorSummaryPie = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    // 🔥 TOTAL PURCHASE (FY FILTERED)
    const totalPurchaseAgg = await Purchase.aggregate([
      { $match: { financialYearId: activeFY._id } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    // 🔥 TOTAL PAID (FY FILTERED)
    const totalPaidAgg = await VendorPayment.aggregate([
      { $match: { financialYearId: activeFY._id } },
      { $group: { _id: null, paid: { $sum: "$amount" } } },
    ]);

    const totalPurchase = totalPurchaseAgg[0]?.total || 0;
    const totalPaid = totalPaidAgg[0]?.paid || 0;

    res.json({
      success: true,
      data: {
        totalPurchase,
        totalPaid,
        balance: totalPurchase - totalPaid,
      },
    });
  } catch (err) {
    console.error("Vendor Summary Pie Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ======================================================================
//  BAR CHART — Vendor-wise Product Count (FY Based)
// ======================================================================
export const vendorProductBar = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const data = await Purchase.aggregate([
      // 🔥 FILTER BY FINANCIAL YEAR
      { $match: { financialYearId: activeFY._id } },

      {
        $group: {
          _id: "$vendorId",
          totalProducts: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: "$vendor" },
      {
        $project: {
          vendorName: "$vendor.name",
          totalProducts: 1,
        },
      },
      { $sort: { vendorName: 1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error("Vendor Product Bar Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================================
// TOP 10 PURCHASED PRODUCTS (FY Based)
// ======================================================================
export const vendorTopProducts = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const data = await Purchase.aggregate([
      // 🔥 FILTER BY FINANCIAL YEAR
      { $match: { financialYearId: activeFY._id } },

      {
        $group: {
          _id: "$productId",
          productName: { $first: "$productName.en" },
          qty: { $sum: "$totalPacks" },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error("Vendor Top Products Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================================
//  GET Vendor Ledger (FY Based)
// ======================================================================
export const getVendorLedger = async (req, res) => {
  try {
    const { vendorId, from, to, limit = 500 } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId required",
      });
    }

    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const fromDate = from ? new Date(from) : new Date("1970-01-01");
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const query = {
      vendorId: new mongoose.Types.ObjectId(vendorId),
      financialYearId: activeFY._id,   // 🔥 FY filter
      date: { $gte: fromDate, $lte: toDate },
    };

    const rows = await VendorLedger.find(query)
      .sort({ date: 1, createdAt: 1 })
      .limit(Number(limit))
      .lean();

    // Running balance (calculated fresh)
    let runningBalance = 0;
    const ledgerWithBalance = rows.map((entry) => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0);
      return { ...entry, runningBalance };
    });

    res.json({
      success: true,
      rows: ledgerWithBalance,
      balance: runningBalance,
    });
  } catch (err) {
    console.error("Vendor Ledger Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ======================================================================
// 5️⃣ CREATE Vendor Payment (Credit) — FY Based
// ======================================================================
export const createVendorPayment = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const { vendorId, amount, paymentDate, mode, reference, notes } = req.body;

    if (!vendorId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID & Amount required",
      });
    }

    // 🔥 Create VendorPayment with FY
    const payment = await VendorPayment.create({
      
      financialYearId: activeFY._id,
      vendorId: new mongoose.Types.ObjectId(vendorId),
      amount: Number(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      mode,
      reference,
      notes,
      createdBy: req.user?.userId || null,
    });
    const originalPaymentAmount = Number(amount);
// =====================================================
// FIFO PAYMENT LOGIC
// =====================================================

const vendor = await Vendor.findById(vendorId);

let remainingAmount = Number(amount);
let openingPaid = 0;

// 1️⃣ Clear Opening Balance first
// 1️⃣ Clear Opening Balance first
if (vendor.openingBalance > 0 && remainingAmount > 0) {

 let openingPay = 0;

if (remainingAmount >= vendor.openingBalance) {
  openingPay = vendor.openingBalance;
  remainingAmount -= vendor.openingBalance;
  vendor.openingBalance = 0;
} else {
  openingPay = remainingAmount;
  vendor.openingBalance -= remainingAmount;
  remainingAmount = 0;
}

openingPaid = openingPay;

  // 🔥 Ledger entry for opening balance repayment
  await publishLedgerEvent({
    financialYearId: activeFY._id,
    vendorId: vendor._id,
    purchaseId: null,
    type: "PAYMENT",
    debit: 0,
    credit: openingPay,
    referenceId: payment._id,
    note: `Opening balance repayment (${openingPay})`,
    metadata: { mode, reference },
    createdBy: req.user?.userId,
  });
}

// 2️⃣ Adjust oldest purchase balance (FIFO)
if (remainingAmount > 0) {

 const purchases = await Purchase.find({
  vendorId: vendor._id,
  financialYearId: activeFY._id,
  $or: [
    { balanceAmount: { $gt: 0 } },
    { balanceAmount: { $exists: false } }
  ]
}).sort({ purchaseDate: 1 });

  for (let p of purchases) {

    if (remainingAmount <= 0) break;

   // ensure balanceAmount exists (do not break existing functionality)
if (p.balanceAmount === undefined || p.balanceAmount === null) {
  p.balanceAmount = Number(p.totalAmount || 0);
}

let payAmount = 0;

if (remainingAmount >= p.balanceAmount) {
  payAmount = p.balanceAmount;
  remainingAmount -= p.balanceAmount;
  p.balanceAmount = 0;
} else {
  payAmount = remainingAmount;
  p.balanceAmount = p.balanceAmount - remainingAmount;
  remainingAmount = 0;
}

await p.save();
//     await publishLedgerEvent({
//   financialYearId: activeFY._id,
//   vendorId: vendor._id,
//   purchaseId: p._id,
//   type: "PAYMENT",
//   debit: 0,
//   credit: payAmount,
//   referenceId: payment._id,
//   note: `Vendor repayment (${payAmount})`,
//   metadata: { mode, reference },
//   createdBy: req.user?.userId,
// });
  }
}

await vendor.save();


// =====================================================
// LEDGER ENTRY
// =====================================================

// =====================================================
// LEDGER ENTRY (FIFO PURCHASE PAYMENT)
// =====================================================

const purchasesForLedger = await Purchase.find({
  vendorId: new mongoose.Types.ObjectId(vendorId),
  financialYearId: activeFY._id
}).sort({ purchaseDate: 1 });

let ledgerRemaining = originalPaymentAmount - openingPaid; // only leftover after opening balance

for (const p of purchasesForLedger) {

  if (ledgerRemaining <= 0) break;

  const paidAlready = await VendorLedger.aggregate([
    {
      $match: {
        purchaseId: p._id,
        financialYearId: activeFY._id,
      }
    },
    {
      $group: {
        _id: null,
        paid: { $sum: "$credit" }
      }
    }
  ]);

  // console.log(paidAlready, 'validate the user ');

  const alreadyPaid = paidAlready[0]?.paid || 0;

  const purchaseRemaining = Number(p.totalAmount) - alreadyPaid;

  if (purchaseRemaining <= 0) continue;

  let payAmount = 0;

  if (ledgerRemaining >= purchaseRemaining) {
    payAmount = purchaseRemaining;
    ledgerRemaining -= purchaseRemaining;
  } else {
    payAmount = ledgerRemaining;
    ledgerRemaining = 0;
  }

 await publishLedgerEvent({
  financialYearId: activeFY._id,
  vendorId,
  purchaseId: p._id,   // 🔥 IMPORTANT
  type: "PAYMENT",
  debit: 0,
  credit: payAmount,   // use FIFO payment amount
  referenceId: payment._id,
  note: `Vendor repayment (${payAmount})`,
  metadata: { mode, reference },
  createdBy: req.user?.userId,
});

console.log("Ledger inserted for purchase:", p._id, "Amount:", payAmount);

}

    res.status(201).json({
      success: true,
      payment,
    });
  } catch (err) {
    console.error("Create Vendor Payment Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================================================
//  LIST Vendor Payments + Purchases (FY Based Ledger View)
// ======================================================================
export const listVendorPayments = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const { vendorId, from, to } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const fromDate = from ? new Date(from) : new Date("1970-01-01");
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // 🔥 LOAD PURCHASES (FY FILTERED)
    const purchases = await Purchase.find({
  vendorId: vendorObjectId,
  financialYearId: activeFY._id,
  createdAt: { $gte: fromDate, $lte: toDate },
})
.select("_id totalAmount balanceAmount createdAt")
.sort({ createdAt: 1 })
.lean();

    // 🔥 LOAD PAYMENTS (FY FILTERED)
    const payments = await VendorPayment.find({
      vendorId: vendorObjectId,
      financialYearId: activeFY._id,
      paymentDate: { $gte: fromDate, $lte: toDate },
    })
      .sort({ paymentDate: 1 })
      .lean();

    // MERGE INTO LEDGER STYLE
  let ledger = [];

// 🔥 ADD OPENING BALANCE ENTRY
// const vendor = await Vendor.findById(vendorObjectId).lean();

// if (vendor?.openingBalance > 0) {
//   ledger.push({
//     date: new Date(activeFY.startDate),
//     type: "OPENING",
//     referenceId: null,
//     debit: Number(vendor.openingBalance),
//     credit: 0,
//   });
// }
purchases.forEach((p) => {

  const remaining = 
    p.balanceAmount !== undefined && p.balanceAmount !== null
      ? Number(p.balanceAmount)
      : Number(p.totalAmount || 0);

  ledger.push({
    date: p.createdAt,
    type: "PURCHASE",
    referenceId: p._id,
    debit: remaining,   // 🔥 send remaining balance
    credit: 0,
  });
});

   payments.forEach((pay) => {
  ledger.push({
    date: pay.paymentDate,
    type: "PAYMENT",
    referenceId: pay.reference || pay._id,
    debit: 0,
    credit: Number(pay.amount || 0),
  });
});

    // SORT BY DATE
    ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

    // RUNNING BALANCE
    let balance = 0;
    const ledgerWithBalance = ledger.map((entry) => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance };
    });

    res.json({
      success: true,
      ledger: ledgerWithBalance,
      finalBalance: balance,
    });
  } catch (err) {
    console.error("List Vendor Payments Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================================================
//  SINGLE Vendor Summary Pie (Vendor + FY Based)
// ======================================================================
export const vendorSummaryPieSingle = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // 🔥 PURCHASE (Vendor + FY)
    const totalPurchaseAgg = await Purchase.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
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

    // 🔥 PAYMENT (Vendor + FY)
    const totalPaidAgg = await VendorPayment.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          financialYearId: activeFY._id,
        },
      },
      {
        $group: {
          _id: null,
          paid: { $sum: "$amount" },
        },
      },
    ]);

    const totalPurchase = totalPurchaseAgg[0]?.total || 0;
    const totalPaid = totalPaidAgg[0]?.paid || 0;

    res.json({
      success: true,
      data: {
        totalPurchase,
        totalPaid,
        balance: totalPurchase - totalPaid,
      },
    });
  } catch (err) {
    console.error("Vendor Summary Single Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


export const vendorProductBarSingle = async (req, res) => {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "vendorId is required",
      });
    }

    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(400).json({
        success: false,
        message: "No active financial year found",
      });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const data = await Purchase.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          financialYearId: activeFY._id,   // 🔥 IMPORTANT FIX
        },
      },
      {
        $group: {
          _id: "$productId",
          totalProducts: { $sum: "$totalPacks" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          productName: "$product.name.en",
          totalProducts: 1,
        },
      },
      { $sort: { totalProducts: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    console.error("Vendor Product Bar Single Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};