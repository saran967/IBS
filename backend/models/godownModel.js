import mongoose from "mongoose";

const godownSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      ta: { type: String },
    },

    // Every godown belongs to a shop
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    // optional: any extra details
    location: { type: String },
    description: { type: String },

    // You can track who created this godown
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Godown", godownSchema);