import mongoose from "mongoose";

const vendorLedgerSchema = new mongoose.Schema(
  {
    financialYearId: {                       // 🔥 ADD THIS
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
  purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
      index: true,
    },

    date: { type: Date, required: true, default: Date.now, index: true },

    type: {
      type: String,
      enum: ["OPENING", "PURCHASE", "PAYMENT", "ADJUSTMENT", "RETURN"],
      required: true,
    },

    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: { type: Number, required: false },

    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String },
    metadata: { type: Object, default: {} },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);
// Better index
vendorLedgerSchema.index({
  vendorId: 1,
  financialYearId: 1,
  purchaseId: 1,
  date: 1,
});


// 🔥 Better compound index
vendorLedgerSchema.index({ vendorId: 1, financialYearId: 1, date: 1 });

export default mongoose.model("VendorLedger", vendorLedgerSchema);