import Shop from "../models/shopModel.js";
import User from "../models/userModel.js";
import { StatusCodes } from "http-status-codes";

export const createShop = async (req, res) => {
  try {
    const admin = req.user;

    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Only Admins can create shops" });
    }

    const { name } = req.body; // Expecting { en: "Shop Name", ta: "கடை பெயர்" }
    if (!name || !name.en) {
      return res
        .status(400)
        .json({ message: "Shop name (English) is required" });
    }

    const shopCount = await Shop.countDocuments({ createdBy: admin._id });
    if (shopCount >= 4) {
      return res.status(400).json({ message: "Max 4 shops allowed" });
    }

    const shop = await Shop.create({
      name,
      createdBy: admin._id,
    });

    res.status(201).json({
      message: "Shop created successfully",
      shop,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllShops = async (req, res) => {
  try {
    const user = req.user;
    const lang = req.query.lang || "en"; // en | ta | both

    let query = {};
    if (user.role === "admin") query = { createdBy: user._id }; // admin can see only their shops

    const shops = await Shop.find(query)
      .populate("subAdmins", "name email role")
      .populate("employees", "name email role")
      .lean();

    const formattedShops = shops.map((shop) => {
      let name;

      //   When a single language is requested
      if (lang === "en" || lang === "ta") {
        name = shop.name?.[lang] || shop.name?.en || "-";
      }
      //   When both languages are requested
      else if (lang === "both") {
        name = {
          en: shop.name?.en || "-",
          ta: shop.name?.ta || "-",
        };
      }

      return {
        _id: shop._id,
        name,
        subAdmins: shop.subAdmins?.map((sa) => ({
          _id: sa._id,
          email: sa.email,
          role: sa.role,
          name:
            lang === "both"
              ? { en: sa.name?.en || "-", ta: sa.name?.ta || "-" }
              : sa.name?.[lang] || sa.name?.en || "-",
        })),
        employees: shop.employees?.map((emp) => ({
          _id: emp._id,
          email: emp.email,
          role: emp.role,
          name:
            lang === "both"
              ? { en: emp.name?.en || "-", ta: emp.name?.ta || "-" }
              : emp.name?.[lang] || emp.name?.en || "-",
        })),
        createdBy: shop.createdBy,
      };
    });

    res.status(200).json(formattedShops);
  } catch (err) {
    console.error("Error fetching shops:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || "en";

    const shop = await Shop.findById(id)
      .populate("createdBy", "name email role")
      .populate("subAdmins", "name email role")
      .populate("employees", "name email role");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Helper for localized names
    const getLocalized = (obj) =>
      typeof obj === "object" ? obj[lang] || obj.en || obj.ta || "-" : obj;

    // Helper for nested users (employees, subAdmins, etc.)
    const formatUser = (user) => {
      if (!user) return null;
      return {
        ...user.toObject(),
        localizedName: getLocalized(user.name),
      };
    };

    const formattedShop = {
      _id: shop._id,
      name: shop.name, // keep original full object
      localizedName:
        lang === "both"
          ? `${shop.name?.en || "-"} / ${shop.name?.ta || "-"}`
          : getLocalized(shop.name),
      createdBy: formatUser(shop.createdBy),
      subAdmins: shop.subAdmins.map(formatUser),
      employees: shop.employees.map(formatUser),
    };

    res.status(200).json(formattedShop);
  } catch (err) {
    console.error("Error fetching shop:", err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteShop = async (req, res) => {
  try {
    const admin = req.user;
    const { id } = req.params;

    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Only Admins can delete shops" });
    }

    const shop = await Shop.findOne({ _id: id, createdBy: admin._id });
    if (!shop) {
      return res
        .status(404)
        .json({ message: "Shop not found or unauthorized" });
    }

    // Optionally, delete related users (subadmins/employees)
    await User.deleteMany({ shopId: shop._id });

    await shop.deleteOne();

    res.status(200).json({ message: "Shop deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== "object") {
      return res.status(400).json({
        message: "Invalid name format. Expected { name: { en, ta } }",
      });
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    shop.name.en = name.en || shop.name.en;
    shop.name.ta = name.ta || shop.name.ta;

    // Save changes
    await shop.save();

    const updatedShop = await Shop.findById(id)
      .populate("createdBy", "name email role")
      .populate("subAdmins", "name email role")
      .populate("employees", "name email role");

    res.status(200).json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (err) {
    console.error("Error updating shop:", err);
    res.status(500).json({ message: err.message });
  }
};

export const toggleShopDelivery = async (req, res) => {
  try {
    const { shopId, enabled } = req.body;

    if (!shopId)
      return res.status(400).json({
        success: false,
        message: "shopId required",
      });

    const shop = await Shop.findById(shopId);
    if (!shop)
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });

    //  FIX: If name is string → convert to { en, ta }
    if (typeof shop.name === "string") {
      shop.name = {
        en: shop.name,
        ta: shop.name,
      };
    }

    shop.deliveryEnabled = enabled;

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Shop delivery flag updated",
      deliveryEnabled: shop.deliveryEnabled,
    });
  } catch (err) {
    console.error("toggleShopDelivery err:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
