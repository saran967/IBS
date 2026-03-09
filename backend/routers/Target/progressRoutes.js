import express from "express";
import {
  getAgentDailyProgress,
  getAllAgentsDailyProgress,
  getDailyTargetReport,
  getMonthlyTargetReport,
  getProgressByDate,
} from "../../controller/Target/agentProgress.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";

const router = express.Router();

// single agent
router.get("/agent", authMiddleware, getAgentDailyProgress);

// admin - all agents
router.get("/all", getAllAgentsDailyProgress);
router.get("/all/:date", getProgressByDate);
router.get("/monthly-report", getMonthlyTargetReport);
router.get("/daily-report", getDailyTargetReport);

export default router;
