import express from "express";
import {
  getCustomerOutstanding,
  getCustomerSummary,
  getMonthlySalesSummary,
  getSalesLedger,
  getSalesPaymentSummary,
} from "../../controller/ledgers/salesLedgerController.js";

const router = express.Router();

router.get("/", getSalesLedger);
router.get("/summary/monthly", getMonthlySalesSummary);
router.get("/summary/customer", getCustomerSummary);
router.get("/summary/payments", getSalesPaymentSummary);
router.get("/summary/outstanding", getCustomerOutstanding);

export default router;
