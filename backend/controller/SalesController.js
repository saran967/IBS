import { StatusCodes } from "http-status-codes";
import Sale from "../models/salesModel.js";
import Inventory from "../models/inventoryModel.js";
import Customer from "../models/customerModel.js";
import Shop from "../models/shopModel.js";
import Product from "../models/productModel.js";
import SKU from "../models/retail/RetailProductSkumodel.js";

import inventoryModel from "../models/inventoryModel.js";
import mongoose from "mongoose";
import TokenSale from "../models/tokenSaleModel.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";
import Notification from "../models/notificationModel.js";



const cleanObjectId = (val) => {
  if (!val || val === "") return undefined;
  return val;
};



//  helper: base unit object for invoice
const getBaseUnitObject = (product) => {
  const base = product?.baseUnitType || "G";
  return { en: base, ta: base };


};

const convertLooseToInventory = (qty, baseUnitType) => {
  const q = Number(qty || 0);
  const base = String(baseUnitType || "").toUpperCase();

  if (base === "G") return q / 1000; // g → kg
  if (base === "ML") return q / 1000; // ml → ltr
  return q; // PCS stays PCS
};

const calculateBaseQty = async (item, product) => {
  const qty = Number(item.quantity || 0);
  if (!qty || qty <= 0) throw new Error("Quantity must be greater than 0");

  /* 1️⃣ SKU SALE */
  if (item.skuId) {
    const sku = await SKU.findById(item.skuId).lean();
    if (!sku) throw new Error("Invalid SKU");

    // sku.baseQty is already BASE
    return Number(sku.baseQty) * qty;
  }

  /* 2️⃣ LOOSE SALE (KG / LTR entered in UI) */
  if (item.isLoose) {
    const base = String(product.baseUnitType || "")
      .trim()
      .toUpperCase();

    if (base === "G" || base === "ML") {
      return qty * 1000; // KG → G, LTR → ML
    }

    return qty; // PCS
  }

  /* 3️⃣ BASE-PACK SALE (NO SKU, fixed weight product) */
  // 🔥 product.weight is ALREADY BASE (eg: 5000 g)
  return qty * Number(product.weight);
};

