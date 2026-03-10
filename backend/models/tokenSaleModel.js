import mongoose from "mongoose";
const { Schema } = mongoose;

const tokenItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: {
    en: { type: String, required: true },
    ta: { type: String },
  },
  quantity: { type: Number, required: true },
  unit: {
    en: { type: String },
    ta: { type: String },
  },
  tentativePrice: { type: Number, default: 0 },
});





const tokenSaleSchema = new Schema(
  {
    financialYearId: {
      type: Schema.Types.ObjectId,
      ref: "FinancialYear",
      index: true,
      default: null,
    },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    godownId: { type: Schema.Types.ObjectId, ref: "Godown", default: null },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    saleRef: { type: Schema.Types.ObjectId, ref: "Sale" }, // 🔗 Link to original sale
    tokenNumber: { type: String, required: true, unique: true },
    items: [tokenItemSchema],
    status: {
      type: String,
      enum: ["PENDING", "FULFILLED", "CANCELLED"],
      default: "PENDING",
    },
    pickupDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: String,
  },
  { timestamps: true }
);

tokenSaleSchema.index({ financialYearId: 1, createdAt: -1 });

export default mongoose.model("TokenSale", tokenSaleSchema);
