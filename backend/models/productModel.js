import mongoose from "mongoose";

const LocalizedString = {
  en: { type: String, default: "" },
  ta: { type: String, default: "" },
};

const productSchema = new mongoose.Schema(
  {
    name: { type: Object, default: () => ({ en: "", ta: "" }) },
    category: { type: Object, default: () => ({ en: "", ta: "" }) },
    unit: { type: Object, default: () => ({ en: "", ta: "" }) },
    fssaiNumber: { type: Number },
    packedDate: { type: Date },
    useByDate: { type: Date },
    mrp: { type: Number },

    productCode: { type: String, unique: true, required: true },
    weight: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
    baseUnitType: { type: String, enum: ["G", "ML", "PCS"], default: "G" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    shortCode: { type: String, index: true },
    barcode: { type: String },
    barcodeUrl: { type: String },

    enableDelivery: { type: Boolean, default: false },
    categoryDeliveryEnabled: { type: Boolean, default: true },

    //  Pricing Fields
    purchasePrice: { type: Number, default: 0 }, // Cost price
    profitPercentage: { type: Number, default: 0 }, // % margin
    // gstPercentage: { type: Number, default: 0 }, // GST %
    cgstPercentage: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },

    sellingPrice: { type: Number, default: 0 },
    images: [{ type: String }],
    sellingPriceforB2B: { type: Number, default: 0 },
    sellingPriceforB2C: { type: Number, default: 0 },
    sellingPriceforAgent: { type: Number, default: 0 },
    description: { type: String },

    minStockLevel: { type: Number, default: 0 },

    //for offer change including these data
    originalSellingPriceB2B: { type: Number },
    originalSellingPriceB2C: { type: Number },
    originalSellingPriceAgents: { type: Number },
    // Auto or manual
    allowRetail: { type: Boolean, default: false },
    hsnCode: { type: String, default: "" },
  },
  { timestamps: true },
);

productSchema.pre("save", function (next) {
  const purchase = Number(this.purchasePrice || 0);
  const profit = Number(this.profitPercentage || 0);
  const selling = Number(this.sellingPrice || 0);

  // CASE 1 → Profit % entered or changed → update selling price
  if (this.isModified("profitPercentage") && !this.isModified("sellingPrice")) {
    const profitAmount = (purchase * profit) / 100;
    this.sellingPrice = Number((purchase + profitAmount).toFixed(2));
  }

  // CASE 2 → Selling price entered or changed → update profit %
  if (this.isModified("sellingPrice")) {
    if (purchase > 0) {
      const profitPercent = ((selling - purchase) / purchase) * 100;
      this.profitPercentage = Number(profitPercent.toFixed(2));
    }
  }

  next();
});

export default mongoose.model("Product", productSchema);
