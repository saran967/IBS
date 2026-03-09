// controllers/dashboardController.js

import Sale from "../models/salesModel.js";
import Purchase from "../models/purchaseModel.js";
import Product from "../models/productModel.js";
import Customer from "../models/customerModel.js";
import StockTransfer from "../models/stockTransfer.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";
import Inventory from "../models/inventoryModel.js";


export const getDashboardSummary = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.json({
        todaySales: 0,
        totalProducts: await Product.countDocuments(),
        totalCustomers: await Customer.countDocuments(),
        lowStockProducts: 0,
        pendingTransfers: 0,
        recentSales: [],
        recentPurchases: [],
        lowStockItems: [],
        stats30Days: [],
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [
      todaySalesAgg,
      totalProducts,
      totalCustomers,
      lowStockAggResult,
      recentSales,
      recentPurchases,
      pendingTransfers,
      sales30Days,
      purchases30Days,
    ] = await Promise.all([
      // TODAY SALES
      Sale.aggregate([
        { $match: { financialYearId: activeFY._id, createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: "$netTotal" } } },
      ]),

      Product.countDocuments(),
      Customer.countDocuments(),

      // Low Stock Aggregation using Inventory
      Inventory.aggregate([
        { $match: { financialYearId: activeFY._id } },
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
            name: "$productDoc.name",
            productCode: "$productDoc.productCode",
            minStockLevel: "$productDoc.minStockLevel",
            baseUnitType: 1,
            purchaseType: 1,
            totalPacks: 1,
            totalWeight: 1,
            totalStock: {
              $cond: {
                if: { $eq: ["$purchaseType", "SKU"] },
                then: "$totalPacks",
                else: {
                  $divide: [
                    "$totalWeight",
                    { $cond: { if: { $in: ["$baseUnitType", ["G", "ML"]] }, then: 1000, else: 1 } }
                  ]
                }
              }
            },
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
        { $sort: { totalStock: 1 } }
      ]),

      // Recent Sales (for tables)
      Sale.find({ financialYearId: activeFY._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customerId", "customerName")
        .lean(),

      // Recent Purchases (for tables)
      Purchase.find({ financialYearId: activeFY._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("vendorId", "name")
        .lean(),

      StockTransfer.countDocuments({ financialYearId: activeFY._id, status: { $ne: "approved" } }),

      // 30 Days Sales (for charts)
      Sale.find({
        financialYearId: activeFY._id,
        createdAt: { $gte: thirtyDaysAgo }
      })
        .select("netTotal createdAt saleDate")
        .lean(),

      // 30 Days Purchases (for charts)
      Purchase.find({
        financialYearId: activeFY._id,
        createdAt: { $gte: thirtyDaysAgo }
      })
        .select("totalAmount createdAt purchaseDate")
        .lean(),
    ]);

    res.json({
      todaySales: todaySalesAgg[0]?.total || 0,
      totalProducts,
      totalCustomers,
      lowStockProducts: lowStockAggResult.length,
      pendingTransfers,
      recentSales,
      recentPurchases,
      lowStockItems: lowStockAggResult.slice(0, 10),
      sales30Days,
      purchases30Days,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: err.message });
  }
};
