import express from "express";
import {
  transferStock,
  getTransfers,
  approveTransfer,
  getPendingTransfers,

  cancelTransfer,
} from "../controller/stocktransferController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/transfer", authMiddleware, transferStock);
router.get("/transfers", authMiddleware, getTransfers);

router.post("/approve/:id" , authMiddleware, approveTransfer);

router.post("/cancel/:id",  authMiddleware, cancelTransfer);

router.get("/pending", authMiddleware, getPendingTransfers);




export default router;
