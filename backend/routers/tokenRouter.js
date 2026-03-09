import express from "express";
import {
  cancelToken,
  createTokenFromSale,
  fulfillToken,
  getTokenByNumber,
} from "../controller/tokenController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create token from a completed sale
router.post("/create", authMiddleware, createTokenFromSale);

// Fulfill token when customer picks up goods
router.put("/fulfill/:tokenNumber", fulfillToken);

// Cancel token if customer cancels pickup
router.put("/cancel/:tokenNumber", cancelToken);

// Get token by token number
router.get("/:tokenNumber/print", getTokenByNumber);

export default router;
