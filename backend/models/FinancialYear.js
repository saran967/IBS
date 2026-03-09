import mongoose from "mongoose";

const financialYearSchema = new mongoose.Schema(
  {
    yearName: {
      type: String,
      required: true,
      unique: true, // Example: "2025-2026"
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FinancialYear", financialYearSchema);