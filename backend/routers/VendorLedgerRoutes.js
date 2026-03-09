import express from "express";
import {
  vendorSummaryPie,
  vendorProductBar,
  vendorTopProducts,
  getVendorLedger,
  vendorSummaryPieSingle,
  vendorProductBarSingle,
  createVendorPayment,
  listVendorPayments,
} from "../controller/VendorLedgerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/summary-pie", vendorSummaryPie);
router.get("/vendor-product-bar", vendorProductBar);
router.get("/top-products", vendorTopProducts);
router.get("/vendor-ledger", getVendorLedger);
router.post("/vendor-payments", createVendorPayment);
router.get("/vendor-payments", listVendorPayments);
router.get("/summary-pie/single", vendorSummaryPieSingle);
router.get("/vendor-product-bar/single", vendorProductBarSingle);

export default router;
