// backend/routers/locationTracking/tracking.js
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import {
  getActiveRoute,
  getCurrentRoutePath,
  getRouteHistory,
  getRoutes,
  pushRoutePath,
  startTracking,
  stopTracking,
  uploadShop
} from "../../controller/Location/trackingController.js";
import multer from "multer";

const router = express.Router();
const upload = multer();

router.post("/start", authMiddleware, startTracking);
router.post("/push", authMiddleware, pushRoutePath);
router.post("/stop", authMiddleware, stopTracking);
router.post('/upload', authMiddleware, upload.single("image"),uploadShop)
router.get("/all", authMiddleware, getRoutes);
router.get("/active", authMiddleware, getActiveRoute);
router.get("/current", authMiddleware, getCurrentRoutePath);
router.get("/history/:id", authMiddleware, getRouteHistory);

export default router;