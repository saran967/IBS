import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  companyItems: [
    {
      companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
      companyName: { type: String, required: true },
      quantity: { type: Number, default: 0 },
    },
  ],
});

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    orderNumber: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Completed",
      ],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("OrderDetails", orderSchema);
