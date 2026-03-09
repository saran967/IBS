import Customer from "../models/customerModel.js";
import Sale from "../models/salesModel.js";
import Payment from "../models/paymentModel.js";
import PDFDocument from "pdfkit";
import { createJwt } from "../utils/tokenutils.js";
import { comparePassword, hashPassword } from "../utils/passwordUtils.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";

const normalizeLangField = (val) => {
  if (!val) return { en: "", ta: "" };
  if (typeof val === "string") return { en: val, ta: "" };
  return {
    en: val.en || "",
    ta: val.ta || "",
  };
};

export const createCustomer = async (req, res) => {
  try {
    const { customerName, address, shippingAddress, ...rest } = req.body;

    // 🔴 ENFORCE B2B COMPANY VALIDATION
    if (
      req.body.customerType === "B2B" &&
      (!req.body.companies ||
        !Array.isArray(req.body.companies) ||
        req.body.companies.length === 0 ||
        !req.body.companies[0].companyName)
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one company is required for B2B customers",
      });
    }

    const customer = await Customer.create({
      ...rest,
      customerName: normalizeLangField(customerName),
      address: normalizeLangField(address),
      shippingAddress: normalizeLangField(shippingAddress),
      createdBy: req.user?.id || null,
    });

    res.status(201).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const filter = req.query.type ? { customerType: req.query.type } : {};
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    res.status(200).json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    const { customerName, address, shippingAddress, ...rest } = req.body;

    if (customerName)
      customer.customerName = normalizeLangField({
        ...customer.customerName,
        ...customerName,
      });

    if (address)
      customer.address = normalizeLangField({
        ...customer.address,
        ...address,
      });

    if (shippingAddress)
      customer.shippingAddress = normalizeLangField({
        ...customer.shippingAddress,
        ...shippingAddress,
      });

    Object.assign(customer, rest);

    const updated = await customer.save();
    res.status(200).json({ success: true, customer: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addCompanyToCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    customer.companies.push(req.body);
    await customer.save();

    res.status(200).json({ success: true, message: "Company added", customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCompanyFromCustomer = async (req, res) => {
  try {
    const { customerId, companyId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });

    customer.companies = customer.companies.filter(
      (c) => c._id.toString() !== companyId,
    );
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Company removed",
      customer,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    // const sales = await Sale.find({ customerId: id }).sort({ saleDate: -1 });

    const activeFY = await getActiveFinancialYear();

    const sales = await Sale.find({
      customerId: id,
      financialYearId: activeFY._id,
    }).sort({ saleDate: -1 });
    const totalSales = sales.reduce((sum, s) => sum + (s.netTotal || 0), 0);

    const totalPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

    const totalBalance =
      Number(totalSales) -
      Number(totalPaid) +
      Number(customer.openingBalance || 0);

    res.status(200).json({
      success: true,
      customer,
      totals: { totalSales, totalPaid, totalBalance },
      ledger: sales.map((s) => {
        const paid = Number(s.paidAmount || 0);
        const net = Number(s.netTotal || 0);
        const balance =
          s.balanceAmount !== undefined
            ? Number(s.balanceAmount)
            : net - paid;

        return {
          ...s.toObject(),
          paidAmount: paid,
          balanceAmount: balance,
          netTotal: net,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const recordCustomerPayment = async (req, res) => {
  try {
    const { customerId, amount, paymentMode, note } = req.body;

    if (!customerId || !amount)
      return res.status(400).json({
        message: "Customer ID and amount required",
      });
    let remaining = amount;
    let affectedInvoices = [];

    // 🔔 STEP 1: CLEAR OPENING BALANCE FIRST
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.openingBalance > 0 && remaining > 0) {
      const adjust = Math.min(customer.openingBalance, remaining);
      customer.openingBalance -= adjust;
      remaining -= adjust;
      await customer.save();
    }

    const activeFY = await getActiveFinancialYear();

    const pendingSales = await Sale.find({
      customerId,
      financialYearId: activeFY._id,
    }).sort({ saleDate: 1 });   // oldest first

    for (const sale of pendingSales) {
      if (remaining <= 0) break;

      const currentBalance =
        sale.balanceAmount ?? (sale.netTotal - (sale.paidAmount || 0));

      if (currentBalance <= 0) continue;

      const payNow = Math.min(currentBalance, remaining);

      sale.paidAmount = (sale.paidAmount || 0) + payNow;
      sale.balanceAmount = currentBalance - payNow;

      if (payNow > 0) {
        affectedInvoices.push(sale.invoiceNumber);
      }

      remaining -= payNow;

      await sale.save();
    }

    // 👉 Calculate customer's latest balance
    // const allSales = await Sale.find({ customerId });

    const allSales = await Sale.find({
      customerId,
      financialYearId: activeFY._id,
    });

    const totalSales = allSales.reduce((sum, s) => sum + (s.netTotal || 0), 0);

    const totalPaid = allSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);

    const balanceAfterPayment =
      customer.openingBalance + (totalSales - totalPaid);

    // 👉 Save payment with balance snapshot
    const payment = await Payment.create({
      customerId,
      amount,
      paymentMode,
      note,
      invoices: affectedInvoices,
      balanceAfterPayment,
      receivedBy: req.user?._id || null,
    });

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({
      customerId: req.params.id,
    }).sort({ date: -1 });

    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const downloadPaymentReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate(
      "customerId",
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const customer = payment.customerId;

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Receipt_${payment._id}.pdf`,
    );

    doc.pipe(res);

    /* ===== HEADER ===== */
    doc.fontSize(22).text("PAYMENT RECEIPT", { align: "center" }).moveDown(2);

    /* ===== CUSTOMER INFO ===== */
    doc.fontSize(12);
    doc.text(`Customer: ${customer.customerName?.en || "-"}`);
    doc.text(`Phone: ${customer.mobileNumber || "-"}`);
    doc.text(`Payment Mode: ${payment.paymentMode}`);
    doc.text(`Date: ${new Date(payment.date).toLocaleString()}`);
    doc.moveDown(2);

    /* ===== TABLE ===== */
    const tableTop = doc.y;

    // Table Header
    doc
      .font("Helvetica-Bold")
      .text("Description", 50, tableTop)
      .text("Amount (₹)", 400, tableTop, { align: "right" });

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Row
    doc
      .font("Helvetica")
      .text("Payment Received", 50, tableTop + 30)
      .text(payment.amount.toFixed(2), 400, tableTop + 30, {
        align: "right",
      });

    /* ===== TOTAL BOX ===== */
    doc.moveDown(3);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`Total Received: ₹${payment.amount}`, {
        align: "right",
      });

    /* ===== FOOTER ===== */
    doc.moveDown(2);
    doc.fontSize(10).text("Thank you for your payment!", { align: "center" });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Failed to generate receipt PDF" });
  }
};

export const registerCustomer = async (req, res) => {
  try {
    const {
      customerType,
      customerName, // expected as { en: "", ta: "" }
      mobileNumber,
      email,
      password,
      address,
      city,
      state,
      pincode,
      openingBalance,
      otpVerified,
    } = req.body;

    // 🔐 OTP must be verified first (B2B / B2C)
    if ((customerType === "B2B" || customerType === "B2C") && !otpVerified) {
      return res.status(400).json({
        message: "Mobile number not verified",
      });
    }

    //  Validate required fields as per schema
    if (!customerName || !customerName.en || !mobileNumber || !customerType) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    if (!password && customerType !== "agent") {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const existing = await Customer.findOne({
      $or: [{ email }, { mobileNumber }],
    });

    if (existing) {
      return res.status(400).json({
        message: "Customer already exists",
      });
    }

    const hashedPassword = password ? await hashPassword(password) : undefined;

    const customer = await Customer.create({
      customerType,
      customerName: {
        en: customerName.en,
        ta: customerName.ta || null,
      },
      mobileNumber,
      email,
      password: hashedPassword,
      address: address
        ? {
          en: address.en || null,
          ta: address.ta || null,
        }
        : undefined,
      city,
      state,
      pincode,
      openingBalance: openingBalance || 0,
      isMobileVerified:
        customerType === "B2B" || customerType === "B2C" ? otpVerified : true,
    });

    return res.status(201).json({
      message: "Customer registered successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Register Customer Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ email: req.body.email });
    if (!customer)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await comparePassword(req.body.password, customer.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = createJwt({
      userId: customer._id,
      role: customer.customerType,
    });

    res.status(200).json({
      success: true,
      token,
      data: customer,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const saveFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "User ID and FCM token required",
      });
    }

    // Remove token from other users
    await Customer.updateMany({ fcmToken }, { $set: { fcmToken: null } });

    await Customer.findByIdAndUpdate(userId, { fcmToken }, { new: true });

    res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    console.error("Save FCM Token Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save FCM token",
    });
  }
};

export const updateCustomerCompany = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { company } = req.body;

    if (!Array.isArray(company) || company.length === 0) {
      return res.status(400).json({ message: "Company array is required" });
    }

    const newCompany = company[0];

    if (!newCompany.companyName) {
      return res.status(400).json({ message: "Company Name is required" });
    }

    const customer = await Customer.findById(customerId);
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    if (customer.customerType !== "B2B") {
      return res
        .status(400)
        .json({ message: "Only B2B customers can add company details" });
    }

    customer.companies.push(newCompany);
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Company added successfully",
      companies: customer.companies,
    });
  } catch (error) {
    console.error("Update Customer Company Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user.userId);

    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    res.status(200).json({
      success: true,
      customer,
      companies: customer.companies,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const editCustomerCompany = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { companyId } = req.params;

    const {
      companyName,
      companyLocation,
      companyEmail,
      companyPhoneNumber,
      gstNumber,
      companyQuantity,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ message: "Company Name is required" });
    }

    const customer = await Customer.findById(customerId);
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    const index = customer.companies.findIndex(
      (c) => c._id.toString() === companyId,
    );

    if (index === -1) {
      return res.status(404).json({ message: "Company not found" });
    }

    customer.companies[index] = {
      ...customer.companies[index].toObject(),
      companyName,
      companyLocation,
      companyEmail,
      companyPhoneNumber,
      gstNumber,
      companyQuantity,
    };

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
      companies: customer.companies,
    });
  } catch (error) {
    console.error("Edit Company Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createAgent = async (req, res) => {
  try {
    const admin = req.user;

    // 🔐 Only admin can create agent
    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Only Admins can create Agents" });
    }

    const { customerName, email, password, mobileNumber } = req.body;

    //  REQUIRED VALIDATION
    if (!customerName?.en || !mobileNumber) {
      return res.status(400).json({
        message: "Name and mobile number are required",
      });
    }

    // 🔍 Check existing email / mobile
    const existing = await Customer.findOne({
      $or: [email ? { email } : null, { mobileNumber }].filter(Boolean),
    });

    if (existing) {
      return res.status(400).json({
        message: "Agent with given email or mobile number already exists",
      });
    }

    // 🔑 Hash password only if provided
    let hashedPassword;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    //  CREATE AGENT
    await Customer.create({
      customerType: "agent",
      customerName: {
        en: customerName.en,
        ta: customerName.ta || "",
      },
      email: email || undefined,
      mobileNumber,
      password: hashedPassword,
      createdBy: admin.userId, //  correct
    });

    return res.status(201).json({
      success: true,
      message: "Agent created successfully",
    });
  } catch (error) {
    console.error("Create Agent Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

export const getCustomerDueNotifications = async (req, res) => {
  try {
    const today = new Date();
    // today.setDate(today.getDate() + 16);

    const sales = await Sale.find({
      balanceAmount: { $gt: 0 } // only unpaid sales
    }).populate("customerId");

    const notifications = sales
      .map((sale) => {
        const customer = sale.customerId;

        if (!customer) return null;

        const dueDays = customer.dueDays || 0;
        if (!dueDays) return null;

        const saleDate = new Date(sale.saleDate);

        const dueDate = new Date(saleDate);
        dueDate.setDate(dueDate.getDate() + dueDays);

        if (today < dueDate) return null;

        return {
          saleId: sale._id,
          invoiceNumber: sale.invoiceNumber,
          customerId: customer._id,
          customerName: customer.customerName,
          mobileNumber: customer.mobileNumber,
          dueDate,
          balanceAmount: sale.balanceAmount,
        };
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });

  } catch (error) {
    console.error("Due Notification Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch due notifications",
    });
  }
};