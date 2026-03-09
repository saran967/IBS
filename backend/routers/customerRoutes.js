
import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  addCompanyToCustomer,
  deleteCompanyFromCustomer,
  getCustomerLedger,
  recordCustomerPayment,
  getCustomerPaymentHistory,
  downloadPaymentReceipt,
  registerCustomer,
  updateCustomerCompany,
  loginCustomer,
  createAgent,
  logout,
  getCustomerProfile,
  editCustomerCompany,
  saveFcmToken,
} from "../controller/customerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateEmployeeCreation } from "../middleware/validationMiddleware.js";
import { checkAccess } from "../middleware/checkAccessmiddleware.js";

const router = express.Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/logout", logout);


router.use(authMiddleware);

router.patch("/update-company", updateCustomerCompany);
router.get("/get", getCustomerProfile);
router.patch("/company/:companyId", editCustomerCompany);

router.post(
  "/agent",
  checkAccess(["admin"], null, null),
  createAgent
);


router.post("/", createCustomer);
router.get("/", getAllCustomers);
router.get("/:id", getCustomerById);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);


router.post("/:id/company", addCompanyToCustomer);
router.delete("/:customerId/company/:companyId", deleteCompanyFromCustomer);

router.get("/:id/ledger", getCustomerLedger);


router.post("/payment", recordCustomerPayment);


router.get("/:id/payment-history", getCustomerPaymentHistory);


router.get("/payment/:paymentId/receipt", downloadPaymentReceipt);

router.post("/save-fcm-token", saveFcmToken);

export default router;
