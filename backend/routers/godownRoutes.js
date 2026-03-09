import express from "express";
import {
  createGodown,
  getAllGodowns,
  getGodownsByShop,
  updateGodown,
  deleteGodown,
} from "../controller/godownController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

router.post("/", createGodown);
router.get("/", getAllGodowns);
router.get("/shop/:shopId", getGodownsByShop);
router.patch("/:id", updateGodown);
router.delete("/:id", deleteGodown);

export default router;