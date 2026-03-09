import React, { useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import customFetch from "../utils/customFetch.js";
import { toast } from "react-toastify";

export default function VendorForm({ onSuccess }) {
  const [form, setForm] = useState({
    name_en: "",
    name_ta: "",
    address_en: "",
    address_ta: "",
    companyName: "",
    email: "",
    mobile: "",
    gstNumber: "",
    status: "Active",
     creditLimit: 100000,
  openingBalance: 0,
  dueDays: 15,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    const payload = {
      name: {
        en: form.name_en,
        ta: form.name_ta,
      },
      address: {
        en: form.address_en,
        ta: form.address_ta,
      },
      companyName: form.companyName,
      email: form.email,
      mobile: form.mobile,
      gstNumber: form.gstNumber,
      status: form.status,
      creditLimit: Number(form.creditLimit || 100000),
openingBalance: Number(form.openingBalance || 0),
dueDays: Number(form.dueDays || 15),
    };

    try {
      const res = await customFetch.post("/vendors", payload);
      toast.success("Vendor added");
      onSuccess?.(res.data.vendor);
    } catch {
      toast.error("Failed to add vendor");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField label="Name (EN)" name="name_en" onChange={handleChange} />
      <TextField label="Name (TA)" name="name_ta" onChange={handleChange} />

      <TextField label="Company" name="companyName" onChange={handleChange} />

      <TextField label="Email" name="email" onChange={handleChange} />
      <TextField label="Mobile" name="mobile" onChange={handleChange} />
      <TextField label="GST Number" name="gstNumber" onChange={handleChange} />

      <TextField
        label="Address (EN)"
        name="address_en"
        onChange={handleChange}
        multiline
      />
      <TextField
        label="Address (TA)"
        name="address_ta"
        onChange={handleChange}
        multiline
      />
      <TextField
  label="Credit Limit"
  name="creditLimit"
  type="number"
  value={form.creditLimit}
  onChange={handleChange}
/>

<TextField
  label="Opening Balance"
  name="openingBalance"
  type="number"
  value={form.openingBalance}
  onChange={handleChange}
/>
<TextField
  label="Due Days"
  name="dueDays"
  type="number"
  value={form.dueDays}
  onChange={handleChange}
/>

      <Button variant="contained" onClick={handleSubmit}>
        Save Vendor
      </Button>
    </Box>
  );
}