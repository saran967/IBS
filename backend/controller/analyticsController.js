import Sale from "../models/salesModel.js";
import Customer from "../models/customerModel.js";
import mongoose from "mongoose";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";



export const getSalesSummary = async (req, res) => {
      const activeFY = await getActiveFinancialYear();

  try {
   const overall = await Sale.aggregate([
  { $match: { financialYearId: activeFY._id } },
  {
    $group: {
      _id: null,
      totalGross: { $sum: "$grossTotal" },
      totalPaid: { $sum: "$paidAmount" },
      totalBalance: { $sum: "$balanceAmount" },
    },
  },
]);


    

    const b2b = await Sale.aggregate([
      { $match: { financialYearId: activeFY._id,saleType: "B2B" } },
      {
        $group: {
          _id: "$customerId",
          totalGross: { $sum: "$grossTotal" },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $project: {
          _id: 0,
          name: "$customer.customerName",
          totalGross: 1,
        },
      },
      { $sort: { totalGross: -1 } },
      { $limit: 5 },
    ]);

    const b2cTrend = await Sale.aggregate([
      { $match: {financialYearId: activeFY._id, saleType: "B2C" } },
      {
        $group: {
          _id: { $month: "$saleDate" },
          totalGross: { $sum: "$grossTotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      overall: overall[0],
      topB2B: b2b,
      b2cTrend,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
