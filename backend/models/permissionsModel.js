import mongoose from "mongoose";
const { Schema } = mongoose;

const permissionMasterSchema = new Schema(
  {
    module: { type: String, required: true, unique: true }, // example: "sales"
    label: { type: String, required: true }, // example: "Sales"
    route: { type: String, required: true }, // example: "/sales"
    description: { type: String }, // optional helper text
  },
  { timestamps: true }
);

export default mongoose.model("PermissionMaster", permissionMasterSchema);
