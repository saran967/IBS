import express from "express";
import multer from "multer";
import {
  bulkUploadProducts,
  createProduct,
  deleteProduct,
  enableTheCategory,
  getAllCategories,
  getAllProductPriceHistory,
  getAllProducts,
  getAllProductsForMobile,
  getAllUnits,
  getProductByBarcode,
  getProductByCode,
  getProductById,
  getProductPriceHistory,
  getSelectedPriceHistory,
  searchProducts,
  searchProductsByCategory,
  toggleDeliveryStatus,
  toggleInventoryStatus,
  updateProduct,
} from "../controller/productController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer memory storage for Cloudinary upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create product
router.post("/", authMiddleware, upload.array("images"), createProduct);

router.get("/search", searchProducts);

router.post(
  "/bulk-upload",
  authMiddleware,
  upload.single("file"),
  bulkUploadProducts,
);

// Get all products
router.get("/", getAllProducts);
router.get("/get", getAllProductsForMobile);

// Product lookups
router.get("/barcode/:code", getProductByBarcode);
router.get("/code/:productCode", getProductByCode);

router.get("/categories", getAllCategories);
router.get("/units", getAllUnits);

// Enable delivery by category
router.patch("/category/enable-delivery", enableTheCategory);

// Price history
router.get("/price-history/all", getAllProductPriceHistory);
router.get("/:id/price-history", getProductPriceHistory);

// Toggle delivery & inventory
router.patch("/:id/enable-delivery", toggleDeliveryStatus);
router.patch("/:id/maintain-inventory", toggleInventoryStatus);
router.get("/searchByCategory", searchProductsByCategory);

// Get single product
router.get("/:id", getProductById);

// Update product (with auth & file upload)
router.patch("/:id", authMiddleware, upload.array("images"), updateProduct);

// Delete product
router.delete("/:id", authMiddleware, deleteProduct);

router.post("/price-history/selected", getSelectedPriceHistory);

export default router;
