import express from "express";
import {
  createOrder,
  confirmOrder,
  cancelOrder,
  getOrders,
  // other existing exports...
  approveOrderRequest,
  editPickupDate,
  getPendingOrderItems,
  attemptFulfillPending,
  getOrderById,
} from "../controller/orderController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// create
router.post("/", authMiddleware, createOrder);

// admin approves a request
router.put("/:orderId/approve", authMiddleware, approveOrderRequest);

// edit pickup date (admin or creator)
router.patch("/:orderId/pickup-date", authMiddleware, editPickupDate);

// confirm/cancel/others
router.put("/:orderId/confirm", authMiddleware, confirmOrder);
router.put("/:orderId/cancel", authMiddleware, cancelOrder);

// get orders (role-aware)
router.get("/", authMiddleware, getOrders);

// pending items and attempt fulfill (keep)
router.get("/pending/items", authMiddleware, getPendingOrderItems);
router.post("/pending/attempt-fulfill", authMiddleware, attemptFulfillPending);

router.get("/:orderId", getOrderById);

export default router;
