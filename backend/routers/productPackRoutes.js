import express from "express";
import {
  classifyStock,
  deleteProductPack,
  getAllProductPacks,
  getPacksByProduct,
  updateProductPack,
} from "../controller/productPackController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, classifyStock);
router.get("/", getAllProductPacks);
router.get("/:productId", getPacksByProduct);
router.patch("/:id", updateProductPack);
router.delete("/:id", deleteProductPack);

export default router;
