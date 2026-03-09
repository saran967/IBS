// backend/controller/Location/trackingController.js
import mongoose from "mongoose";
import RoutePath from "../../models/Location/routeModel.js";
import cloudinary from "../../utils/cloudinary.js";
import { updateDailyProgressForAgent } from "../../utils/progressAggregator.js";

export const startTracking = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const route = await RoutePath.create({
      user: userId,
      isActive: true,
      startedAt: new Date(),
      //  Start with Point (valid GeoJSON)
      path: {
        type: "Point",
        coordinates: [0, 0], // placeholder, replaced on first push
      },
    });

    await updateDailyProgressForAgent(userId);

    return res.json({
      success: true,
      message: "Tracking started",
      routeId: route._id,
    });
  } catch (error) {
    console.error("Start route error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const pushRoutePath = async (req, res) => {
  try {
    const { routeId, lat, lng } = req.body;

    if (!routeId || lat == null || lng == null) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const route = await RoutePath.findById(routeId);
    if (!route) return res.status(404).json({ message: "Route not found" });
    if (!route.isActive)
      return res.status(400).json({ message: "Route inactive" });

    const newPoint = [lng, lat];

    // CASE 1: First GPS fix
    if (route.path.type === "Point" && route.path.coordinates[0] === 0) {
      route.path.coordinates = newPoint;
    }

    // CASE 2: Convert Point → LineString
    else if (route.path.type === "Point") {
      route.path = {
        type: "LineString",
        coordinates: [route.path.coordinates, newPoint],
      };
    }

    // CASE 3: Append to LineString
    else {
      route.path.coordinates.push(newPoint);
    }

    await route.save();

    return res.json({ success: true, message: "Location added" });
  } catch (error) {
    console.error("pushRoutePath ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const stopTracking = async (req, res) => {
  try {
    const { routeId } = req.body;
    if (!routeId) return res.status(400).json({ message: "Missing routeId" });

    const route = await RoutePath.findByIdAndUpdate(
      routeId,
      { isActive: false, endedAt: new Date() },
      { new: true },
    );

    await updateDailyProgressForAgent(route.user);

    return res.json({ success: true, message: "Tracking stopped" });
  } catch (error) {
    console.error("stopTracking ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoutes = async (req, res) => {
  try {
    const routes = await RoutePath.find({ user: req.user.userId }).sort({
      startedAt: -1,
    });
    return res.json({ success: true, routes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveRoute = async (req, res) => {
  try {
    const route = await RoutePath.findOne({
      user: req.user.userId,
      isActive: true,
    });
    return res.json({ success: true, activeRoute: route });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCurrentRoutePath = async (req, res) => {
  try {
    const last = await RoutePath.findOne({ user: req.user.userId }).sort({
      startedAt: -1,
    });
    return res.json(last);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRouteHistory = async (req, res) => {
  try {
    // const routes = await RoutePath.find({ user: req.user.userId }).sort({ startedAt: -1 });
    const { id } = req.params;
    console.log(req.params);
    const routes = await RoutePath.find({ user: id }).sort({ startedAt: -1 });
    return res.json(routes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const uploadShop = async (req, res) => {
  try {
    const { routeId, lat, lng, products, grandTotal } = req.body;

    console.log("Incoming Body:", req.body);

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    if (!routeId) {
      return res.status(400).json({ message: "Route ID missing" });
    }

    if (!lat || !lng) {
      return res.status(400).json({ message: "Location missing" });
    }

    // Parse product list
    let parsedProducts = [];
    if (products) {
      try {
        parsedProducts = JSON.parse(products);
      } catch (err) {
        return res.status(400).json({ message: "Invalid products format" });
      }
    }

    // Upload image to Cloudinary
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "route-shops" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        stream.end(req.file.buffer);
      });
    };

    const uploadedImage = await uploadToCloudinary();

    // Find route
    const route = await RoutePath.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    // Push shop data
    route.shops.push({
      imageUrl: uploadedImage.secure_url,
      lat,
      lng,
      order: parsedProducts, // <-- store productId + qty array
      grandTotal: Number(grandTotal) || 0,
      createdAt: new Date(),
    });

    await route.save();

    // Update progress after shop added
    await updateDailyProgressForAgent(route.user);
    console.log("product saved successfully");
    res.json({
      message: "Shop saved inside route successfully!",
      shop: route.shops[route.shops.length - 1],
      totalShops: route.shops.length,
    });
  } catch (error) {
    console.error("Shop upload error:", error);
    res.status(500).json({ message: error.message });
  }
};
