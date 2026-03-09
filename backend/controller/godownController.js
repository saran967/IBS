import Godown from "../models/godownModel.js";
import Shop from "../models/shopModel.js";

// ------------------------------------------------------
// 1. CREATE GODOWN
// ------------------------------------------------------
export const createGodown = async (req, res) => {
  try {
    const { name, shopId, location, description } = req.body;

    if (!shopId)
      return res
        .status(400)
        .json({ success: false, message: "Shop ID required" });

    const shopExists = await Shop.findById(shopId);
    if (!shopExists)
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });

    const godown = await Godown.create({
      name,
      shopId,
      location,
      description,
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Godown created successfully",
      godown,
    });
  } catch (err) {
    console.error("Error creating godown:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------------
// 2. GET ALL GODOWNS
// ------------------------------------------------------
export const getAllGodowns = async (req, res) => {
  try {
    const godowns = await Godown.find().populate("shopId", "name");
    res.status(200).json({ success: true, godowns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------------
// 3. GET GODOWNS BY SHOP
// ------------------------------------------------------
export const getGodownsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    const godowns = await Godown.find({ shopId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      godowns,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------------
// 4. UPDATE GODOWN
// ------------------------------------------------------
export const updateGodown = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Godown.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Godown not found" });

    res.status(200).json({
      success: true,
      message: "Godown updated successfully",
      godown: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------------
// 5. DELETE GODOWN
// ------------------------------------------------------
export const deleteGodown = async (req, res) => {
  try {
    const { id } = req.params;

    const godown = await Godown.findByIdAndDelete(id);

    if (!godown)
      return res
        .status(404)
        .json({ success: false, message: "Godown not found" });

    res.status(200).json({
      success: true,
      message: "Godown deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};