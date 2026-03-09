import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },
  companyLocation: {
    type: String,
  },
  companyEmail: {
    type: String,
  },
  companyPhoneNumber: {
    type: String,
  },
  gstNumber: {
    type: String,
  },
  companyQuantity: {
    type: Number,
  },
});

const customerSchema = new mongoose.Schema(
  {
    customerType: {
      type: String,
      enum: ["B2C", "B2B", "agent"],
      required: true,
    },
    customerName: {
      en: { type: String, required: true },
      ta: { type: String },
    },

    fcmToken: {
      type: String,
      default: null,
    },

    totalIncentive: { type: Number, default: 0 },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },

    isMobileVerified: {
      type: Boolean,
      default: function () {
        return this.customerType !== "B2B";
      },
    },

    lastOtpSentAt: {
      type: Date,
      default: null,
    },

    password: {
      type: String,
    },
    address: {
      en: { type: String },
      ta: { type: String },
    },
    shippingAddress: {
      en: { type: String },
      ta: { type: String },
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    customerCode: {
      type: String,
      unique: true,
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    creditLimit: {
      type: Number,
      default: 100000,
    },

    dueDays: {
      type: Number,
      default: 15,
    },


    companies: [companySchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

customerSchema.pre("save", async function (next) {
  if (this.customerCode) {
    return next();
  }

  try {
    const prefix = this.customerType || "Cust";

    // Find the last customer of the same type to determine the next ID
    const lastCustomer = await mongoose.model("Customer")
      .findOne({ customerType: prefix, customerCode: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 });

    let nextNumber = 1;

    if (lastCustomer?.customerCode) {
      const parts = lastCustomer.customerCode.split("-");
      if (parts.length > 1) {
        const lastNumber = parseInt(parts[1], 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    this.customerCode = `${prefix}-${String(nextNumber).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});


export default mongoose.model("Customer", customerSchema);
