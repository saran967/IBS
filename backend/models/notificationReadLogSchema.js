import mongoose from "mongoose";

const NotificationReadLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: [
  "ORDER",
  "TOKEN",
  "STOCK_TRANSFER",
  "CREDIT_LIMIT",
  "OVERDUE",
  "VENDOR_CREDIT_LIMIT",
],  
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // orderId OR tokenId
  },
  { timestamps: true }
);

NotificationReadLogSchema.index(
  { userId: 1, type: 1, refId: 1 },
  { unique: true, name: "uniq_notification_read_per_user" },
);


export default mongoose.model("NotificationReadLog", NotificationReadLogSchema);