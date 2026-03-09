import express from "express";
import {
  sendRegisterOtp,
  verifyRegisterOtp,
} from "../controller/otpController.js";

const router = express.Router();

// routes/otpRoutes.js
router.post("/register/send-otp", sendRegisterOtp);
router.post("/register/verify-otp", verifyRegisterOtp);

export default router;
