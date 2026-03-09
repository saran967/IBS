import mongoose from "mongoose";

const companyItemSchema = new mongoose.Schema({
  companyName: { type: String },
  quantity: { type: Number, min: 0 },
});

const orderItemSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  godownId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Godown",
    default: null,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, min: 0 },
  price: { type: Number, min: 0 },
  status: {
    type: String,
    enum: ["Pending", "Fulfilled"],
    default: "Pending",
  },
  companyItems: [companyItemSchema],
});

const orderSchema = new mongoose.Schema(
  {
    financialYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    orderStatus: {
      type: String,
      enum: ["requested", "pending", "confirmed", "fulfilled", "cancelled"],
      default: "pending",
    },
    approvalStatus: {
      type: String,
      enum: ["approved", "requested", "none"],
      default: "none",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    orderNumber: { type: String, unique: true },
    pickupDate: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ financialYearId: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
