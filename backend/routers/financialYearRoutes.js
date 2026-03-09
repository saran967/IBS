import { Router } from "express";
const router = Router();

import {
    getAllFinancialYears,
    createFinancialYear,
    activateFinancialYear,
    deleteFinancialYear,
} from "../controller/financialYearController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

router.use(authMiddleware);

router.route("/").get(getAllFinancialYears).post(createFinancialYear);
router.route("/:id/activate").patch(activateFinancialYear);
router.route("/:id").delete(deleteFinancialYear);

export default router;
