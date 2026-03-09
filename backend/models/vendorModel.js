import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      unique: true,
      index: true,
    },

    name: {
      en: { type: String, required: true, trim: true },
      ta: { type: String, trim: true },
    },

    address: {
      en: { type: String, trim: true },
      ta: { type: String, trim: true },
    },

    email: { type: String, trim: true },

    mobile: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    companyName: { type: String, trim: true },
    gstNumber: { type: String, trim: true },

    creditLimit: {
      type: Number,
      default: 100000,   // 🔥 Default credit limit
    },

    openingBalance: {
      type: Number,
      default: 0,        // 🔥 Manual entry allowed
    },
    dueDays: {
  type: Number,
  default: 15,   // 🔥 DEFAULT 15 DAYS
},

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

vendorSchema.pre("save", async function (next) {
  if (this.vendorCode) return next();

  const lastVendor = await mongoose.model("Vendor")
    .findOne()
    .sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastVendor?.vendorCode) {
    const lastNumber = parseInt(lastVendor.vendorCode.split("-")[1]);
    nextNumber = lastNumber + 1;
  }

  this.vendorCode = `Ven-${String(nextNumber).padStart(4, "0")}`;
  next();
});

export default mongoose.model("Vendor", vendorSchema);
