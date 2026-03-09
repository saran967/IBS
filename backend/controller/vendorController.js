

import Vendor from "../models/vendorModel.js";
import { publishLedgerEvent } from "../services/queue.js";
import getActiveFinancialYear from "../utils/getActiveFinancialYear.js";

export const createVendor = async (req, res) => {
  try {
    const {
  name,
  address,
  email,
  mobile,
  companyName,
  gstNumber,
  status,
  creditLimit,
  openingBalance,
  dueDays,
} = req.body;

    if (!name || !name.en) {
      return res.status(400).json({ message: "Vendor English name required" });
    }

    const vendor = await Vendor.create({
      name,
      address,
      email,
      mobile,
      companyName,
      gstNumber,
      status,
       creditLimit: creditLimit || 100000,
  openingBalance: openingBalance || 0,
   dueDays: dueDays || 15,
    });
    // 🔥 Create Opening Balance Entry in Ledger
if (vendor.openingBalance > 0) {
  await publishLedgerEvent({
    financialYearId: (await getActiveFinancialYear())._id,
    vendorId: vendor._id,
    type: "OPENING",
    debit: Number(vendor.openingBalance),
    credit: 0,
    referenceId: vendor._id,
    note: "Opening Balance",
    createdBy: req.user?.userId,
  });
}

    res.status(201).json({ message: "Vendor created successfully", vendor });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.mobile)
      return res.status(400).json({ message: "Mobile already registered" });

    res.status(500).json({ message: err.message });
  }
};


export const getVendors = async (req, res) => {
  try {
    const lang = req.query.lang || "en";
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const q = req.query.q || "";

    // Search across multilingual fields
    const search = q
      ? {
          $or: [
            { "name.en": { $regex: q, $options: "i" } },
            { "name.ta": { $regex: q, $options: "i" } },
            { "address.en": { $regex: q, $options: "i" } },
            { "address.ta": { $regex: q, $options: "i" } },
            { companyName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { mobile: { $regex: q, $options: "i" } },
            { gstNumber: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const vendors = await Vendor.find(search)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = vendors.map((v) => {
      let name;
      let address;

      if (lang === "both") {
        name = { en: v.name?.en || "-", ta: v.name?.ta || "-" };
        address = { en: v.address?.en || "-", ta: v.address?.ta || "-" };
      } else {
        name = v.name?.[lang] || v.name?.en || "-";
        address = v.address?.[lang] || v.address?.en || "-";
      }

      return { ...v, localizedName: name, localizedAddress: address };
    });

    const totalRecords = await Vendor.countDocuments(search);

    res.status(200).json({
      vendors: formatted,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      totalRecords,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const getVendorById = async (req, res) => {
  try {
    const lang = req.query.lang || "en";
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    let name =
      lang === "both"
        ? { en: vendor.name?.en, ta: vendor.name?.ta }
        : vendor.name?.[lang] || vendor.name?.en;

    let address =
      lang === "both"
        ? { en: vendor.address?.en, ta: vendor.address?.ta }
        : vendor.address?.[lang] || vendor.address?.en;

    res.status(200).json({
      ...vendor.toObject(),
      localizedName: name,
      localizedAddress: address,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const updateVendor = async (req, res) => {
  try {
    const { name, address, ...rest } = req.body;

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    vendor.name.en = name?.en || vendor.name.en;
    vendor.name.ta = name?.ta || vendor.name.ta;
    vendor.address.en = address?.en || vendor.address.en;
    vendor.address.ta = address?.ta || vendor.address.ta;

    Object.assign(vendor, rest);

    await vendor.save();
    res.status(200).json({ message: "Vendor updated successfully", vendor });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.mobile)
      return res.status(400).json({ message: "Mobile already registered" });

    res.status(500).json({ message: err.message });
  }
};


export const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.status(200).json({ message: "Vendor deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};