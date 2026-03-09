import express from "express";
import {
    createQuotation,
    getAllQuotations,
    getQuotationById,
    deleteQuotation,
} from "../controller/quotationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, createQuotation);
router.get("/", authMiddleware, getAllQuotations);
router.get("/:id", authMiddleware, getQuotationById);
router.delete("/:id", authMiddleware, deleteQuotation);

export default router;
