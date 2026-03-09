import React from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

export default function SalesTopBar({
  billType,
  handleBillTypeChange,
  paymentMethod,
  setPaymentMethod,
  isSaved,
}) {
  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        alignItems: { xs: "flex-start", sm: "center" },
      }}
    >
      {/* Bill Type */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography
          sx={{ fontSize: 13, color: "text.secondary", minWidth: 80 }}
        >
          Bill Type:
        </Typography>

        <ToggleButtonGroup
          value={billType}
          exclusive
          onChange={handleBillTypeChange}
          size="small"
        >
          <ToggleButton value="GST">GST</ToggleButton>
          <ToggleButton value="WITHOUT_GST">WITHOUT GST</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Payment Method */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            color: "text.secondary",
            minWidth: { sm: 120 },
          }}
        >
          Payment Method:
        </Typography>

        <FormControl size="small" fullWidth sx={{ minWidth: { sm: 200 } }}>
          <InputLabel>Payment Method</InputLabel>
          <Select
            value={paymentMethod}
            label="Payment Method"
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={isSaved}
          >
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            <MenuItem value="CHEQUE">Cheque</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
}
