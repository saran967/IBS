import express from "express";
import {
  getMonthlyPurchaseSummary,
  getPurchaseLedger,
  getPurchasePaymentSummary,
  getVendorOutstanding,
  getVendorSummary,
} from "../../controller/ledgers/purchaseLedgerController.js";

const router = express.Router();

router.get("/", getPurchaseLedger);
router.get("/summary/monthly", getMonthlyPurchaseSummary);
router.get("/summary/vendor", getVendorSummary);
router.get("/summary/payments", getPurchasePaymentSummary);
router.get("/summary/outstanding", getVendorOutstanding);

export default router;
