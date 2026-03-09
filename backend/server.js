import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
const app = express();
import * as dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import cors from "cors";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
import { setLanguage } from "./middleware/languageMiddleware.js";



app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(setLanguage);
const port = process.env.PORT || 5000;

import UserRouter from "./routers/userRoutes.js";
import AuthRouter from "./routers/authRoutes.js";
import ShopRouter from "./routers/shopRoutes.js";
import purchaseRouter from "./routers/purchaseRoutes.js";
import productRouter from "./routers/productRoutes.js";
import inventoryRouter from "./routers/InventoryRoutes.js";
import productPackRouter from "./routers/productPackRoutes.js";
import customerRouter from "./routers/customerRoutes.js";
import salesRouter from "./routers/salesRoutes.js";
import tokenRouter from "./routers/tokenRouter.js";
import stockTransferRouter from "./routers/stockTransferRoutes.js";
import orderRouter from "./routers/orderRoutes.js";
import vendorRouter from "./routers/vendorRoutes.js";
import permissionRouter from "./routers/permissionRoutes.js";
import analyticsRouter from "./routers/analyticsRoutes.js";
import vendorLedgerRouter from "./routers/VendorLedgerRoutes.js";
import purchaseLedgerRouter from "./routers/ledgerRoutes/purchaseLedgerRoutes.js";
import salesLedgerRouter from "./routers/ledgerRoutes/salesLedgerRoutes.js";
import notificationRouter from "./routers/notificationRoutes.js";
import productLedgerRouter from "./routers/ledgerRoutes/productLedgerRoutes.js";
import vendorAnalyticsRouter from "./routers/VendorLedgerRoutes.js";
import GodownRouter from "./routers/godownRoutes.js";
import retailSkuRoutes from "./routers/retail/retailSkuRoutes.js";
import dashboardRouter from "./routers/dashboardRoutes.js";
import './services/ledgerWorker.js'

import cartRoutes from "./routers/cart/cartRoutes.js";
import orderRoutes from "./routers/order/orderRoutes.js";
import trackingRouter from "./routers/locationTracking/tracking.js";
import progressRoutes from "./routers/Target/progressRoutes.js";
import targetRoutes from "./routers/Target/targetRoutes.js";
import offerRoutes from "./routers/offer/offerRoutes.js";
import offerExpiryCheck from "./controller/Target/cron/offerExpiryCheck.js";
import scheduleDailyReset from "./controller/Target/cron/resetDailyTask.js";
import wishlistRoutes from "./routers/wishlist/wishlistRoutes.js";

import incentiveRoutes from "./routers/Target/incentiveRoutes.js";
import otpRoutes from "./routers/otpRoutes.js";
import financialYearRouter from "./routers/financialYearRoutes.js";

import errorHandlerMiddleware from "./middleware/errorHandlerMiddleware.js";

app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/users", UserRouter);
app.use("/api/v1/shops", ShopRouter);
app.use("/api/v1/purchase", purchaseRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/product-packs", productPackRouter);
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/token", tokenRouter);
app.use("/api/v1/stock-transfer", stockTransferRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/vendors", vendorRouter);
app.use("/api/v1/vendorsLedger", vendorLedgerRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/customer-analytics", analyticsRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/retail-skus", retailSkuRoutes);

app.use("/api/v1/purchase-ledger", purchaseLedgerRouter);
app.use("/api/v1/sales-ledger", salesLedgerRouter);
app.use("/api/v1/analytics", productLedgerRouter);
app.use("/api/v1/vendoranalytics", vendorAnalyticsRouter);
app.use("/api/v1/godowns", GodownRouter);
app.use("/api/v1/dashboard", dashboardRouter);

app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/location", trackingRouter);
app.use("/api/v1/offer", offerRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/target", targetRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);

app.use("/api/v1/incentive", incentiveRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/financial-years", financialYearRouter);

app.use(errorHandlerMiddleware);

const CRON_EXPR = process.env.DAILY_RESET_CRON || "0 6 * * *";

try {
  await mongoose.connect(process.env.MONGO_URL);
  app.listen(port, () => {
    console.log(`server running on PORT ${port}....`);
    scheduleDailyReset(CRON_EXPR);
    offerExpiryCheck();
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}
