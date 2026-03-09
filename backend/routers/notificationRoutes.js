import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getNotifications,
  markNotificationRead,
  clearAllNotifications,
} from "../controller/notificationController.js";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.post("/mark-read", authMiddleware, markNotificationRead);
router.post("/clear-all", authMiddleware, clearAllNotifications);

export default router;
