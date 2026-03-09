import NotificationReadLog from "../models/notificationReadLogSchema.js";
import Order from "../models/orderModel.js";
import stockTransfer from "../models/stockTransfer.js";
import Customer from "../models/customerModel.js";
import TokenSale from "../models/tokenSaleModel.js";
import Sale from "../models/salesModel.js"
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";
import Vendor from "../models/vendorModel.js";
import Purchase from "../models/purchaseModel.js";
// import VendorLedger from "../models/vendorPaymentModel.js";  //  ADD
import VendorLedger from "../models/vendors/VendorLedgerSchema.js";
import mongoose from "mongoose";




export const getNotifications = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const activeFY = await getActiveFinancialYear();
    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";

    const shopIdRaw =
      typeof req.user.shopId === "object" ? req.user.shopId?._id : req.user.shopId;

    const shopId =
      shopIdRaw && mongoose.Types.ObjectId.isValid(shopIdRaw)
        ? new mongoose.Types.ObjectId(shopIdRaw)
        : null;

    const readLogs = await NotificationReadLog.find({ userId: req.user.userId }).lean();

    const readOrderIds = readLogs
      .filter((l) => l.type === "ORDER")
      .map((l) => l.refId);

    const readTokenIds = readLogs
      .filter((l) => l.type === "TOKEN")
      .map((l) => l.refId);

    const readTransferIds = readLogs
      .filter((l) => l.type === "STOCK_TRANSFER")
      .map((l) => l.refId);

      const readCreditIds = readLogs
  .filter((l) => l.type === "CREDIT_LIMIT")
  .map((l) => l.refId);

const readOverdueIds = readLogs
  .filter((l) => l.type === "OVERDUE")
  .map((l) => l.refId);

  // 🔔 READ VENDOR OVERDUE IDS
const readVendorOverdueIds = readLogs
  .filter((l) => l.type === "VENDOR_OVERDUE")
  .map((l) => l.refId);

    const orderFilter = {
      financialYearId: activeFY._id,
      orderStatus: { $in: ["requested", "pending"] },
      _id: { $nin: readOrderIds },
    };
    if (!isAdmin && shopId) {
      orderFilter["orderItems.shopId"] = shopId;
    }

    const tokenFilter = {
      financialYearId: activeFY._id,
      status: "PENDING",
      _id: { $nin: readTokenIds },
    };
    if (!isAdmin && shopId) {
      tokenFilter.shopId = shopId;
    }

    const transferFilter = {
      financialYearId: activeFY._id,
      status: "pending",
      _id: { $nin: readTransferIds },
    };
    if (!isAdmin && shopId) {
      transferFilter.$or = [{ fromShopId: shopId }, { toShopId: shopId }];
    }

    const [orderNotifications, tokenNotifications, stockTransferNotifications] =
      await Promise.all([

        
        Order.find(orderFilter)
          .populate("customerId", "customerName")
          .populate("orderItems.shopId", "name")
          .sort({ createdAt: -1 })
          .limit(30),
        TokenSale.find(tokenFilter)
          .populate("customerId", "customerName")
          .populate("shopId", "name")
          .sort({ createdAt: -1 })
          .limit(30),
        stockTransfer
          .find(transferFilter)
          .populate("productId", "name")
          .populate("fromShopId", "name")
          .populate("toShopId", "name")
          .populate("fromGodownId", "name")
          .populate("toGodownId", "name")
          .populate("transferredBy.userId", "name role")
          .sort({ createdAt: -1 })
          .limit(30),
          
      ]);

      // 🔔 CREDIT LIMIT NOTIFICATIONS
const creditLimitNotifications = await Sale.find({
  financialYearId: activeFY._id,
  balanceAmount: { $gt: 0 },
  _id: { $nin: readCreditIds }
})
.populate("customerId", "customerName creditLimit openingBalance")
.sort({ createdAt: -1 })
.limit(200);

const filteredCreditNotifications = creditLimitNotifications
  .filter(s => s.customerId && s.customerId.creditLimit > 0)
  .filter(s => {
      const exposure = Number(s.balanceAmount || 0);

      return exposure > Number(s.customerId.creditLimit);
  })
  .map(s => ({
      _id: s._id,
      customerName: s.customerId.customerName,
      creditLimit: s.customerId.creditLimit,
      totalExposure: Number(s.balanceAmount || 0),
      invoiceNumber: s.invoiceNumber,
      createdAt: s.createdAt
  }));

/* 🔔 VENDOR CREDIT LIMIT NOTIFICATIONS */

/* 🔔 VENDOR CREDIT LIMIT NOTIFICATIONS */

const vendorCreditNotifications = await Purchase.find({
  financialYearId: activeFY._id,
  totalAmount: { $gt: 0 }
})
.populate("vendorId", "name creditLimit")
.populate("createdBy", "name")
.sort({ createdAt: -1 })
.limit(200);

