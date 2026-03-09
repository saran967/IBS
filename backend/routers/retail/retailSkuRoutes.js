import express from "express";
import {
  getSKUsByProduct,
  createSKU,
  deleteSKU,
  updateSKU,
} from "../../controller/retail/retailSkuController.js";

const router = express.Router();

router.post("/", createSKU);


router.get("/product/:productId", getSKUsByProduct);


router.put("/:id", updateSKU);


router.delete("/:id", deleteSKU);

export default router;