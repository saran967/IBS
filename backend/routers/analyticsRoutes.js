import express from "express";
import { getSalesSummary } from "../controller/analyticsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/sales-summary", getSalesSummary);

export default router;