const filteredVendorCredit = vendorCreditNotifications
  .filter(p => p.vendorId && p.vendorId.creditLimit > 0)
  .filter(p => p.totalAmount > p.vendorId.creditLimit)
  .filter(p => !readLogs.some(r => 
      r.type === "VENDOR_CREDIT_LIMIT" && 
      r.refId.toString() === p._id.toString()
  ))
  .map(p => ({
      _id: p._id,
      name: p.vendorId.name,
      purchaseAmount: p.totalAmount,
      creditLimit: p.vendorId.creditLimit,
      createdByName: p.createdBy?.name
  }));

// 🔔 OVERDUE SALE NOTIFICATIONS
// const activeFY = await getActiveFinancialYear();

const today = new Date();
// today.setDate(today.getDate() + 15); //test for sales
today.setHours(23, 59, 59, 999);

const overdueSalesRaw = await Sale.find({
  financialYearId: activeFY._id,
  balanceAmount: { $gt: 0 },
  dueDate: { $lte: today },
  _id: { $nin: readOverdueIds },
})
.populate("customerId", "customerName")
.populate("createdBy", "username role")
.sort({ dueDate: 1 })
.limit(30);

const overdueNotifications = overdueSalesRaw.map((sale) => ({
  _id: sale._id,
  invoiceNumber: sale.invoiceNumber,
  customerName: sale.customerId?.customerName,
  balanceAmount: sale.balanceAmount,
  dueDate: sale.dueDate,
  createdAt: sale.createdAt,
   createdByName: sale.createdBy?.username,   // ✅ ADD
  createdByRole: sale.createdBy?.role  
}));



  // 🔔 OVERDUE VENDOR PURCHASES
// 🔔 OVERDUE VENDOR PURCHASES (LEDGER BASED)

// 🔔 OVERDUE VENDOR PURCHASES (ADMIN ONLY - LEDGER BASED)test

let limitedOverdueVendorPurchases = [];

