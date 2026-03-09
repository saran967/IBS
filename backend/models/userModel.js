
import mongoose from "mongoose";


const userSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      ta: { type: String },
    },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "admin", "subadmin", "user"],
      required: true,
    },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },

    godownId: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: "Godown",
  default: null
},



    permissions: [{ type: String }], // store moduleIds like "orders", "sales-list"

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
