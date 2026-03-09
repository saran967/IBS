import mongoose from "mongoose";

const quotationItemSchema = new mongoose.Schema({
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
    sellUnit: { type: String, default: "" },
    sellQty: { type: Number, default: 1 },
    baseQtyPerUnit: { type: Number, default: 0 },
    baseUnitType: { type: String, default: "" },

    isLoose: { type: Boolean, default: false },
    looseUnit: { type: String, default: null },

    quantity: { type: Number, required: true },

    unit: { en: String, ta: String },
    baseUnit: { en: String, ta: String },

    purchasePrice: { type: Number, default: 0 },
    profitPercentage: { type: Number, default: 0 },

    sellingPrice: { type: Number, required: true },

    cgstPercentage: { type: Number, default: 0 },
    sgstPercentage: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },

    total: { type: Number, required: true },
});

const quotationSchema = new mongoose.Schema(
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
        quotationDate: { type: Date, default: Date.now },
        dueDate: { type: Date, default: null },

        quotationNumber: { type: String, unique: true, index: true },

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

        items: [quotationItemSchema],

        grossTotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        netTotal: { type: Number, required: true },

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
    { timestamps: true }
);

quotationSchema.index({ createdAt: 1 });
quotationSchema.index({ customerId: 1 });

quotationSchema.pre("save", async function (next) {
    if (this.quotationNumber) return next();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const lastQuotation = await mongoose.model("Quotation").findOne({
        createdAt: { $gte: today, $lt: tomorrow },
        quotationNumber: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 });

    let nextSeq = 1;
    if (lastQuotation && lastQuotation.quotationNumber) {
        const parts = lastQuotation.quotationNumber.split('-');
        if (parts.length === 3) {
            const lastSeq = parseInt(parts[2], 10);
            if (!isNaN(lastSeq)) {
                nextSeq = lastSeq + 1;
            }
        }
    }

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.quotationNumber = `QT-${yyyy}${mm}${dd}-${String(nextSeq).padStart(4, '0')}`;
    next();
});

export default mongoose.model("Quotation", quotationSchema);
