import mongoose from "mongoose";
const { Schema } = mongoose;

const inventorySchema = new Schema(
  {
    financialYearId: {
      type: Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },

    godownId: {
      type: Schema.Types.ObjectId,
      ref: "Godown",
      default: null,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    purchaseId: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    batchNo: {
      type: String,
      default: "",
    },

    // SKU / LOOSE tracking
    purchaseType: {
      type: String,
      enum: ["SKU", "LOOSE"],
      default: "SKU",
    },

    skuId: {
      type: Schema.Types.ObjectId,
      ref: "SKU",
      default: null,
    },

    sellUnit: { type: String, default: "" }, // PACK / BOX / SOAP
    sellQty: { type: Number, default: 1 }, // 1 / 10 / etc
    baseUnitType: {
      type: String,
      enum: ["G", "ML", "PCS"],
      default: "G",
    },

    // snapshot
    productName: { en: String, ta: String },
    productCode: { type: String, default: "" },
    category: { en: String, ta: String },
    unit: { en: String, ta: String },

    // stock tracking
    totalPacks: { type: Number, default: 0 }, // SKU count only
    remainingPacks: { type: Number, default: 0 },

    unitWeight: { type: Number, default: 0 }, // SKU baseQty per pack

    // BASE STOCK ALWAYS STORED HERE
    totalWeight: { type: Number, default: 0 }, // baseQty total
    remainingWeight: { type: Number, default: 0 }, // baseQty remaining

    minStockLevel: { type: Number, default: 0 },
    lowStockAlert: { type: Boolean, default: false },

    lastUpdated: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

inventorySchema.index({ productId: 1 });

// Prevent duplicate inventory rows for same FY + product + location + purchase + variant
inventorySchema.index(
  {
    financialYearId: 1,
    productId: 1,
    shopId: 1,
    godownId: 1,
    purchaseId: 1,
    purchaseType: 1,
    unitWeight: 1,
    sellUnit: 1,
  },
  { unique: true, name: "uniq_fy_product_location_batch_variant" },
);

export default mongoose.model("Inventory", inventorySchema);
