import mongoose from "mongoose";

const SKUSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    sellUnit: { type: String, required: true }, // BOX / PACKET / PIECE / BOTTLE
    sellQty: { type: Number, default: 1 }, // mostly 1

    baseQty: { type: Number, required: true }, // IMPORTANT  (in product baseUnit)

    retailPrice: { type: Number, required: true },
    wholesalePrice: { type: Number, default: 0 },
    agentPrice: { type: Number, default: 0 },

    displayName: { type: String },
    barcode: { type: String, default: "" },

    allowRetail: { type: Boolean, default: true },
    allowWholesale: { type: Boolean, default: true },
  },
  { timestamps: true },
);

SKUSchema.pre("save", function (next) {
  this.displayName = `${this.sellQty} ${this.sellUnit}`.trim();
  next();
});

// const SKUSchema = new mongoose.Schema(
//   {
//     // Every SKU belongs to a PRODUCT
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },

//     // Example: 50, 100, 1, 0.5
//     qty: { type: Number, required: true },

//     // Example: g, kg, piece, packet, ml, ltr
//     unit: { type: String, required: true },

//     // Retail MRP
//     retailPrice: { type: Number, required: true },

//     wholesalePrice: { type: Number, default: 0 },

//     baseQty: { type: Number, required: true },

//     // Auto display: "50 g", "1 kg", "250 ml"
//     displayName: { type: String },

//     // Optional — if each SKU has unique barcode
//     barcode: { type: String, default: "" },

//     allowRetail: { type: Boolean, default: true },
//     allowWholesale: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// // Auto-generate displayName
// SKUSchema.pre("save", function (next) {
//   this.displayName = `${this.qty} ${this.unit}`.trim();
//   next();
// });

export default mongoose.model("SKU", SKUSchema);
