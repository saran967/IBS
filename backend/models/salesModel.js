import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema({

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    en: String,
    ta: String,
  },
  hsnCode: {
    type: String,
    default: "",
  },
  skuId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SKU",
    default: null,
  },

  sellUnit: { type: String, default: "" }, // BOX / PACKET / PIECE / BOTTLE
  sellQty: { type: Number, default: 1 }, // mostly 1
  baseQtyPerUnit: { type: Number, default: 0 }, // sku.baseQty snapshot
  baseUnitType: { type: String, default: "" }, // G / ML / PCS snapshot

  isLoose: { type: Boolean, default: false },
  looseUnit: { type: String, default: null }, // G / ML / PCS

  quantity: { type: Number, required: true },

  unit: { en: String, ta: String }, // display unit (g, ml, pcs)
  baseUnit: { en: String, ta: String }, // inventory unit (kg, ltr)

  purchasePrice: { type: Number, default: 0 },
  profitPercentage: { type: Number, default: 0 },

  sellingPrice: { type: Number, required: true },

  cgstPercentage: { type: Number, default: 0 },
  sgstPercentage: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },

  total: { type: Number, required: true },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },

  godownId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Godown",
    default: null,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    default: null,
  },
  batchNo: {
    type: String,
    default: "",
  },
  isOutOfStock: {
    type: Boolean,
    default: false,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
});
//Handling Charges
const handlingChargeSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  productName: String,
  perPackCharge: { type: Number, default: 0 },
  totalCharge: { type: Number, default: 0 },
});

const transportSchema = new mongoose.Schema({
  transportOffice: { type: String, default: "" },
  startPlace: { type: String, default: "" },
  vehicleNumber: String,
  driverName: String,
  driverPhone: String,
  transportAgency: String,
  remarks: String,
  destination: String,
});

const subDeliverySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  items: [saleItemSchema],
  status: { type: String, enum: ["Pending", "Delivered"], default: "Pending" },
});

const paymentSplitSchema = new mongoose.Schema({
  mode: {
    type: String,
    enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"],
    // required: true,
  },
  amount: {
    type: Number,
    // required: true,
  },
  reference: {
    type: String, // UPI ref, cheque no, txn id
    default: "",
  },
});

const saleSchema = new mongoose.Schema(
  {

    financialYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancialYear",
      required: true,
    },
    saleType: { type: String, enum: ["B2C", "B2B"], required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer.companies",
    },
    saleDate: { type: Date, default: Date.now },
    dueDate: {
      type: Date,
      default: null,
    },

    invoiceNumber: { type: String, unique: true, sparse: true, index: true },

    billType: {
      type: String,
      enum: ["GST", "WITHOUT_GST"],
      default: "GST",
      required: true,
    },
    priceTier: {
      type: String,
      enum: ["R", "W", "SW"],
      default: "R",
    },
    paymentSplits: {
      type: [paymentSplitSchema],
      default: [],
    },

    items: [saleItemSchema],

    grossTotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    handlingCharges: [handlingChargeSchema],
    handlingTotal: { type: Number, default: 0 },
    netTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },

    includeTransport: { type: Boolean, default: false },
    transportDetails: transportSchema,

    subDeliveries: [subDeliverySchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByRole: {
      type: String,
      enum: ["admin", "subadmin", "employee", "user"],
      default: "admin",
    },

    createdByShop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
  },
  { timestamps: true },
);

//indexes for fast quering and searching like b-tree
saleSchema.index({ createdAt: 1 });
saleSchema.index({ "items.productId": 1 });

saleSchema.index({ customerId: 1 });
saleSchema.index({ createdByShop: 1 });

saleSchema.index({ saleDate: -1 });

// Auto-generate Daily Reset Invoice Number
saleSchema.pre("save", async function () {
  if (this.invoiceNumber) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Find the latest sale for today
  const lastSale = await mongoose.model("Sale").findOne({
    createdAt: { $gte: today, $lt: tomorrow },
    invoiceNumber: { $exists: true, $ne: null }
  }).sort({ createdAt: -1 });

  let nextSeq = 1;
  if (lastSale && lastSale.invoiceNumber) {
    const parts = lastSale.invoiceNumber.split('-');
    if (parts.length >= 3) {
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
  }

  // Format: INV-YYYY-MM-DD-0001 (or BILL-YYYY-MM-DD-0001 for Non-GST)
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const prefix = this.billType === "WITHOUT_GST" ? "BILL" : "INV";
  this.invoiceNumber = `${prefix}-${yyyy}-${mm}-${dd}-${String(nextSeq).padStart(4, '0')}`;
});

export default mongoose.model("Sale", saleSchema);
