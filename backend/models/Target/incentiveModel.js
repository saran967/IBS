import mongoose from "mongoose";

const dailyEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const agentSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  dailyEntries: [dailyEntrySchema],
  totalAmount: { type: Number, default: 0 },
});

const incentiveSchema = new mongoose.Schema(
  {
    month: { type: String, required: true },
    year: { type: String, required: true },
    purpose: { type: String, required: true },
    agents: [agentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Incentive", incentiveSchema);
