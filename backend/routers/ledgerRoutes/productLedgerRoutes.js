import express from "express";
import {
  getOverallLedger,
  getProductLedgerFor,
} from "../../controller/ledgers/productLedgerController.js";
const router = express.Router();

router.get("/summary", getProductLedgerFor);
router.get("/ledger", getOverallLedger);

export default router;
