import express from "express";
import {
  createIncentive,
  getDailyIncentives,
  getDailyIncentivesforUser,
  getMonthlyIncentives,
  updateIncentive,
} from "../../controller/Target/incentiveController.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", createIncentive);

router.get("/daily", getDailyIncentives);

router.get("/monthly", getMonthlyIncentives);

router.patch("/update", updateIncentive);

router.get("/user", authMiddleware, getDailyIncentivesforUser);

export default router;
