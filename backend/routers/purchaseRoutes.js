import express from "express";
import {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
} from "../controller/purchaseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { checkAccess } from "../middleware/checkAccessmiddleware.js";

const router = express.Router();

// Apply authentication for all purchase routes
router.use(authMiddleware);

// CREATE — only admin/subadmin
router.post(
  "/",
  checkAccess(["admin", "subadmin"], "purchase", "create"),
  createPurchase,
);

// READ ALL — admin, subadmin, employee can view
router.get(
  "/",
  // checkAccess(["admin", "subadmin", "employee"], "purchase", "read"),
  getAllPurchases,
);

// READ ONE — same read access
router.get(
  "/:id",
  // checkAccess(["admin", "subadmin", "employee"], "purchase", "read"),
  getPurchaseById,
);

// UPDATE — only admin/subadmin
router.put(
  "/:id",
  checkAccess(["admin", "subadmin"], "purchase", "update"),
  updatePurchase,
);

// DELETE — only admin/subadmin
router.delete(
  "/:id",
  checkAccess(["admin", "subadmin"], "purchase", "delete"),
  deletePurchase,
);

export default router;
