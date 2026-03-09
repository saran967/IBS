import express from "express";
import {
  createSale,
  getAllSales,
  getSaleById,
  deleteSale,
  getSalesByCustomer,
  updateSale,
} from "../controller/SalesController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

//  Create Sale
router.post("/", authMiddleware, createSale);

//  Get All Sales (paginated + filters)
router.get("/", authMiddleware, getAllSales);

// router.get("/customer/:customerId", getSalesByCustomer);
router.get("/customer/:customerId", authMiddleware, getSalesByCustomer);

//  Get Single Sale by ID
router.get("/:id", authMiddleware, getSaleById);
router.patch("/:id", authMiddleware, updateSale);

//  Delete Sale
router.delete("/:id", authMiddleware, deleteSale);

export default router;
