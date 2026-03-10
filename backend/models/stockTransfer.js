


import mongoose from "mongoose";

const StockTransferSchema = new mongoose.Schema(
  {
transferId: {
  type: String,
  unique: true,
  index: true,
},

    financialYearId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "FinancialYear",
  required: true,
  index: true,
},

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // FROM
    fromShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    fromGodownId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Godown",
      default: null,
    },

    // TO
    toShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    toGodownId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Godown",
      default: null,
    },

    quantity: {
      type: Number,
      required: true,
    },

    transferredBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
    },
    transferDate: {
      type: Date,
      default: Date.now,
    },

    meta: {
      type: Object,
      default: {},
    },

    // ⚠ NEW FIELD
  status: {
  type: String,
  enum: ["pending", "approved", "rejected", "cancelled"],
  default: "pending"
},

  approvedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Validation
StockTransferSchema.pre("validate", function (next) {
  if (!this.fromShopId && !this.fromGodownId)
    return next(new Error("Either fromShopId or fromGodownId must be provided."));

  if (!this.toShopId && !this.toGodownId)
    return next(new Error("Either toShopId or toGodownId must be provided."));

  next();
});

StockTransferSchema.pre("save", async function (next) {
  try {
    if (!this.isNew) return next(); // only generate for new documents

    if (!this.transferId) {

      const lastTransfer = await mongoose
        .model("StockTransfer")
        .findOne()
        .sort({ createdAt: -1 })
        .select("transferId");

      let nextNumber = 1;

      if (lastTransfer && lastTransfer.transferId) {
        const lastNumber = parseInt(lastTransfer.transferId.replace("TRF", ""));
        nextNumber = lastNumber + 1;
      }

      this.transferId = `TRF${String(nextNumber).padStart(5, "0")}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("StockTransfer", StockTransferSchema);




