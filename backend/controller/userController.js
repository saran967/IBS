import User from "../models/userModel.js";
import Shop from "../models/shopModel.js";
import { hashPassword } from "../utils/passwordUtils.js";
import { localize } from "../utils/localizationHelper.js";

export const createAdmin = async (req, res) => {
  try {
    const superadmin = req.user;

    if (superadmin.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only Superadmins can create Admins" });
    }

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // 1. Destructure ONLY the fields you need
    // 'name' will be the full multilingual object: { "en": "Admin1", "ta": "நிர்வாகி1" }
    const { name, email, password } = req.body;

    // Basic validation to ensure name.en exists
    if (!name || !name.en || typeof name.en !== "string") {
      return res
        .status(400)
        .json({ message: "Name (en) is required and must be a string." });
    }

    const hashedPassword = await hashPassword(password);

    // 2. Pass the 'name' object DIRECTLY to Mongoose
    const admin = await User.create({
      name, // <--- Correct: This passes { en: "Admin1", ta: "நிர்வாகி1" }
      email,
      password: hashedPassword,
      role: "admin", // Explicitly set role
      createdBy: superadmin._id,
    });

    res.status(201).json({
      message: "Admin created successfully",
      // Ensure you convert the Mongoose document to a plain object before localizing
      admin: localize(admin.toObject(), req.lang),
    });
  } catch (err) {
    // If you are getting a Mongoose validation error, it's often better to check if it's a validation error
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

export const createShopWithSubAdmin = async (req, res) => {
  try {
    const admin = req.user;

    if (admin.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only Admins can create shops and subadmins" });
    }

    const {
      shopName,
      shopName_ta,
      shopId,
      subAdminName,
      subAdminName_ta,
      subAdminEmail,
      subAdminPassword,
    } = req.body;

    let shop;

    if (shopId) {
      shop = await Shop.findById(shopId).populate("subAdmins", "email");

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      //  Validate: Only one subadmin allowed per shop
      if (shop.subAdmins && shop.subAdmins.length >= 1) {
        return res.status(400).json({
          message: "This shop already has a subadmin assigned",
        });
      }

      // Backward-safe guard: enforce using User collection as source of truth
      // in case shop.subAdmins array is stale in older data.
      const existingSubAdmin = await User.findOne({
        role: "subadmin",
        shopId: shop._id,
      }).select("_id");
      if (existingSubAdmin) {
        return res.status(400).json({
          message: "This shop already has a subadmin assigned",
        });
      }
    } else {
      //  Limit admin to 4 total shops
      const shopCount = await Shop.countDocuments({ createdBy: admin._id });
      if (shopCount >= 4) {
        return res
          .status(400)
          .json({ message: "Max 4 shops/sub-admins allowed per admin" });
      }

      shop = await Shop.create({
        name: { en: shopName, ta: shopName_ta },
        createdBy: admin._id,
      });
    }

    //  Hash password before creating user
    const hashedPassword = await hashPassword(subAdminPassword);

    const subAdmin = await User.create({
      name: { en: subAdminName, ta: subAdminName_ta },
      email: subAdminEmail,
      password: hashedPassword,
      role: "subadmin",
      shopId: shop._id,
      createdBy: admin._id,
    });

    //  Associate subadmin to shop
    shop.subAdmins = [subAdmin._id]; // ensure only one subadmin ever
    await shop.save();

    res.status(201).json({
      message: "Subadmin added successfully",
      shop: localize(shop.toObject(), req.lang),
      subAdmin: localize(subAdmin.toObject(), req.lang),
    });
  } catch (err) {
    console.error("Error creating shop/subadmin:", err);
    res.status(500).json({ message: err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const creator = req.user;

    if (!["admin", "subadmin"].includes(creator.role)) {
      return res
        .status(403)
        .json({ message: "Only Admins or SubAdmins can create employees" });
    }

    const { name, name_ta, email, password, shopId } = req.body;
    const targetShopId = shopId || creator.shopId;

    if (!targetShopId) {
      return res
        .status(400)
        .json({ message: "Shop ID is required to create an employee" });
    }

    const shop = await Shop.findById(targetShopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const hashedPassword = await hashPassword(password);

    const employee = await User.create({
      name: { en: name, ta: name_ta },
      email,
      password: hashedPassword,
      role: "user",
      shopId: targetShopId,
      createdBy: creator._id,
    });

    if (!shop.employees) shop.employees = [];
    shop.employees.push(employee._id);
    await shop.save();

    res.status(201).json({
      message: "Employee created successfully",
      employee: localize(employee.toObject(), req.lang),
      shop: localize(shop.toObject(), req.lang),
    });
  } catch (err) {
    console.error("Error creating employee:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const { role, shopId, _id: userId } = req.user;
    let employees = [];

    // -------------------------------------------------------------
    //  EMPLOYEE (role: user)
    // Employee should see employees ONLY in their own shop
    // -------------------------------------------------------------
    if (role === "user") {
      if (!shopId) {
        return res
          .status(400)
          .json({ message: "Employee is not assigned to any shop" });
      }

      employees = await User.find({
        shopId,
        role: "user",
      })
        .select("-password")
        .populate({ path: "shopId", select: "name" })
        .lean();

      return res.status(200).json({
        success: true,
        count: employees.length,
        employees: employees.map((emp) => ({
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          shop: emp.shopId
            ? { _id: emp.shopId._id, name: emp.shopId.name }
            : {
                _id: null,
                name: { en: "Not Assigned", ta: "ஒதுக்கப்படவில்லை" },
              },
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
        })),
      });
    }

    // -------------------------------------------------------------
    //  SUBADMIN
    // Subadmin should see employees ONLY in their own shop
    // -------------------------------------------------------------
    if (role === "subadmin") {
      if (!shopId) {
        return res
          .status(403)
          .json({ message: "SubAdmin must belong to a shop" });
      }

      employees = await User.find({
        shopId,
        role: "user",
      })
        .select("-password")
        .populate({ path: "shopId", select: "name" })
        .lean();
    }

    // -------------------------------------------------------------
    //  ADMIN
    // Admin should see employees across all shops they created
    // -------------------------------------------------------------
    if (role === "admin") {
      const shops = await Shop.find({ createdBy: userId }).select("_id").lean();
      const shopIds = shops.map((s) => s._id);

      employees = await User.find({
        shopId: { $in: shopIds },
        role: "user",
      })
        .select("-password")
        .populate({ path: "shopId", select: "name" })
        .lean();
    }

    // -------------------------------------------------------------
    // Handle empty result
    // -------------------------------------------------------------
    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found" });
    }

    // -------------------------------------------------------------
    // Return final formatted response
    // -------------------------------------------------------------
    const formattedEmployees = employees.map((emp) => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      shop: emp.shopId
        ? { _id: emp.shopId._id, name: emp.shopId.name }
        : { _id: null, name: { en: "Not Assigned", ta: "ஒதுக்கப்படவில்லை" } },
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedEmployees.length,
      employees: formattedEmployees,
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllSubAdmins = async (req, res, next) => {
  try {
    // Only allow Admins
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to view sub-admins" });
    }

    // Fetch all subadmins and populate their shop details
    const subAdmins = await User.find({ role: "subadmin" })
      .select("-password")
      .populate({
        path: "shopId",
        select: "name", // Only include the name object from Shop
      })
      .lean();

    if (!subAdmins || subAdmins.length === 0) {
      throw new NotFoundError("No SubAdmins found");
    }

    // Format the response neatly
    const formattedSubAdmins = subAdmins.map((sub) => ({
      _id: sub._id,
      name: sub.name,
      email: sub.email,
      role: sub.role,
      shop: sub.shopId
        ? { _id: sub.shopId._id, name: sub.shopId.name }
        : { _id: null, name: { en: "Not Assigned", ta: "ஒதுக்கப்படவில்லை" } },
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));

    res.status(200).json({
      success: true,
      count: formattedSubAdmins.length,
      subAdmins: formattedSubAdmins,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ta, email, password, shopId } = req.body;

    const employee = await User.findById(id);
    if (!employee || employee.role !== "user") {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Only admin/subadmin of the shop can update
    if (
      req.user.role === "subadmin" &&
      req.user.shopId.toString() !== employee.shopId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    employee.name = { en: name, ta: name_ta };
    if (email) employee.email = email;
    if (password) employee.password = await hashPassword(password);
    if (shopId) employee.shopId = shopId;

    await employee.save();

    res
      .status(200)
      .json({ message: "Employee updated successfully", employee: employee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ta, email, shopId } = req.body;

    const subAdmin = await User.findById(id);
    if (!subAdmin || subAdmin.role !== "subadmin") {
      return res.status(404).json({ message: "SubAdmin not found" });
    }

    // Only admin can update
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const currentShopId = subAdmin.shopId ? subAdmin.shopId.toString() : null;
    const nextShopId = shopId ? shopId.toString() : null;

    // If reassigning subadmin to another shop, enforce one-subadmin-per-shop.
    if (nextShopId && nextShopId !== currentShopId) {
      const targetShop = await Shop.findById(nextShopId);
      if (!targetShop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const alreadyAssignedSubAdmin = await User.findOne({
        role: "subadmin",
        shopId: nextShopId,
        _id: { $ne: subAdmin._id },
      }).select("_id");

      if (alreadyAssignedSubAdmin) {
        return res
          .status(400)
          .json({ message: "This shop already has a subadmin assigned" });
      }

      if (currentShopId) {
        await Shop.findByIdAndUpdate(currentShopId, {
          $pull: { subAdmins: subAdmin._id },
        });
      }

      targetShop.subAdmins = [subAdmin._id];
      await targetShop.save();
      subAdmin.shopId = nextShopId;
    }

    subAdmin.name = { en: name, ta: name_ta };
    if (email) subAdmin.email = email;
    if (shopId && nextShopId === currentShopId) subAdmin.shopId = shopId;

    await subAdmin.save();

    res
      .status(200)
      .json({ message: "SubAdmin updated successfully", subAdmin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id);
    if (!employee || employee.role !== "user") {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Only admin/subadmin of the shop can delete
    if (
      req.user.role === "subadmin" &&
      req.user.shopId.toString() !== employee.shopId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await User.findByIdAndDelete(id);

    // Remove from shop.employees array
    await Shop.findByIdAndUpdate(employee.shopId, {
      $pull: { employees: employee._id },
    });

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const subAdmin = await User.findById(id);
    if (!subAdmin || subAdmin.role !== "subadmin") {
      return res.status(404).json({ message: "SubAdmin not found" });
    }

    // Only admin can delete
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await User.findByIdAndDelete(id);

    // Remove from shop.subAdmins array
    await Shop.findByIdAndUpdate(subAdmin.shopId, {
      $pull: { subAdmins: subAdmin._id },
    });

    res.status(200).json({ message: "SubAdmin deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const user = req.user;
    if (user.role === "superadmin") {
      const users = await User.find({}).select(
        "name email role permissions shopId isActive createdAt",
      );
      return res.status(200).json(users);
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Admin should see subadmins + employees in their hierarchy.
    // Prefer createdBy chain, but also support legacy rows linked via shopId/shop arrays.
    const adminId = user.userId;
    const shops = await Shop.find({ createdBy: adminId }).select(
      "_id subAdmins employees",
    );
    const shopIds = shops.map((s) => s._id);

    const subAdmins = await User.find({
      role: "subadmin",
      $or: [{ createdBy: adminId }, { shopId: { $in: shopIds } }],
    }).select("_id");

    const creatorIds = [adminId, ...subAdmins.map((s) => s._id)];
    const shopLinkedUserIds = shops.flatMap((s) => [
      ...(s.subAdmins || []),
      ...(s.employees || []),
    ]);

    let users = await User.find({
      role: { $in: ["subadmin", "user"] },
      $or: [
        { createdBy: { $in: creatorIds } },
        { shopId: { $in: shopIds } },
        { _id: { $in: shopLinkedUserIds } },
      ],
    }).select("name email role permissions shopId isActive createdAt");

    // Fallback for older datasets where relationship fields may be missing.
    if (!users.length) {
      users = await User.find({
        role: { $in: ["subadmin", "user"] },
      }).select("name email role permissions shopId isActive createdAt");
    }

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
