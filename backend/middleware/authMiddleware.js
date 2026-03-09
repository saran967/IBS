import { verifyJWT } from "../utils/tokenutils.js";
import { UnauthenticatedError } from "../Error/customError.js";
import User from "../models/userModel.js";
import Customer from "../models/customerModel.js";

export const authMiddleware = async (req, res, next) => {
  let token = null;

  //  Cookie
  if (req.cookies?.token) {
    token = req.cookies.token;
  }

  //  Authorization header
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new UnauthenticatedError("Authentication token missing");
  }

  try {
    const { userId, role } = verifyJWT(token);

    let account = null;
    let accountType = null;

    /* ============================
       🔍 1. CHECK USER COLLECTION
       ============================ */
    account = await User.findById(userId).select(
      "name role shopId godownId isActive permissions",
    );

    if (account) {
      if (!account.isActive) {
        throw new UnauthenticatedError("User account is inactive");
      }

      accountType = "USER";

      req.user = {
        userId: account._id,
        name: account.name?.en || "Unknown User",
        role: account.role, // superadmin | admin | subadmin | user
        shopId: account.shopId || null,
        godownId: account.godownId || null,
        accountType,
        permissions: account.permissions || [],

      };

      req.admin = req.user; // admin alias
      return next();
    }

    /* ==============================
       🔍 2. CHECK CUSTOMER COLLECTION
       ============================== */
    account = await Customer.findById(userId).select(
      "customerName customerType shopId isMobileVerified",
    );

    if (account) {
      accountType = "CUSTOMER";

      req.user = {
        userId: account._id,
        name: account.customerName?.en || "Unknown Customer",
        role: account.customerType, // B2C | B2B | agent
        shopId: account.shopId || null,
        accountType,
      };

      return next();
    }

    /* =====================
       ❌ NEITHER FOUND
       ===================== */
    throw new UnauthenticatedError("User not found");
  } catch (error) {
    console.error("AUTH ERROR:", error.message);
    throw new UnauthenticatedError("Authentication token expired or invalid");
  }
};
