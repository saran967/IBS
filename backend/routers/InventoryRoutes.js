import express from "express";
import {
  adjustInventory,
  deleteInventory,
  getAllInventory,
  getAvailableStockForSales,
  getInventoryByProduct,
  getProductStock,
  getProductStockSummary,
  getLowStockReport,
  getBatchesForProduct,
  addFreeStock,
} from "../controller/inventoryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all inventory routes
router.use(authMiddleware);

router.get("/", getAllInventory);
router.get("/stock/sales", getAvailableStockForSales);
router.get("/batches", getBatchesForProduct);
router.get("/reports/low-stock-report", getLowStockReport);

router.get("/:productId", getInventoryByProduct);
router.get("/summary/:productId", getProductStockSummary);
router.post("/adjust", adjustInventory);
router.post("/add-free-stock", addFreeStock);
router.get("/stock/:shopId/:productId", getProductStock);
router.delete("/:id", deleteInventory);

export default router;
