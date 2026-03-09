import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { checkAccess } from "../middleware/checkAccessmiddleware.js";
import {
  createEmployee,
  getEmployees,
  createAdmin,
  createShopWithSubAdmin,
  getAllSubAdmins,
  updateSubAdmin,
  deleteSubAdmin,
  updateEmployee,
  deleteEmployee,
  getAllUsers,
} from "../controller/userController.js";
import {
  validateAdminCreation,
  validateEmployeeCreation,
  validateShopSubAdminCreation,
} from "../middleware/validationMiddleware.js";

const router = express.Router();


router.post(
  "/subadmin",
  authMiddleware,
  checkAccess(["admin"], null, null), 
  validateShopSubAdminCreation,
  createShopWithSubAdmin
);


router.post(
  "/employee",
  authMiddleware,
  checkAccess(["admin", "subadmin"], null, null), 
  validateEmployeeCreation,
  createEmployee
);


router.get(
  "/employees",
  authMiddleware,
  // checkAccess(["admin", "subadmin"], "employees", "read"),
  getEmployees
);
router.put("/employee/:id", authMiddleware, updateEmployee);
router.delete("/employee/:id", authMiddleware, deleteEmployee);


router.post(
  "/admin",
  authMiddleware,
  checkAccess(["superadmin"], null, null),
  validateAdminCreation,
  createAdmin
);
router.get("/subadmins", authMiddleware, getAllSubAdmins);
router.put("/subadmin/:id", authMiddleware, updateSubAdmin);
router.delete("/subadmin/:id", authMiddleware, deleteSubAdmin);
router.get(
  "/",
  authMiddleware,
  // checkAccess(["superadmin", "admin"], null, null),
  getAllUsers
);

export default router;
