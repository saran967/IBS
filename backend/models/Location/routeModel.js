// backend/models/Location/routeModel.js
import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  order: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      qty: { type: Number, required: true, default: 1 },
      unitPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
  ],
  grandTotal: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const routeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    isActive: { type: Boolean, default: true },

    // Path will always contain valid GeoJSON type when present
    path: {
      type: {
        type: String,
        enum: ["Point", "LineString"],
        default: "Point",
      },
      coordinates: {
        type: [],
        required: true,
      },
    },

    shops: [shopSchema],

    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
  },
  { minimize: false }
);

// 2dsphere index for geo queries (keeps it)
routeSchema.index({ path: "2dsphere" });

export default mongoose.model("RoutePath", routeSchema);
