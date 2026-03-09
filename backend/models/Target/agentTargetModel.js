import mongoose from "mongoose";

const targetSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    targetType: {
      type: String,
      enum: ["shopVisit", "orderTaken", "amountLevel", "allOfThem"],
      required: true,
    },
    shopVisitTarget: { type: Number, default: 0 },
    orderTarget: { type: Number, default: 0 },
    amountLevelTarget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Target", targetSchema);
