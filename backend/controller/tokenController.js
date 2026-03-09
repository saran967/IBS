import mongoose from "mongoose";
import TokenSale from "../models/tokenSaleModel.js";
import Sale from "../models/salesModel.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../Error/customError.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";


// export const createTokenFromSale = async (req, res) => {
//   try {
//     const { saleId, pickupDate, notes } = req.body;

//     if (!saleId) throw new BadRequestError("Sale ID is required");

//     const sale = await Sale.findById(saleId)
//       .populate("customerId")
//       .populate("items.productId")
//       .populate("items.shopId")
//       .populate("createdByShop");

//     if (!sale) throw new NotFoundError("Sale not found");

//     const existingToken = await TokenSale.findOne({ saleRef: saleId });
//     if (existingToken)
//       return res.status(StatusCodes.CONFLICT).json({
//         success: false,
//         message: "Token already created for this sale",
//         token: existingToken,
//       });
// // Allow today; block only past dates (yesterday & older)
// if (pickupDate) {
//   const selected = new Date(pickupDate);
//   const today = new Date();

//   // Normalize today's date to midnight
//   today.setHours(0, 0, 0, 0);

//   if (selected < today) {
//     throw new BadRequestError("Pickup date cannot be in the past");
//   }
// }


//     const tokenNumber = `TOK-${new Date().getFullYear()}-${Math.floor(
//       1000 + Math.random() * 9000
//     )}`;

//     const tokenItems = sale.items.map((item) => ({
//       productId: item.productId,
//       productName: item.productName,
//       quantity: item.quantity,
//       unit: item.unit,
//       tentativePrice: item.sellingPrice * item.quantity,
//     }));
//     const createdBy = req.user.userId;
//     const token = await TokenSale.create({
//       shopId: sale.items[0].shopId,
//       customerId: sale.customerId,
//       saleRef: sale._id,
//       tokenNumber,
//       items: tokenItems,
//       status: "PENDING",
//       pickupDate,
//       createdBy: createdBy,
//       notes: notes || `Pickup for invoice ${sale.invoiceNumber}`,
//     });

//     res.status(StatusCodes.CREATED).json({
//       success: true,
//       message: "Pickup token created successfully",
//       token,
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


export const createTokenFromSale = async (req, res) => {
  try {
    const activeFY = await getActiveFinancialYear();
    const { saleId, pickupDate, notes } = req.body;

    if (!saleId) {
      throw new BadRequestError("Sale ID is required");
    }

    const sale = await Sale.findOne({
      _id: saleId,
      financialYearId: activeFY._id,
    })
      .populate("customerId")
      .populate("items.productId")
      .populate("items.shopId")
      .populate("items.godownId")
      .populate("createdByShop");

    if (!sale) {
      throw new NotFoundError("Sale not found");
    }

    if (!sale.items || sale.items.length === 0) {
      throw new BadRequestError("Sale has no items");
    }

    // Prevent duplicate token
    const existingToken = await TokenSale.findOne({ saleRef: saleId });
    if (existingToken) {
      return res.status(409).json({
        success: false,
        message: "Token already created for this sale",
        token: existingToken,
      });
    }

    /* -------- PICKUP DATE (TIMEZONE SAFE) -------- */
    if (pickupDate) {
      const selected = new Date(pickupDate);
      const today = new Date();

      const selectedDateOnly = new Date(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );

      const todayDateOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      if (selectedDateOnly < todayDateOnly) {
        throw new BadRequestError("Pickup date cannot be in the past");
      }
    }

    /* -------- RESOLVE SHOP ID -------- */
    let resolvedShopId = sale.items[0].shopId;

    // ISB / GODOWN SALE
    if (!resolvedShopId && sale.items[0].godownId) {
      resolvedShopId = sale.items[0].godownId.shopId;
    }

    if (!resolvedShopId) {
      throw new BadRequestError("Unable to determine shop for this sale");
    }

    /* -------- TOKEN NUMBER -------- */
    const tokenNumber = `TOK-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    /* -------- TOKEN ITEMS -------- */
    const tokenItems = sale.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      tentativePrice: item.sellingPrice * item.quantity,
    }));

    const token = await TokenSale.create({
      financialYearId: activeFY._id,
      shopId: resolvedShopId,
      godownId: sale.items[0].godownId || null,
      customerId: sale.customerId,
      saleRef: sale._id,
      tokenNumber,
      items: tokenItems,
      status: "PENDING",
      pickupDate,
      createdBy: req.user.userId,
      notes: notes || `Pickup for invoice ${sale.invoiceNumber}`,
    });

    res.status(201).json({
      success: true,
      message: "Pickup token created successfully",
      token,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const fulfillToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    const token = await TokenSale.findOne({ tokenNumber });
    if (!token) throw new NotFoundError("Token not found");
    if (token.status !== "PENDING")
      throw new BadRequestError("Token already fulfilled or cancelled");

    token.status = "FULFILLED";
    await token.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Goods handed over successfully",
      token,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};


export const cancelToken = async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    const token = await TokenSale.findOne({ tokenNumber });
    if (!token) throw new NotFoundError("Token not found");
    if (token.status !== "PENDING")
      throw new BadRequestError("Only pending tokens can be cancelled");

    token.status = "CANCELLED";
    await token.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Token cancelled successfully",
      token,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTokenByNumber = async (req, res) => {
  try {
    const { tokenNumber } = req.params;

    const token = await TokenSale.findOne({ tokenNumber }).populate(
      "shopId godownId customerId saleRef items.productId"
    );

    if (!token) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Token not found",
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      token,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
