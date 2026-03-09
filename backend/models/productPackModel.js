import mongoose from "mongoose";

const productPackSchema = new mongoose.Schema(
  {
    financialYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      index: true,
      default: null,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true, // each pack belongs to a shop
    },
    packSize: {
      type: Number,
      required: true,
    },
    packCount: {
      type: Number,
      required: true,
    },
    totalWeight: {
      type: Number,
      required: true,
    },
    unit: {
      en: { type: String, required: true }, // e.g., kg, liters
      ta: { type: String }, // Tamil translation
    },
    gst: {
      type: Number,
      default: 16,
    },
    profitPercentage: {
      type: Number,
      default: 16,
    },
    pricePerPack: {
      type: Number,
      required: true,
    },
    batchNo: {
      type: String,
      default: "",
    },
    packedDate: {
      type: Date,
      default: Date.now,
    },
    useByDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

productPackSchema.index({ financialYearId: 1, shopId: 1, productId: 1, createdAt: -1 });

export default mongoose.model("ProductPack", productPackSchema);
