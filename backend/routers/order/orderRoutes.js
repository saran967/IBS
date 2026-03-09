

import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from "../../controller/order/orderController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();


router.post("/create", authMiddleware, createOrder);
router.get("/my-orders", authMiddleware, getMyOrders);



router.get("/get", authMiddleware, getAllOrders);
router.patch("/status/:orderId", authMiddleware, updateOrderStatus);

export default router;