if (isAdmin) {

const todayVendor = new Date();
// todayVendor.setDate(todayVendor.getDate() + 15); // test for vendor
todayVendor.setHours(23, 59, 59, 999);
//overdue for vendor
const overdueVendorPurchasesRaw = await Purchase.find({
  financialYearId: activeFY._id,
 dueDate: { $lte: todayVendor },
  $or: [
    { balanceAmount: { $gt: 0 } },
    { balanceAmount: { $exists: false } }
  ],
  _id: { $nin: readVendorOverdueIds }
})
.populate("vendorId", "name")
.populate("createdBy", "name")
.sort({ dueDate: 1 });

// const overdueVendorPurchasesRaw = await Purchase.find({
//   financialYearId: activeFY._id,
//   dueDate: { $lt: new Date() },
//   balanceAmount: { $gt: 0 },
//   _id: { $nin: readVendorOverdueIds }
// })
// .populate("vendorId", "name")
// .populate("createdBy", "name")
// .sort({ dueDate: 1 });

    // console.log(overdueVendorPurchasesRaw, 'log 1st data');

  const overdueVendorPurchases = [];

for (const purchase of overdueVendorPurchasesRaw) {

const remainingPurchase =
  purchase.balanceAmount !== undefined && purchase.balanceAmount !== null
    ? Number(purchase.balanceAmount)
    : Number(purchase.totalAmount || 0);

if (remainingPurchase > 0) {
  overdueVendorPurchases.push({
    ...purchase.toObject(),
    remainingBalance: remainingPurchase,
  });
}

}

  limitedOverdueVendorPurchases = overdueVendorPurchases.slice(0, 30);
}
return res.status(200).json({
  success: true,
  orders: orderNotifications,
  tokens: tokenNotifications,
  stockTransfers: stockTransferNotifications,
  creditLimits: filteredCreditNotifications,
  overdueSales: overdueNotifications,
  vendorCreditLimits: filteredVendorCredit,
overdueVendorPurchases: limitedOverdueVendorPurchases,
count:
  orderNotifications.length +
  tokenNotifications.length +
  stockTransferNotifications.length +
  filteredCreditNotifications.length +
  overdueNotifications.length +
  filteredVendorCredit.length +
  limitedOverdueVendorPurchases.length,
});

  } catch (error) {
    console.error("Notification fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};


export const markNotificationRead = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

   const { type, refId } = req.body || {};

if (!type || !refId) {
  return res.status(400).json({
    success: false,
    message: "type and refId required",
  });
}

if (!mongoose.Types.ObjectId.isValid(refId)) {
  return res.status(400).json({
    success: false,
    message: "Invalid refId",
  });
}

    await NotificationReadLog.updateOne(
      {
        userId: req.user.userId,
        type,
        refId: new mongoose.Types.ObjectId(refId),
      },
      {
        $setOnInsert: {
          userId: req.user.userId,
          type,
          refId: new mongoose.Types.ObjectId(refId),
        },
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("markNotificationRead error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user.userId;
    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";
    const shopIdRaw =
      typeof req.user.shopId === "object" ? req.user.shopId?._id : req.user.shopId;
    const shopId =
      shopIdRaw && mongoose.Types.ObjectId.isValid(shopIdRaw)
        ? new mongoose.Types.ObjectId(shopIdRaw)
        : null;

    const activeFY = await getActiveFinancialYear();

    const unreadOrders = await Order.find({
      financialYearId: activeFY._id,
      orderStatus: { $in: ["requested", "pending"] },
      ...(isAdmin ? {} : { "orderItems.shopId": shopId }),
    }).select("_id");

    const unreadTokens = await TokenSale.find({
      financialYearId: activeFY._id,
      status: "PENDING",
      ...(isAdmin ? {} : { shopId }),
    }).select("_id");

    const unreadTransfers = await stockTransfer.find({
      financialYearId: activeFY._id,
      status: "pending",
      ...(isAdmin ? {} : { $or: [{ fromShopId: shopId }, { toShopId: shopId }] }),
    }).select("_id");

   const unreadCreditLimits = await Sale.find({
  financialYearId: activeFY._id,
  balanceAmount: { $gt: 0 }
})
.populate("customerId", "creditLimit openingBalance")
.select("_id customerId balanceAmount");

const filteredUnreadCredit = unreadCreditLimits
  .filter(s => s.customerId && s.customerId.creditLimit > 0)
  .filter(s => {
    const exposure = Number(s.balanceAmount || 0);

    return exposure > Number(s.customerId.creditLimit);
  })
  .map(s => ({ _id: s._id }));

   const today = new Date();
today.setHours(23, 59, 59, 999);

const unreadOverdue = await Sale.find({
  financialYearId: activeFY._id,
  balanceAmount: { $gt: 0 },
  dueDate: { $lte: today },
}).select("_id");
// 🔔 UNREAD VENDOR OVERDUE (LEDGER BASED)

let unreadVendorOverdue = [];

if (isAdmin) {

 const todayVendor = new Date();
//  todayVendor.setDate(todayVendor.getDate() + 20);
todayVendor.setHours(23, 59, 59, 999);

const allOverduePurchases = await Purchase.find({
  financialYearId: activeFY._id,
  dueDate: { $lte: todayVendor },
}).select("_id totalAmount balanceAmount");


 for (const purchase of allOverduePurchases) {

  const remaining =
  purchase.balanceAmount !== undefined && purchase.balanceAmount !== null
    ? Number(purchase.balanceAmount)
    : Number(purchase.totalAmount || 0);

  if (remaining > 0) {
    unreadVendorOverdue.push({ _id: purchase._id });
  }

} // ✅ LOOP ENDS HERE

}

const unreadVendorCredit = await Purchase.find({
  financialYearId: activeFY._id,
  totalAmount: { $gt: 0 }
})
.populate("vendorId", "creditLimit")
.select("_id vendorId totalAmount");

const filteredVendorCredit = unreadVendorCredit
  .filter(p => p.vendorId && p.vendorId.creditLimit > 0)
  .filter(p => p.totalAmount > p.vendorId.creditLimit)
  .map(p => ({ _id: p._id }));


const logs = [
  ...unreadOrders.map((o) => ({
    userId,
    type: "ORDER",
    refId: o._id,
  })),
  ...unreadTokens.map((t) => ({
    userId,
    type: "TOKEN",
    refId: t._id,
  })),
  ...unreadTransfers.map((tr) => ({
    userId,
    type: "STOCK_TRANSFER",
    refId: tr._id,
  })),
 ...filteredUnreadCredit.map((c) => ({
  userId,
  type: "CREDIT_LIMIT",
  refId: c._id,
})),
  ...unreadOverdue.map((s) => ({
    userId,
    type: "OVERDUE",
    refId: s._id,
  })),
  ...unreadVendorOverdue.map((p) => ({
    userId,
    type: "VENDOR_OVERDUE",
    refId: p._id,
  })),
  ...filteredVendorCredit.map((p) => ({
    userId,
    type: "VENDOR_CREDIT_LIMIT",
    refId: p._id,
  })),
].filter(
  (log) =>
    log.userId &&
    mongoose.Types.ObjectId.isValid(log.userId) &&
    log.refId &&
    mongoose.Types.ObjectId.isValid(log.refId)
);

if (logs.length > 0) {
  await NotificationReadLog.insertMany(logs, { ordered: false });
}

return res.json({
  success: true,
  message: "All notifications cleared",
});
  } catch (error) {
    console.error("clearAllNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
