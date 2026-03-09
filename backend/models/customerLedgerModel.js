import mongoose from "mongoose";
const { Schema } = mongoose;

const ledgerSchema = new Schema(
  {
    financialYearId: {                     // 🔥 ADD THIS
      type: Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },

    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    transactionType: {
      type: String,
      enum: ["SALE", "PAYMENT", "DELIVERY", "ADJUSTMENT"],
      required: true,
    },

    transactionRef: { type: Schema.Types.ObjectId },

    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },

    balanceAfter: { type: Number, required: true },

    note: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ledgerSchema.index({ customerId: 1, financialYearId: 1, createdAt: -1 });

export default mongoose.model("CustomerLedger", ledgerSchema);