import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";
import customFetch from "../utils/customFetch";

export default function VendorPayment() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { lang } = useParams();

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const { data } = await customFetch.get("/vendors");
        setVendors(data.vendors || []);
      } catch {
        toast.error("Failed to load vendors");
      }
    };
    loadVendors();
  }, []);

  const submitPayment = async () => {
    if (!vendorId || !amount) return toast.warn("All fields required");

    setLoading(true);
    try {
      await customFetch.post("/vendorsLedger/vendor-payments", {
        vendorId,
        amount,
        mode,
        reference,
        notes,
      });

      toast.success("Repayment added successfully");

      navigate(`/${lang}/admin/vendors-ledger?vendor=${vendorId}`);
    } catch (err) {
      toast.error("Failed to add repayment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Vendor Repayment
      </Typography>

      <Paper sx={{ p: 2, maxWidth: 500 }}>
        <TextField
          select
          label="Select Vendor"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="">Select Vendor</MenuItem>
          {/* {vendors.map((v) => (
            <MenuItem key={v._id} value={v._id}>
              {v.name}
            </MenuItem>
          ))} */}
{vendors.map((v) => (
  <MenuItem key={v._id} value={v._id}>
    {v.vendorCode} - {v.name?.en || "-"}
  </MenuItem>
))}

        </TextField>

        <TextField
          label="Amount"
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          select
          label="Payment Mode"
          value={mode}
          fullWidth
          onChange={(e) => setMode(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="Cash">Cash</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
          <MenuItem value="Bank">Bank Transfer</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </TextField>

        <TextField
          label="Reference (Txn ID / Cheque No)"
          fullWidth
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Notes"
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={submitPayment}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Submit Payment"}
        </Button>
      </Paper>
    </Box>
  );
}
