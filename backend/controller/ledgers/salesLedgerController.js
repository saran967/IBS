import Sale from "../../models/salesModel.js";
import getActiveFinancialYear from "../../utils/getActiveFinancialYear.js";

// format month YYYY-MM
const formatMonth = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getCustomerEnglishName = (customer) => {
  const raw = customer?.customerName;
  if (!raw) return "Unknown Customer";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    return raw.en || raw.ta || "Unknown Customer";
  }
  return "Unknown Customer";
};

// -------------------------------
// GET main sales ledger
// -------------------------------
export const getSalesLedger = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const { customerId, from, to } = req.query;
    const filter = { financialYearId: activeFY._id };
    if (customerId) filter.customerId = customerId;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const sales = await Sale.find(filter).populate("customerId");

    const data = sales.map((s) => {
      const billAmount = s.netTotal || 0;
      const paidAmount = s.paidAmount || 0;
      const billType = s.billType || null;
      const balanceAmount =
        typeof s.balanceAmount === "number"
          ? s.balanceAmount
          : billAmount - paidAmount;

      return {
        saleId: s._id,
        invoiceNumber: s.invoiceNumber,
        customer: getCustomerEnglishName(s.customerId),
        saleType: s.saleType,
        billAmount,
        billType,
        paidAmount,
        balanceAmount,
        date: s.saleDate || s.createdAt,
        // If you have a separate CustomerPayment collection, populate here. For now keep payments empty.
        payments: [],
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("Sales Ledger Error:", err);
    res.status(500).json({ error: err.message });
  }
};
// -------------------------------
// Monthly sales summary
// -------------------------------
export const getMonthlySalesSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const sales = await Sale.find({ financialYearId: activeFY._id });
    const map = {};

    for (const s of sales) {
      const month = formatMonth(s.saleDate || s.createdAt);
      map[month] = (map[month] || 0) + (s.netTotal || 0);
    }

    const out = Object.entries(map).map(([month, total]) => ({ month, total }));
    res.json({ data: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// Customer-wise sales summary (pie)
// -------------------------------
export const getCustomerSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const sales = await Sale.find({
      financialYearId: activeFY._id,
    }).populate("customerId");

    const map = {};
    for (const s of sales) {
      const name = getCustomerEnglishName(s.customerId);
      map[name] = (map[name] || 0) + (s.netTotal || 0);
    }

    const out = Object.entries(map).map(([customer, amount]) => ({
      customer,
      amount,
    }));
    res.json({ data: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// Sales vs Paid (monthly) summary
// -------------------------------
export const getSalesPaymentSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const sales = await Sale.find({ financialYearId: activeFY._id });

    const monthly = {};

    for (const s of sales) {
      const month = formatMonth(s.saleDate || s.createdAt);
      if (!monthly[month]) monthly[month] = { sales: 0, paid: 0 };
      monthly[month].sales += s.netTotal || 0;
      monthly[month].paid += s.paidAmount || 0;
    }

    const out = Object.entries(monthly).map(([month, v]) => ({
      month,
      sales: v.sales,
      paid: v.paid,
      balance: v.sales - v.paid,
    }));

    res.json({ data: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -------------------------------
// Outstanding per customer
// -------------------------------
export const getCustomerOutstanding = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const sales = await Sale.find({
      financialYearId: activeFY._id,
    }).populate("customerId");

    const map = {};
    for (const s of sales) {
      console.log(sales, "sales");

      const name = getCustomerEnglishName(s.customerId);
      const bill = s.netTotal || 0;
      const paid = s.paidAmount || 0;
      map[name] = (map[name] || 0) + (bill - paid);
    }

    const out = Object.entries(map).map(([customer, pending]) => ({
      customer,
      pending,
    }));
    res.json({ data: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
