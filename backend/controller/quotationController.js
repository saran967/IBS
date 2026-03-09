import { StatusCodes } from "http-status-codes";
import Quotation from "../models/quotationModel.js";
import Customer from "../models/customerModel.js";
import Shop from "../models/shopModel.js";
import Product from "../models/productModel.js";
import SKU from "../models/retail/RetailProductSkumodel.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";
import mongoose from "mongoose";

const cleanObjectId = (val) => {
    if (!val || val === "") return undefined;
    return val;
};

const getBaseUnitObject = (product) => {
    const base = product?.baseUnitType || "G";
    return { en: base, ta: base };
};

export const createQuotation = async (req, res) => {
    try {
        const activeFY = await getActiveFinancialYear();

        const {
            customerId,
            saleType,
            billType = "GST",
            items = [],
            discount = 0,
            priceTier = "R"
        } = req.body;

        const customer = await Customer.findById(customerId);
        if (!customer) throw new Error("Customer not found");

        const effectiveSaleType = saleType || customer.customerType || "B2C";

        const processedItems = [];

        for (const it of items) {
            const product = await Product.findById(it.productId).lean();
            if (!product) throw new Error("Product not found");

            const quantity = Number(it.quantity || 0);
            if (quantity <= 0) throw new Error("Invalid quantity");

            let sellingPrice = Number(it.sellingPrice ?? product.sellingPrice ?? 0);

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

        const grossTotal = processedItems.reduce((s, i) => s + Number(i.total), 0);
        const netTotal = grossTotal - Number(discount || 0);

        const quotationDate = new Date();
        const dueDate = new Date(quotationDate);
        dueDate.setDate(quotationDate.getDate() + Number(customer.dueDays || 0));

        const quotation = new Quotation({
            financialYearId: activeFY._id,
            saleType: effectiveSaleType,
            billType,
            priceTier,
            customerId,
            dueDate,

            items: processedItems,

            grossTotal,
            discount,
            netTotal,

            createdBy: req.user?.userId,
            createdByRole: req.user?.role,
            createdByShop: req.user?.shopId,
        });

        await quotation.save();

        return res.status(201).json({ success: true, quotation });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllQuotations = async (req, res) => {
    try {
        const activeFY = await getActiveFinancialYear();
        if (!activeFY) {
            return res.status(200).json({ success: true, data: [], total: 0 });
        }

        const {
            page = 1,
            limit = 10,
            saleType,
            customerId,
            search,
            startDate,
            endDate,
        } = req.query;

        const query = { financialYearId: activeFY._id };

        if (saleType) query.saleType = saleType;
        if (customerId) query.customerId = customerId;

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        if (search && search.trim() !== "") {
            const regex = new RegExp(search.trim(), "i");
            const matchedCustomers = await Customer.find({ customerName: regex }, "_id");
            const customerIds = matchedCustomers.map((c) => c._id);

            query.$or = [
                { customerId: { $in: customerIds } },
                { quotationNumber: regex }
            ];
        }

        const skip = (page - 1) * limit;
        const total = await Quotation.countDocuments(query);
        const quotations = await Quotation.find(query)
            .populate("customerId", "customerName customerType")
            .populate("createdBy", "username role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            data: quotations,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getQuotationById = async (req, res) => {
    try {
        const activeFY = await getActiveFinancialYear();
        const quotation = await Quotation.findOne({
            _id: req.params.id,
            financialYearId: activeFY._id,
        })
            .populate("customerId", "customerName customerType phone address")
            .populate("items.productId", "name category unit hsnCode")
            .populate("createdBy", "username role");

        if (!quotation) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Quotation not found" });
        }

        res.status(StatusCodes.OK).json({ success: true, data: quotation });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

export const deleteQuotation = async (req, res) => {
    try {
        const activeFY = await getActiveFinancialYear();
        const quotation = await Quotation.findOneAndDelete({
            _id: req.params.id,
            financialYearId: activeFY._id
        });

        if (!quotation) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Quotation not found" });
        }

        res.status(StatusCodes.OK).json({ success: true, message: "Quotation deleted" });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};
