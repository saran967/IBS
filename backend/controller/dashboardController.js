// controllers/dashboardController.js

import Sale from "../models/salesModel.js";
import Purchase from "../models/purchaseModel.js";
import Product from "../models/productModel.js";
import Customer from "../models/customerModel.js";
import StockTransfer from "../models/stockTransfer.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";


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
      lowStockProducts,
      recentSales,
      recentPurchases,
      pendingTransfers,
      topProducts,
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

      // Low stock count
      Product.countDocuments({
        $expr: {
          $and: [
            { $gt: ["$minStockLevel", 0] },
            { $lt: ["$totalStock", "$minStockLevel"] }
          ]
        }
      }),

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

      // Low Stock Items (Top 10 most urgent)
      Product.find({
        $expr: {
          $and: [
            { $gt: ["$minStockLevel", 0] },
            { $lt: ["$totalStock", "$minStockLevel"] }
          ]
        }
      })
        .sort({ totalStock: 1 })
        .limit(10)
        .select("name totalStock productCode minStockLevel baseUnitType")
        .lean(),

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
      lowStockProducts,
      pendingTransfers,
      recentSales,
      recentPurchases,
      lowStockItems: topProducts,
      sales30Days,
      purchases30Days,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: err.message });
  }
};
