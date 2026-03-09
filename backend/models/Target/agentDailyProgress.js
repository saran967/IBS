// backend/models/AgentDailyProgress.js
import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer", 
      required: true,
    },

    date: {
      type: String,
      required: true,
    }, 
    shopVisitTarget: {
      type: Number,
      default: 0,
    },

    orderTarget: {
      type: Number,
      default: 0,
    },

    amountLevelTarget: {
      type: Number,
      default: 0,
    },

    // Progress values (automatically calculated from routes)
    shopVisitProgress: {
      type: Number,
      default: 0,
    },

    orderProgress: {
      type: Number,
      default: 0,
    },

    amountLevelProgress: {
      type: Number,
      default: 0,
    },

    // Final status: Did agent reach today's target?
    reachedTarget: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one record per agent per day
progressSchema.index({ agentId: 1, date: 1 }, { unique: true });

export default mongoose.model("AgentDailyProgress", progressSchema);
