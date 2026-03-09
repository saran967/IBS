// controllers/permissionController.js
import User from "../models/userModel.js";
import { BadRequestError, NotFoundError } from "../Error/customError.js";
import PermissionMaster from "../models/permissionsModel.js";

// POST method (assign via body)
export const assignPermissions = async (req, res) => {
  const { userId, moduleIds } = req.body;

  if (!userId) throw new BadRequestError("userId required");
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  user.permissions = moduleIds; // array of module IDs
  await user.save();

  res.status(200).json({
    message: "Sidebar permissions updated successfully (POST)",
    user,
  });
};

//  GET method version (assign via query parameters)
export const assignPermissionsGet = async (req, res) => {
  const { moduleIds } = req.query;
  const userId = req.user.userId;
  console.log("user Is ", userId);

  if (!userId) throw new BadRequestError("userId required");
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  // moduleIds should be a comma-separated string in query
  const modulesArray =
    typeof moduleIds === "string" ? moduleIds.split(",") : [];

  user.permissions = modulesArray;
  await user.save();

  res.status(200).json({
    message: "Sidebar permissions updated successfully (GET)",
    user,
  });
};

//  Get all master permissions
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await PermissionMaster.find().sort({ module: 1 });
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//  Get permissions for a specific user
export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select(
      "permissions role name email",
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ permissions: user.permissions, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getAllPermissionModules = async (req, res) => {
  const modules = await PermissionMaster.find().select("module label route");
  res.status(200).json(modules);
};

export const updateUserPermissions = async (req, res) => {
  const { userId, moduleIds } = req.body;

  if (!userId) throw new BadRequestError("userId is required");
  if (!Array.isArray(moduleIds))
    throw new BadRequestError("moduleIds must be an array");

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  user.permissions = moduleIds;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Permissions updated successfully",
    permissions: user.permissions,
  });
};
