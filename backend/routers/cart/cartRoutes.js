import express from "express";
import { addToCart, clearCart, decrementItem, getCart, incrementItem, removeFromCart } from "../../controller/cart/cartController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware,getCart);
router.post("/add",authMiddleware, addToCart);
router.delete("/remove/:productId", authMiddleware,removeFromCart);
router.patch("/increment/:productId", authMiddleware,incrementItem);
router.patch("/decrement/:productId",authMiddleware, decrementItem);
router.delete("/clear", authMiddleware , clearCart);

export default router;