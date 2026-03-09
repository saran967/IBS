// models/VendorPayment.js
import mongoose from "mongoose";

const vendorPaymentSchema = new mongoose.Schema(
  {
    financialYearId: {                     // 🔥 ADD THIS
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    amount: { type: Number, required: true },

    paymentDate: { type: Date, default: Date.now },

    mode: {
      type: String,
      enum: ["Cash", "Bank", "UPI", "Other"],
      default: "Cash",
    },

    reference: { type: String },
    notes: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
  },
  { timestamps: true }
);

vendorPaymentSchema.index({ vendorId: 1, financialYearId: 1 });

export default mongoose.model("VendorPayment", vendorPaymentSchema);