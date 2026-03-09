// routes/authRoutes.js
import express from "express";
import {
  login,
  createSuperAdmin,
  logout,
  checkAuth,
  currentUser,
} from "../controller/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/login", login);
router.post("/logout", logout);
router.get("/checkAuth", authMiddleware, checkAuth);

router.post("/superadmin", createSuperAdmin);


router.get("/current-user", authMiddleware, currentUser);

export default router;
