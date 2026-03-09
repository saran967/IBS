import { Box, Paper, Typography } from "@mui/material";

export default function CustomerLedger() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Customer Ledger
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography>
          This is a dummy page for Customer Ledger. Display customer invoice,
          payment and outstanding balance here.
        </Typography>
      </Paper>
    </Box>
  );
}