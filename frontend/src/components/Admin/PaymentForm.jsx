import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { recordCustomerPayment } from "../../api/adminApi";

const PaymentForm = ({ open, handleClose, customer, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const paying = Number(amount || 0);
    const balance = Number(customer.remainingBalance || 0);

    if (!amount) return toast.warn("Enter amount");

    if (paying > balance) {
      return toast.error(`Amount exceeds remaining balance (Max: ₹${balance})`);
    }

    try {
      setLoading(true);

      await recordCustomerPayment({
        customerId: customer._id,
        amount: Number(amount),
        paymentMode,
        note,
      });

      toast.success(" Payment recorded successfully");

      onSuccess?.();
      handleClose();
      setAmount("");
      setNote("");
      setPaymentMode("Cash");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      {/* <DialogTitle>Receive Payment - {customer?.customerName}</DialogTitle> */}
      <DialogTitle>
        Receive Payment -{" "}
        {typeof customer?.customerName === "object"
          ? customer.customerName.en
          : customer?.customerName}
      </DialogTitle>

      <DialogContent dividers>
        {Number(customer?.remainingBalance) <= 0 && (
          <Typography color="error" fontWeight="bold" mb={2}>
            Customer has no outstanding balance — Payment not allowed!
          </Typography>
        )}

        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <Typography variant="body2" sx={{ color: "red", mb: 1 }}>
            Remaining Balance: ₹{Number(customer?.remainingBalance || 0)}
          </Typography>

          <TextField
            label="Amount"
            type="number"
            fullWidth
            sx={{ mb: 2 }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <TextField
            select
            label="Payment Mode"
            fullWidth
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Card">Card</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>

          <TextField
            label="Note (optional)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || Number(customer?.remainingBalance) <= 0}
        >
          {loading ? "Saving..." : "Save Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentForm;
