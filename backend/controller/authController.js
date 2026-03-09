import User from "../models/userModel.js";
import { hashPassword, comparePassword } from "../utils/passwordUtils.js";
import { createJwt, verifyJWT } from "../utils/tokenutils.js";
import { StatusCodes } from "http-status-codes";
import Permission from "../models/permissionsModel.js"; // or wherever assigned permissions are stored

export const login = async (req, res) => {
  try {
    const { email, password, key } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "Invalid credentials" });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ msg: "Invalid credentials" });
    }

    //  Superadmin key validation
    if (user.role === "superadmin") {
      if (key !== process.env.SUPERADMIN_KEY) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ msg: "Invalid superadmin key" });
      }
    }

    //  Generate JWT
    // const token = createJwt({ userId: user._id, role: user.role });
    const normalizedRole = user.role.replace(/-/g, "").toLowerCase();

    const token = createJwt({
      userId: user._id,
      role: normalizedRole,
      shopId: user.shopId,
    });

    //  Determine permissions
    let permissions = [];

    if (user.role === "admin" || user.role === "superadmin") {
      // Grant all permissions from master
      const allModules = await Permission.find().select("module -_id");
      permissions = allModules.map((m) => m.module);
    } else {
      // Use user’s assigned permissions
      permissions = user.permissions || [];
    }

    //  Send response
    res
      .status(StatusCodes.OK)
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      })
      .json({
        msg: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          shopId: user.shopId,
        },
        permissions, //  added
        token,
      });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err.message });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logout successful" });
};

export const checkAuth = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "No token found" });
    }

    const decoded = verifyJWT(token);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid token or user not found" });
    }

    //  return user details
    return res.status(200).json({ user });
  } catch (error) {
    console.error("checkAuth error:", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const createSuperAdmin = async (req, res) => {
  try {
    const { name, email, password, key } = req.body;

    if (key !== process.env.CREATE_SUPERADMIN_KEY) {
      return res.status(StatusCodes.FORBIDDEN).json({ msg: "Forbidden" });
    }

    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Superadmin already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const superadmin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "superadmin",
      createdBy: null,
      isActive: true,
    });

    return res.status(StatusCodes.CREATED).json({
      msg: "Superadmin created successfully",
      user: {
        id: superadmin._id,
        name: superadmin.name,
        email: superadmin.email,
        role: superadmin.role,
      },
    });
  } catch (err) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: err.message });
  }
};

export const currentUser = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "No token found" });
    }

    const decoded = verifyJWT(token);
    const user = await User.findById(decoded.userId)
      .select("-password")
      .populate("shopId", "name")
      .populate("godownId", "name");

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or invalid token" });
    }

    let permissions = [];
    if (user.role === "admin" || user.role === "superadmin") {
      const allModules = await Permission.find().select("module -_id");
      permissions = allModules.map((m) => m.module);
    } else {
      permissions = user.permissions || [];
    }

    res.status(200).json({
      message: "Current user retrieved successfully",
      user,
      permissions,
    });
  } catch (err) {
    console.error("currentUser error:", err);
    res.status(500).json({ message: "Failed to fetch current user" });
  }
};
