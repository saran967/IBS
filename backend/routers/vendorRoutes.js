import express from "express";
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} from "../controller/vendorController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all vendor routes
router.use(authMiddleware);

// Read
router.get("/", getVendors);
router.get("/:id", getVendorById);

// Write (admin/subadmin)
router.post("/", (req, res, next) => {
  if (!["admin", "subadmin", "superadmin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  next();
}, createVendor);

router.put("/:id", (req, res, next) => {
  if (!["admin", "subadmin", "superadmin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  next();
}, updateVendor);

router.delete("/:id", (req, res, next) => {
  if (!["admin", "superadmin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Not authorized" });
  }
  next();
}, deleteVendor);

export default router;
