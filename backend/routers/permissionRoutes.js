import express from "express";
import {
  assignPermissions, // POST → assign/update permissions to a user
  getAllPermissionModules, // GET → fetch master list of all modules
  getAllPermissions, // GET → fetch all user permission mappings (optional)
  getUserPermissions,
  updateUserPermissions, // GET → fetch one user’s permissions
} from "../controller/permissionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/assign", authMiddleware, assignPermissions);


router.get("/master", authMiddleware, getAllPermissionModules);


router.get("/", authMiddleware, getAllPermissions);


router.get("/user/:userId", authMiddleware, getUserPermissions);

router.put("/update", authMiddleware, updateUserPermissions);

export default router;
