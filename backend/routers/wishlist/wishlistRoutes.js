import express from "express";
import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../../controller/wishlist/wishlistController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Add product
router.post("/add", authMiddleware, addToWishlist);

// Get wishlist by customer
router.get("/", authMiddleware, getWishlist);

// Remove product
router.post("/remove", authMiddleware, removeFromWishlist);

// Clear wishlist
router.delete("/clear/:customerId", clearWishlist);

export default router;