export const createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const activeFY = await getActiveFinancialYear();
    console.log("ACTIVE FY:", activeFY);
    const {
      customerId,
      saleType,

      billType = "GST",
      paymentMethod = "CASH",
      items = [],
      discount = 0,
      paidAmount = 0,
      includeTransport = false,
      transportDetails = {},
      includeHandling = false,
      handlingCharges = [],
      companyAllocations = [],
      paymentSplits = [],
    } = req.body;

    /* ---------------------------
       STEP 0: Customer validation
    ---------------------------- */
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error("Customer not found");

    const effectiveSaleType = saleType || customer.customerType || "B2C";



    /* ---------------------------
       STEP 1: Validate B2B allocations
    ---------------------------- */
    if (effectiveSaleType === "B2B") {
      if (!companyAllocations.length) {
        throw new Error("Company allocations required for B2B sale");
      }

      for (const ca of companyAllocations) {
        const sum = ca.allocations.reduce(
          (s, a) => s + Number(a.quantity || 0),
          0,
        );
        if (sum <= 0) throw new Error("Invalid company allocation qty");
      }
    }

    /* ---------------------------
       STEP 2: Stock validation
    ---------------------------- */
    for (const item of items) {
      const shopId = cleanObjectId(item.shopId) || req.user?.shopId;
      const godownId = cleanObjectId(item.godownId);

      if (!shopId && !godownId) {
        throw new Error("Shop or Godown must be selected");
      }

      const invQuery = {
        financialYearId: activeFY._id,
        productId: item.productId,
        ...(godownId ? { godownId } : { shopId }),
      };

      if (item.inventoryId) {
        delete invQuery.godownId;
        delete invQuery.shopId;
        invQuery._id = item.inventoryId;
      }

      const inv = await inventoryModel.findOne(invQuery);

      // Fallback: If no single row found but we have total stock across batches?
      // Actually, if they didn't select a batch, we should sum all batches in that location.
      if (!inv && !item.inventoryId) {
        const allBatches = await inventoryModel.find(invQuery);
        if (allBatches.length > 0) {
          const totalRemaining = allBatches.reduce((s, b) => s + b.remainingWeight, 0);
          // mocked inv object for check
          var mockInv = { remainingWeight: totalRemaining };
        }
      }

      const targetInv = inv || mockInv;

      if (!targetInv) throw new Error("Inventory not found");

      const product = await Product.findById(item.productId).lean();
      if (!product) throw new Error("Product not found");

      const requiredBaseQty = await calculateBaseQty(item, product);
      console.log("──────── STOCK CHECK ────────");
      console.log("🧪 PRODUCT:", product.name?.en);
      console.log("🧪 BASE UNIT:", product.baseUnitType);
      console.log("🧪 PRODUCT WEIGHT (if base-pack):", product.weight);
      console.log("🧪 SALE QTY (UI):", item.quantity);
      console.log("🧪 REQUIRED BASE QTY:", requiredBaseQty);
      console.log("🧪 INVENTORY REMAINING (BASE):", targetInv.remainingWeight);
      console.log("────────────────────────────");
      if (Number(targetInv.remainingWeight) < Number(requiredBaseQty)) {
        throw new Error(`Insufficient stock for ${product.name?.en}`);
      }
    }

    /* ---------------------------
       STEP 3: Build processedItems (TOTAL)
    ---------------------------- */
    const processedItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId).lean();
      if (!product) throw new Error("Product not found");

      const quantity = Number(it.quantity || 0);
      if (quantity <= 0) throw new Error("Invalid quantity");

      const sellingPrice = Number(it.sellingPrice ?? product.sellingPrice ?? 0);

      const cgstPercentage =
        billType === "WITHOUT_GST" ? 0 : Number(product.cgstPercentage || 0);
      const sgstPercentage =
        billType === "WITHOUT_GST" ? 0 : Number(product.sgstPercentage || 0);

      const cgstAmount = (sellingPrice * cgstPercentage) / 100;
      const sgstAmount = (sellingPrice * sgstPercentage) / 100;

      const total =
        billType === "WITHOUT_GST"
          ? sellingPrice * quantity
          : (sellingPrice + cgstAmount + sgstAmount) * quantity;

      let displayUnit;
      if (it.skuId) {
        const sku = await SKU.findById(it.skuId).lean();
        displayUnit = { en: sku.sellUnit, ta: sku.sellUnit };
      } else if (it.isLoose) {
        displayUnit = { en: product.baseUnitType, ta: product.baseUnitType };
      } else {
        displayUnit = product.unit;
      }

      let batchNoVal = "";
      if (it.inventoryId) {
        const batch = await Inventory.findById(it.inventoryId).select("batchNo").lean();
        batchNoVal = batch?.batchNo || "";
      }

      processedItems.push({
        productId: product._id,
        productName: product.name,
        hsnCode: product.hsnCode || "",

        skuId: it.skuId || null,
        isLoose: Boolean(it.isLoose),
        looseUnit: it.isLoose ? product.baseUnitType : null,

        quantity,
        unit: displayUnit,
        baseUnit: getBaseUnitObject(product),

        shopId: cleanObjectId(it.shopId) || req.user?.shopId,
        godownId: cleanObjectId(it.godownId),
        inventoryId: cleanObjectId(it.inventoryId),

        batchId: cleanObjectId(it.inventoryId),
        batchNo: batchNoVal,

        purchasePrice: Number(product.purchasePrice || 0),
        profitPercentage: Number(product.profitPercentage || 0),

        sellingPrice,
        cgstPercentage,
        sgstPercentage,
        cgstAmount,
        sgstAmount,
        total: Number(total.toFixed(2)),
      });
    }

    /* ---------------------------
       STEP 3.5: Build subDeliveries (B2B)
    ---------------------------- */
    let subDeliveries = [];

    if (effectiveSaleType === "B2B") {
      const map = {};

      for (const ca of companyAllocations) {
        if (!map[ca.companyId]) map[ca.companyId] = [];

        for (const alloc of ca.allocations) {
          const baseItem = processedItems.find(
            (i) => String(i.productId) === String(alloc.productId),
          );
          if (!baseItem) continue;

          map[ca.companyId].push({
            ...baseItem,
            quantity: alloc.quantity,
            total: alloc.quantity * baseItem.sellingPrice,
          });
        }
      }

      subDeliveries = Object.entries(map).map(([companyId, items]) => ({
        companyId,
        shopId: items[0]?.shopId || null,
        items,
        status: "Pending",
      }));
    }

    /* ---------------------------
       STEP 4: Totals
    ---------------------------- */
    const grossTotal = processedItems.reduce((s, i) => s + Number(i.total), 0);

    const handlingTotal = includeHandling
      ? handlingCharges.reduce((s, h) => s + Number(h.totalCharge || 0), 0)
      : 0;

    const netTotal = grossTotal + handlingTotal - Number(discount || 0);
    const paid = paymentSplits.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    const balanceAmount = netTotal - paid;
    const paymentStatus =
      paid === 0 ? "UNPAID" : paid < netTotal ? "PARTIAL" : "PAID";

    if (paid > netTotal) {
      throw new Error("Paid amount cannot exceed net total");
    }

    if (!paymentSplits.length && paid > 0) {
      throw new Error("Invalid payment split data");
    }

    /* ---------------------------
       STEP 5: Save Sale
    ---------------------------- */
    // 🔔 Calculate Due Date based on customer dueDays
    const saleDate = new Date(); // sale created date

    const dueDate = new Date(saleDate);
    dueDate.setDate(saleDate.getDate() + Number(customer.dueDays || 0));

    const sale = new Sale({
      financialYearId: activeFY._id,
      saleType: effectiveSaleType,
      billType,
      paymentSplits,
      customerId,
      dueDate,

      items: processedItems, // TOTAL
      subDeliveries, // ✅ B2B SPLIT

      grossTotal,
      discount,
      handlingCharges: includeHandling ? handlingCharges : [],
      handlingTotal,
      netTotal,
      paidAmount: paid,
      balanceAmount,
      paymentStatus,

      includeTransport,
      transportDetails,

      createdBy: req.user?.userId,
      createdByRole: req.user?.role,
      createdByShop: req.user?.shopId,
    });

    await sale.save({ session });

    /* ===============================
   CREDIT LIMIT & OVERDUE CHECKS
================================= */

    // Calculate total outstanding INCLUDING this new sale
    const previousSales = await Sale.find({
      financialYearId: activeFY._id,
      customerId: customer._id,
      balanceAmount: { $gt: 0 },
      _id: { $ne: sale._id } // exclude current if found, but it won't be since sale was just created but not yet included in queries unless it was already saved
    });

    const totalOutstanding =
      Number(customer.openingBalance || 0) +
      Number(sale.balanceAmount || 0) +
      previousSales.reduce((sum, s) => sum + Number(s.balanceAmount || 0), 0);

    // 1️⃣ Single Bill Cross Limit
    if (
      customer.creditLimit &&
      Number(sale.netTotal) > Number(customer.creditLimit)
    ) {
      await Notification.create({
        title: "Credit Limit Exceeded (Single Bill)",
        message: `${customer.customerName?.en} crossed credit limit (₹${customer.creditLimit}) with bill ${sale.invoiceNumber}`,
        type: "CREDIT_LIMIT",
        referenceId: sale._id,
      });
    }

    // 2️⃣ Total Outstanding Cross Limit
    if (
      customer.creditLimit &&
      totalOutstanding > Number(customer.creditLimit)
    ) {
      await Notification.create({
        title: "Customer Over Credit Limit",
        message: `${customer.customerName?.en} total outstanding (₹${totalOutstanding.toFixed(2)}) crossed limit (₹${customer.creditLimit})`,
        type: "CREDIT_LIMIT",
        referenceId: sale._id,
      });
    }

    const today = new Date();

    const overdueSales = await Sale.find({
      financialYearId: activeFY._id,
      customerId: customer._id,
      balanceAmount: { $gt: 0 },
      dueDate: { $lt: today },
      _id: { $ne: sale._id }
    });

    if (overdueSales.length > 0) {
      await Notification.create({
        title: "Customer Has Overdue Bills",
        message: `${customer.customerName?.en} has ${overdueSales.length} overdue bills`,
        type: "OVERDUE",
        referenceId: sale._id,
      });
    }
    /* ---------------------------
       STEP 6: Inventory deduction
    ---------------------------- */
    for (const it of processedItems) {
      const product = await Product.findById(it.productId).lean();
      const deductBaseQty = await calculateBaseQty(
        { skuId: it.skuId, isLoose: it.isLoose, quantity: it.quantity },
        product,
      );

      // 🔥 If specific batch was selected in UI, use its ID
      if (it.inventoryId) {
        const inv = await inventoryModel.findById(it.inventoryId).session(session);
        if (!inv) throw new Error("Inventory not found");
        inv.remainingWeight -= deductBaseQty;
        // If it's an SKU item, also deduct from remainingPacks
        if (it.skuId && inv.purchaseType === "SKU") {
          inv.remainingPacks -= Number(it.quantity);
        }
        if (inv.remainingWeight < 0) throw new Error("Stock underflow for selected batch");
        await inv.save({ session });
      } else {
        // FIFO Deduction
        const batches = await inventoryModel
          .find({
            financialYearId: activeFY._id,
            productId: it.productId,
            ...(it.godownId ? { godownId: it.godownId } : { shopId: it.shopId }),
            remainingWeight: { $gt: 0 },
          })
          .sort({ createdAt: 1 })
          .session(session);

        let remainingToDeduct = deductBaseQty;
        let remainingPacksToDeduct = it.skuId ? Number(it.quantity) : 0;

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const deductFromThis = Math.min(batch.remainingWeight, remainingToDeduct);
          batch.remainingWeight -= deductFromThis;
          remainingToDeduct -= deductFromThis;

          // If SKU, also deduct packs proportionately or as whole
          if (it.skuId && batch.purchaseType === "SKU" && remainingPacksToDeduct > 0) {
            const deductPacks = Math.min(batch.remainingPacks, remainingPacksToDeduct);
            batch.remainingPacks -= deductPacks;
            remainingPacksToDeduct -= deductPacks;
          }

          await batch.save({ session });
        }
        if (remainingToDeduct > 0) throw new Error("Insufficient total stock across batches");
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ success: true, sale });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllSales = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    if (!activeFY) {
      return res.status(200).json({
        success: true,
        sales: [],
        total: 0,
        totals: { totalGrand: 0, totalPaid: 0, totalBalance: 0 },
      });
    }

    const {
      page = 1,
      limit = 10,
      saleType,
      customerId,
      shopId,
      search,
      startDate,
      endDate,
      billType,
    } = req.query;

    // ✅ Declare query only ONCE
    const query = {
      financialYearId: activeFY._id, // 🔥 FY filter here
    };

    console.log("USER:", req.user);

    if (billType) query.billType = billType;

    if (saleType) query.saleType = saleType;

    if (customerId) query.customerId = customerId;

    if (req.user.role === "subadmin" || req.user.role === "sub-admin") {
      if (!req.user.shopId) {
        const shop = await Shop.findOne({ subAdmins: req.user.userId }).select(
          "_id",
        );

        if (!shop) {
          return res.status(403).json({
            success: false,
            message: "Subadmin does not belong to any shop",
          });
        }

        req.user.shopId = shop._id;
      }

      query["items.shopId"] = new mongoose.Types.ObjectId(req.user.shopId);
    }
    //  Admin can filter by shop
    else if (shopId) {
      query["items.shopId"] = new mongoose.Types.ObjectId(shopId);
    }

    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (search && search.trim() !== "") {
      const regex = new RegExp(search.trim(), "i");

      const [matchedCustomers, matchedProducts, matchedShops] =
        await Promise.all([
          Customer.find({ customerName: regex }, "_id"),
          Product.find(
            {
              $or: [
                { "name.en": regex },
                { "name.ta": regex },
                { name: regex },
              ],
            },
            "_id",
          ),
          Shop.find(
            {
              $or: [
                { "name.en": regex },
                { "name.ta": regex },
                { name: regex },
              ],
            },
            "_id",
          ),
        ]);

      const customerIds = matchedCustomers.map((c) => c._id);
      const productIds = matchedProducts.map((p) => p._id);
      const shopIds = matchedShops.map((s) => s._id);

      query.$or = [
        { customerId: { $in: customerIds } },
        { "items.productId": { $in: productIds } },
        { "items.shopId": { $in: shopIds } },
      ];
    }

    const skip = (page - 1) * limit;

    const total = await Sale.countDocuments(query);

    const sales = await Sale.find(query)
      .populate("customerId", "customerName customerType")
      .populate(
        "items.productId",
        "name category unit hsnCode pack categoryDeliveryEnabled enableDelivery",
      )

      .populate("items.shopId", "name")
      .populate("items.godownId", "name")

      .populate("subDeliveries.shopId", "name")
      .populate("createdBy", "username role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const saleIds = sales.map((s) => s._id);

    const tokens = await TokenSale.find({
      financialYearId: activeFY._id,
      saleRef: { $in: saleIds },
    }).lean();

    const salesWithTokens = sales.map((sale) => {
      const token = tokens.find(
        (t) => t.saleRef?.toString() === sale._id.toString(),
      );

      const saleObj = sale.toObject();

      if (saleObj.saleType === "B2B") {
        const companies = saleObj.customerId?.companies || [];
        const allocationMap = {};

        (saleObj.subDeliveries || []).forEach((sd) => {
          const companyId = sd.companyId?.toString();
          (sd.items || []).forEach((it) => {
            const pid = it.productId?.toString();
            if (!allocationMap[pid]) allocationMap[pid] = {};
            allocationMap[pid][companyId] =
              (allocationMap[pid][companyId] || 0) + Number(it.quantity);
          });
        });

        saleObj.items = saleObj.items.map((it) => {
          const pid = it.productId?._id?.toString() || it.productId?.toString();
          const restored = {};
          companies.forEach((c) => {
            restored[c._id] = allocationMap[pid]?.[c._id] ?? 0;
          });

          return { ...it, companyAllocation: restored };
        });
      }

      return {
        ...saleObj,
        tokenNumber: token?.tokenNumber || null,
        tokenStatus: token?.status || null,
        pickupDate: token?.pickupDate || null,
      };
    });

    const totals = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalGrand: { $sum: "$netTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: salesWithTokens,
      summary: totals[0] || {
        totalGrand: 0,
        totalPaid: 0,
        totalBalance: 0,
      },
    });
  } catch (error) {
    console.error("Get all sales error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const sale = await Sale.findOne({
      _id: req.params.id,
      financialYearId: activeFY._id,
    })

      .populate("customerId", "customerName customerType companies")
      .populate(
        "items.productId",
        "name category unit hsnCode enableDelivery categoryDeliveryEnabled",
      )

      .populate("items.shopId", "name")
      .populate("items.godownId", "name")

      .populate("subDeliveries.shopId", "shopName")
      .populate("createdBy", "username role");

    if (!sale) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Sale not found",
      });
    }

    // Sub-admin can only view their own shop’s sale
    if (
      req.user.role === "sub-admin" &&
      !sale.items.some(
        (it) => it.shopId?.toString() === req.user.shopId?.toString(),
      )
    ) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied for this sale record",
      });
    }
    // ----------------- FIX B2B ALLOCATION -----------------
    if (sale.saleType === "B2B") {
      const companies = sale.customerId?.companies || [];

      const allocationMap = {};

      (sale.subDeliveries || []).forEach((sd) => {
        const companyId = sd.companyId?.toString();
        (sd.items || []).forEach((it) => {
          const pid = it.productId?.toString();
          if (!allocationMap[pid]) allocationMap[pid] = {};
          allocationMap[pid][companyId] =
            (allocationMap[pid][companyId] || 0) + Number(it.quantity);
        });
      });

      sale.items = sale.items.map((it) => {
        const pid = it.productId?._id?.toString() || it.productId?.toString();

        const restored = {};
        companies.forEach((c) => {
          restored[c._id] = allocationMap[pid]?.[c._id] ?? 0;
        });

        return {
          ...it.toObject(),
          companyAllocation: restored,
        };
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error("Get sale by ID error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSalesByCustomer = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();

    const customerId = req.params.customerId;

    // Fetch customer including B2B companies
    const customer = await Customer.findById(customerId).lean();
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    const companyList = customer.companies || [];

    // Fetch sales for the customer
    const sales = await Sale.find({
      customerId,
      financialYearId: activeFY._id,
    })
      .sort({ createdAt: 1 })
      .populate("customerId", "customerName customerType companies")
      .populate("items.productId", "name unit productCode")
      .populate("items.shopId", "name")
      .lean();

    // ----------------- PROCESS SALES -----------------
    const finalSales = sales.map((sale) => {
      // Attach B2B companies
      sale.b2bCompanies = companyList;

      // If NOT B2B → no allocations needed
      if (sale.saleType !== "B2B") {
        sale.items = sale.items.map((it) => ({
          ...it,
          companyAllocation: {}, // B2C always empty
        }));

        return sale;
      }

      // ----------------- RESTORE B2B ALLOCATIONS -----------------

      // Build allocation map from subDeliveries:
      // Format: { productId: { companyId: qty } }
      const allocationMap = {};

      (sale.subDeliveries || []).forEach((sd) => {
        const companyId = sd.companyId?.toString();
        (sd.items || []).forEach((it) => {
          const pid = it.productId?.toString();

          if (!allocationMap[pid]) allocationMap[pid] = {};
          allocationMap[pid][companyId] =
            (allocationMap[pid][companyId] || 0) + Number(it.quantity);
        });
      });

      // Attach allocation to each sale item
      sale.items = sale.items.map((it) => {
        const pid = it.productId?._id?.toString() || it.productId?.toString();

        const restored = {};
        companyList.forEach((c) => {
          restored[c._id] = allocationMap[pid]?.[c._id] ?? 0;
        });

        return {
          ...it,
          _pid: pid,
          companyAllocation: restored, // FINAL ALLOCATION
        };
      });

      return sale;
    });

    // FINAL RESPONSE
    return res.json({
      success: true,
      sales: finalSales,
    });
  } catch (error) {
    console.error("Get sales by customer error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteSale = async (req, res) => {
  const activeFY = await getActiveFinancialYear();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      financialYearId: activeFY._id,
    }).session(session);

    if (!sale) {
      await session.abortTransaction();
      session.endSession();
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Sale not found",
      });
    }

    //  Admin only delete permission
    if (req.user.role !== "admin") {
      await session.abortTransaction();
      session.endSession();
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Only admins can delete sales",
      });
    }

    //  Restore inventory
    for (const item of sale.items) {
      const inv = await inventoryModel
        .findOne({
          financialYearId: activeFY._id,
          productId: item.productId,
          ...(item.godownId
            ? { godownId: item.godownId }
            : { shopId: item.shopId }),
        })
        .session(session);

      if (!inv) continue;

      const product = await Product.findById(item.productId).lean();
      if (!product) continue;

      const restoreBaseQty = await calculateBaseQty(
        {
          skuId: item.skuId,
          isLoose: item.isLoose,
          quantity: item.quantity,
        },
        product,
      );

      const newRemainingWeight =
        Number(inv.remainingWeight || 0) + Number(restoreBaseQty);

      await inventoryModel.updateOne(
        { _id: inv._id },
        {
          $set: {
            remainingWeight: Number(newRemainingWeight.toFixed(3)),
            remainingPacks:
              Number(inv.unitWeight || 0) > 0
                ? Number(
                  (newRemainingWeight / Number(inv.unitWeight)).toFixed(3),
                )
                : 0,
            lastUpdated: new Date(),
          },
        },
        { session },
      );
    }

    await Sale.deleteOne({ _id: sale._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Sale deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Delete sale error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSale = async (req, res) => {
  const activeFY = await getActiveFinancialYear();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleId = req.params.id;

    const existingSale = await Sale.findOne({
      _id: saleId,
      financialYearId: activeFY._id,
    }).session(session);

    if (!existingSale) {
      await session.abortTransaction();
      session.endSession();
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Sale not found",
      });
    }

    //  Admin only OR allow subadmin only if same shop
    if (
      req.user.role !== "admin" &&
      !existingSale.items.some(
        (it) => String(it.shopId) === String(req.user.shopId),
      )
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied",
      });
    }

    const {
      customerId,
      saleType,
      billType = existingSale.billType,
      paymentMethod = existingSale.paymentMethod,
      items = [],
      discount = 0,
      paidAmount = 0,
      includeTransport = false,
      transportDetails = {},
      includeHandling = false,
      handlingCharges = [],
    } = req.body;

    const customer = await Customer.findById(customerId).lean();
    if (!customer) throw new Error("Customer not found");

    const effectiveSaleType = saleType || customer.customerType;

    // =====================================================
    //  STEP 1: RESTORE OLD INVENTORY (undo previous sale)
    // =====================================================
    for (const oldItem of existingSale.items) {
      const inv = await inventoryModel
        .findOne({
          financialYearId: activeFY._id,
          productId: oldItem.productId,
          ...(oldItem.godownId
            ? { godownId: oldItem.godownId }
            : { shopId: oldItem.shopId }),
        })
        .session(session);


      if (!inv) continue;

      const product = await Product.findById(oldItem.productId).lean();
      if (!product) continue;

      const restoreBaseQty = await calculateBaseQty(
        {
          skuId: oldItem.skuId,
          isLoose: oldItem.isLoose,
          quantity: oldItem.quantity,
        },
        product,
      );

      const newRemainingWeight =
        Number(inv.remainingWeight || 0) + Number(restoreBaseQty);

      await inventoryModel.updateOne(
        { _id: inv._id },
        {
          $set: {
            remainingWeight: Number(newRemainingWeight.toFixed(3)),
            remainingPacks:
              Number(inv.unitWeight || 0) > 0
                ? Number(
                  (newRemainingWeight / Number(inv.unitWeight)).toFixed(3),
                )
                : 0,
            lastUpdated: new Date(),
          },
        },
        { session },
      );
    }

    // =====================================================
    //  STEP 2: VALIDATE NEW INVENTORY
    // =====================================================
    for (const item of items) {
      const shopId = cleanObjectId(item.shopId) || req.user?.shopId;
      const godownId = cleanObjectId(item.godownId);

      if (!shopId && !godownId)
        throw new Error("Shop or Godown must be selected");

      const inv = await inventoryModel
        .findOne({
          financialYearId: activeFY._id,
          productId: item.productId,
          ...(godownId ? { godownId } : { shopId }),
        })
        .session(session);


      if (!inv) throw new Error("Inventory not found");

      const product = await Product.findById(item.productId).lean();
      if (!product) throw new Error("Product not found");

      const requiredBaseQty = await calculateBaseQty(item, product);

      if (Number(inv.remainingWeight || 0) < Number(requiredBaseQty)) {
        throw new Error("Insufficient stock");
      }
    }

    // =====================================================
    //  STEP 3: PROCESS NEW ITEMS (same as createSale)
    // =====================================================
    const processedItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId).lean();
      if (!product) throw new Error("Product not found");

      const quantity = Number(it.quantity || 0);
      if (!quantity || quantity <= 0) throw new Error("Invalid quantity");

      const sellingPrice = Number(it.sellingPrice ?? product.sellingPrice ?? 0);

      const cgstPercentage =
        billType === "WITHOUT_GST"
          ? 0
          : Number(it.cgstPercentage ?? product.cgstPercentage ?? 0);

      const sgstPercentage =
        billType === "WITHOUT_GST"
          ? 0
          : Number(it.sgstPercentage ?? product.sgstPercentage ?? 0);

      const cgstAmount = (sellingPrice * cgstPercentage) / 100;
      const sgstAmount = (sellingPrice * sgstPercentage) / 100;

      const lineTotal =
        billType === "WITHOUT_GST"
          ? sellingPrice * quantity
          : (sellingPrice + cgstAmount + sgstAmount) * quantity;

      if (Number.isNaN(lineTotal)) throw new Error("Invalid pricing");

      let displayUnit;

      if (it.skuId) {
        const sku = await SKU.findById(it.skuId).lean();
        if (!sku) throw new Error("Invalid SKU");
        displayUnit = { en: sku.sellUnit, ta: sku.sellUnit };
      } else if (it.isLoose) {
        displayUnit = { en: product.baseUnitType, ta: product.baseUnitType };
      } else {
        displayUnit = product.unit;
      }

      const baseUnit = getBaseUnitObject(product);

      const shopId = cleanObjectId(it.shopId) || req.user?.shopId;
      const godownId = cleanObjectId(it.godownId);
      let sellUnit = "";
      let sellQty = 1;
      let baseQtyPerUnit = 0;
      let baseUnitType = product.baseUnitType || "G";

      if (it.skuId) {
        const sku = await SKU.findById(it.skuId).lean();
        if (!sku) throw new Error("Invalid SKU");

        sellUnit = sku.sellUnit;
        sellQty = Number(sku.sellQty || 1);
        baseQtyPerUnit = Number(sku.baseQty || 0);
      } else if (it.isLoose) {
        sellUnit = product.baseUnitType;
        sellQty = 1;
        baseQtyPerUnit = 1;
      }

      processedItems.push({
        productId: product._id,
        productName: product.name,
        hsnCode: product.hsnCode || "",

        //  NEW SNAPSHOT FIELDS
        skuId: it.skuId || null,
        sellUnit,
        sellQty,
        baseQtyPerUnit,
        baseUnitType,
        isLoose: Boolean(it.isLoose),
        looseUnit: it.isLoose ? product.baseUnitType : null,

        unit: displayUnit,
        baseUnit,

        shopId,
        godownId,

        quantity,
        purchasePrice: Number(product.purchasePrice ?? 0),
        profitPercentage: Number(product.profitPercentage ?? 0),
        sellingPrice,
        cgstPercentage,
        sgstPercentage,
        cgstAmount,
        sgstAmount,
        total: Number(lineTotal.toFixed(2)),
      });
    }

    const grossTotal = Number(
      processedItems.reduce((s, i) => s + Number(i.total || 0), 0).toFixed(2),
    );

    const handlingTotal = includeHandling
      ? handlingCharges.reduce((s, h) => s + Number(h.totalCharge || 0), 0)
      : 0;

    const netTotal = Number(
      (grossTotal + handlingTotal - Number(discount || 0)).toFixed(2),
    );

    const paid = Number(paidAmount || 0);
    const balanceAmount = Number((netTotal - paid).toFixed(2));

    // =====================================================
    //  STEP 4: DEDUCT NEW INVENTORY
    // =====================================================
    for (const it of processedItems) {
      const inv = await inventoryModel
        .findOne({
          financialYearId: activeFY._id,
          productId: it.productId,
          ...(it.godownId ? { godownId: it.godownId } : { shopId: it.shopId }),
        })
        .session(session);


      if (!inv) throw new Error("Inventory not found while updating");

      const product = await Product.findById(it.productId).lean();
      if (!product) throw new Error("Product not found while updating");

      const deductBaseQty = await calculateBaseQty(
        {
          skuId: it.skuId,
          isLoose: it.isLoose,
          looseUnit: it.looseUnit,

          quantity: it.quantity,
        },
        product,
        inv,
      );

      const remainingWeight =
        Number(inv.remainingWeight || 0) - Number(deductBaseQty);
      if (remainingWeight < 0) throw new Error("Stock underflow");

      await inventoryModel.updateOne(
        { _id: inv._id },
        {
          $set: {
            remainingWeight: Number(remainingWeight.toFixed(3)),
            remainingPacks:
              Number(inv.unitWeight || 0) > 0
                ? Number((remainingWeight / Number(inv.unitWeight)).toFixed(3))
                : 0,
            lastUpdated: new Date(),
          },
        },
        { session },
      );
    }

    // =====================================================
    //  STEP 5: UPDATE SALE DOCUMENT
    // =====================================================
    existingSale.saleType = effectiveSaleType;
    existingSale.billType = billType;
    existingSale.paymentMethod = paymentMethod;
    existingSale.customerId = customerId;
    existingSale.items = processedItems;

    existingSale.grossTotal = grossTotal;
    existingSale.discount = discount;

    existingSale.handlingCharges = includeHandling ? handlingCharges : [];
    existingSale.handlingTotal = handlingTotal;

    existingSale.netTotal = netTotal;
    existingSale.paidAmount = paid;
    existingSale.balanceAmount = balanceAmount;

    existingSale.includeTransport = includeTransport;
    existingSale.transportDetails = includeTransport ? transportDetails : null;

    await existingSale.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Sale updated successfully",
      sale: existingSale,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Update sale error:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
};
