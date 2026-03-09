import mongoose from "mongoose";

const { Schema } = mongoose;

/* ================= SPLIT SCHEMAS ================= */

const shopSplitSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    packs: { type: Number, default: 0 }, // SKU only
    baseQty: { type: Number, default: 0 }, // ALWAYS base (G / ML / PCS)
  },
  { _id: false },
);

const godownSplitSchema = new Schema(
  {
    godown: { type: Schema.Types.ObjectId, ref: "Godown", required: true },
    packs: { type: Number, default: 0 }, // SKU only
    baseQty: { type: Number, default: 0 }, // ALWAYS base
  },
  { _id: false },
);

const transportSchema = new Schema(
  {
    vehicleNumber: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    transportAgency: { type: String, default: "" },
    remarks: { type: String, default: "" },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

/* ================= PURCHASE SCHEMA ================= */

const purchaseSchema = new Schema(
  {

    financialYearId: {
      type: Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
    },
    /* ---------- PRODUCT ---------- */
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productCode: { type: String, required: true },

    /* ---------- MODE ---------- */
    purchaseMode: {
      type: String,
      enum: ["SKU", "LOOSE"],
      required: true,
    },

    /* ---------- SKU SNAPSHOT ---------- */
    skuId: { type: Schema.Types.ObjectId, ref: "SKU", default: null },
    sellUnit: { type: String, default: "" },
    sellQty: { type: Number, default: 1 },
    baseUnitType: {
      type: String,
      enum: ["G", "ML", "PCS"],
      required: true,
    },
    baseQtyPerPack: { type: Number, default: 0 },

    /* ---------- VENDOR ---------- */
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },

    /* ---------- QUANTITY ---------- */
    totalPacks: { type: Number, default: 0 }, // SKU only
    baseQty: { type: Number, required: true }, // ALWAYS BASE

    /* ---------- PRICING ---------- */
    unitPrice: { type: Number, required: true }, // UI price
    totalAmount: { type: Number, required: true }, // FROM CONTROLLER ONLY

    balanceAmount: {
      type: Number,
      default: function () {
        return this.totalAmount;
      },
    },

    /* ---------- SPLITS ---------- */
    shopSplits: [shopSplitSchema],
    godownSplits: [godownSplitSchema],

    /* ---------- TRANSPORT ---------- */
    transport: transportSchema,

    /* ---------- META ---------- */
    purchaseDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    batchNo: { type: String, unique: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

/* ======================================================
   PRE-SAVE HOOK
   ONLY normalize baseQty for SKU
// Generate ST/IST format batch number
====================================================== */
purchaseSchema.pre("save", async function () {
  if (this.purchaseMode === "SKU") {
    const packs = Number(this.totalPacks || 0);
    const baseQtyPerPack = Number(this.baseQtyPerPack || 0);

    if (packs > 0 && baseQtyPerPack > 0) {
      this.baseQty = packs * baseQtyPerPack;
    }
  }

  // Generate ST/IST format batch number
  if (!this.batchNo) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Find last purchase today
    const lastPurchase = await mongoose.model("Purchase").findOne({
      createdAt: { $gte: today, $lt: tomorrow },
      batchNo: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });

    let nextSeq = 1;

    if (lastPurchase && lastPurchase.batchNo) {
      const parts = lastPurchase.batchNo.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
    }

    // Format: ST-YYYYMMDD-0001
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const prefix = "ST";
    this.batchNo = `${prefix}-${yyyy}${mm}${dd}-${String(nextSeq).padStart(4, '0')}`;
  }
});

/* ======================================================
   POST-SAVE HOOK (OPTIONAL, SAFE)
   Update product purchasePrice ONLY for LOOSE
====================================================== */
purchaseSchema.post("save", async function (doc, next) {
  try {
    if (doc.purchaseMode === "LOOSE") {
      await mongoose.model("Product").findByIdAndUpdate(doc.productId, {
        purchasePrice: doc.unitPrice, // ₹ per KG/LTR/PCS
      });
    }
    next();
  } catch (err) {
    console.error("❌ Post-save purchase hook error:", err);
    next();
  }
});

export default mongoose.model("Purchase", purchaseSchema);
