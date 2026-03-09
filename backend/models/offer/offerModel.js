import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    offerType: {
      type: String,
      enum: ["percentage", "fixed", "flat"],
      required: true,
    },
    value: { type: Number, required: true },

    applyOn: { type: String, enum: ["product", "category"], required: true },

    product: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    }],

    // Category is plain string (EN)
    category: { type: String, default: null },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
    },
    message: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Offer", offerSchema);
