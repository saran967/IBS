import express from "express";
import {
  createOffer,
  getOffers,
  updateOffer,
  deleteOffer,
  getActiveOffers,
} from "../../controller/offer/offerController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Admin Routes
router.post("/create", authMiddleware, createOffer);
router.get("/", getOffers);
router.put("/:id", updateOffer);
router.delete("/:id", deleteOffer);

// User Side - Active Offers
router.get("/active", getActiveOffers);

export default router;
