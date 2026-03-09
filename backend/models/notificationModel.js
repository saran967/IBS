import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: {
            type: String,
            enum: ["CREDIT_LIMIT", "OVERDUE", "STOCK_ALERT", "ORDER", "SYSTEM"],
            default: "SYSTEM",
        },
        referenceId: { type: mongoose.Schema.Types.ObjectId },
        isRead: { type: Boolean, default: false }, // General read status or we could use the read log
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Target user (null for all admins)
    },
    { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
