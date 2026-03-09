import React from "react";
import {
  Box,
  Typography,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { toast } from "react-toastify";

export default function TotalsSection({
  totals,
  items,
  isSaved,
  refs,
  recalcTotals,
  updateTabData,
  tabId,
  handleEnterInField,

  //  NEW props for bottom buttons
  billType,
  handleBillTypeChange,
  paymentSplits,
  setPaymentSplits,
}) {
  const numeric = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const handleTotalFieldChange = (field, value) => {
    if (isSaved) return;

    // allow empty input
    if (value === "") {
      const cleared = { ...totals, [field]: "" };
      recalcTotals(items, cleared);
      updateTabData(tabId, { totals: cleared });
      return;
    }

    const num = Number(value);
    if (Number.isNaN(num)) return;

    //  Discount cannot be greater than Gross
    if (field === "discount" && num > numeric(totals.gross)) {
      toast.error("Discount cannot be greater than Gross Total");
      return;
    }

    //  Paid cannot be greater than Net
    if (field === "paid" && num > numeric(totals.net)) {
      toast.error("Paid amount cannot be greater than Net Total");
      return;
    }

    const newTotals = { ...totals, [field]: num };

    recalcTotals(items, newTotals);

    updateTabData(tabId, {
      totals: {
        ...newTotals,
        gross: totals.gross,
        net: totals.net,
        balance: totals.balance,
      },
    });
  };

  return (
    <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 3, mt: 3 }}>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
        Totals
      </Typography>

      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        {/* Gross */}
        <TextField
          label="Gross Total"
          size="small"
          value={Number(totals.gross || 0).toFixed(2)}
          disabled
          sx={{ width: 190 }}
        />

        {/* Discount */}
        <TextField
          label="Discount"
          type="number"
          size="small"
          value={totals.discount === "" ? "" : totals.discount}
          onChange={(e) => handleTotalFieldChange("discount", e.target.value)}
          sx={{ width: 190 }}
          disabled={isSaved}
          inputRef={(el) => (refs.current["discount"] = el)}
          onKeyDown={(e) => handleEnterInField(e, "discount")}
          inputProps={{ min: 0, max: numeric(totals.gross) }}
        />

        {/* Net */}
        <TextField
          label="Net Total"
          size="small"
          value={Number(totals.net || 0).toFixed(2)}
          disabled
          sx={{
            width: 190,
            "& .MuiInputBase-input": {
              fontWeight: 800,
              fontSize: "18px",
            },
          }}
        />

        {/* Paid */}
        {/* <TextField
          label="Paid"
          type="number"
          size="small"
          value={totals.paid === "" ? "" : totals.paid}
          onChange={(e) => handleTotalFieldChange("paid", e.target.value)}
          sx={{ width: 190 }}
          disabled={isSaved}
          inputRef={(el) => (refs.current["paid"] = el)}
          onKeyDown={(e) => handleEnterInField(e, "paid")}
          inputProps={{ min: 0, max: numeric(totals.net) }}
        /> */}
        {/* Payment Split Section */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {paymentSplits.map((p, idx) => (
            <Box key={idx} sx={{ display: "flex", gap: 1 }}>
              <ToggleButtonGroup
                value={p.mode}
                exclusive
                size="small"
                onChange={(e, val) => {
                  if (!val) return;
                  const copy = [...paymentSplits];
                  copy[idx].mode = val;
                  setPaymentSplits(copy);
                }}
                disabled={isSaved}
              >
                <ToggleButton value="CASH">Cash</ToggleButton>
                <ToggleButton value="UPI">UPI</ToggleButton>
                <ToggleButton value="CARD">Card</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                label="Amount"
                type="number"
                size="small"
                value={p.amount}
                disabled={isSaved}
                onChange={(e) => {
                  const copy = [...paymentSplits];
                  copy[idx].amount = e.target.value;
                  setPaymentSplits(copy);
                }}
                sx={{ width: 120 }}
              />
            </Box>
          ))}

          {/* Add Payment Row */}
          {!isSaved && (
            <Typography
              sx={{ cursor: "pointer", color: "primary.main", mt: 1 }}
              onClick={() =>
                setPaymentSplits([
                  ...paymentSplits,
                  { mode: "CASH", amount: "" },
                ])
              }
            >
              + Add Payment Mode
            </Typography>
          )}
        </Box>

        {/*  Bill Type Buttons (Near Paid) */}
        <ToggleButtonGroup
          value={billType}
          exclusive
          size="small"
          onChange={(e, val) => {
            if (!val) return;
            handleBillTypeChange(e, val);
          }}
          disabled={isSaved}
          sx={{ height: 40 }}
        >
          <ToggleButton value="GST">GST</ToggleButton>
          <ToggleButton value="WITHOUT_GST">Without GST</ToggleButton>
        </ToggleButtonGroup>

        {/* Balance */}
        <TextField
          label="Balance"
          size="small"
          value={Number(totals.balance || 0).toFixed(2)}
          disabled
          sx={{ width: 190 }}
        />
      </Box>
    </Box>
  );
}
