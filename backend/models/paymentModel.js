// models/paymentModel.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    amount: { type: Number, required: true },
    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Cheque", "Other"],
      default: "Cash",
    },
    note: { type: String },

    balanceAfterPayment: { type: Number, default: 0 },
    invoices: [{ type: String }],
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model("Payment", paymentSchema);
