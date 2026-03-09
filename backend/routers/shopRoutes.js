import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createShop,
  getAllShops,
  getShopById,
  deleteShop,
  updateShop,
  toggleShopDelivery,
} from "../controller/shopController.js";

const router = express.Router();

router.post("/", authMiddleware, createShop);
router.get("/", authMiddleware, getAllShops);
router.get("/:id", authMiddleware, getShopById);
router.delete("/:id", authMiddleware, deleteShop);
router.patch("/:id", authMiddleware, updateShop);
router.patch("/delivery-toggle", authMiddleware, toggleShopDelivery);
export default router;
