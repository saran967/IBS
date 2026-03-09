// models/RetailShop.js
import mongoose from "mongoose";

const retailShopSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      ta: { type: String },
    },

   
    godowns: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],


    subAdmins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    meta: { type: Object, default: {} }, // optional extra fields like address/phone
  },
  { timestamps: true }
);

export default mongoose.model("RetailShop", retailShopSchema);
