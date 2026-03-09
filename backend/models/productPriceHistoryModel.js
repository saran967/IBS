import mongoose from "mongoose";

const priceHistorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  oldPrice: Number,
  newPrice: Number,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  changedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ProductPriceHistory", priceHistorySchema);
