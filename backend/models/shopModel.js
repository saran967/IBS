import mongoose from "mongoose";

// Shop schema with multilingual name
const shopSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true }, // English shop name
      ta: { type: String }, // Tamil shop name (optional)
    },

    subAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin who created the shop
  },

  { timestamps: true }
);

export default mongoose.model("Shop", shopSchema);
