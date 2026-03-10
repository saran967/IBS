import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import getLocalizedText from "../../../../utils/getLocalizedText";

export default function CustomerSection({
  compact = false,
  customers = [],
  selectedCustomer,
  handleCustomerChange,
  setOpenCustomerModal,
  saleType,
  isSaved,
  refs,
  handleEnterInField,
  searchCustomer,
  setSearchCustomer,

  priceTier,
  setPriceTier,
}) {
  return (
    <Box
      sx={{
        border: "1px solid #ddd",
        borderRadius: 2,
        p: compact ? 1.5 : 3,
        mt: 1,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
          Customer Details
        </Typography>

        <Box display="flex" alignItems="center" gap={1}>
          <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}>
            Price Tier:
          </Typography>
          <ToggleButtonGroup
            value={priceTier}
            exclusive
            onChange={(e, val) => val && setPriceTier(val)}
            size="small"
            disabled={isSaved}
            sx={{ height: 30 }}
          >
            <ToggleButton value="R" sx={{ px: 1.5, fontSize: 11, fontWeight: 700 }}>R</ToggleButton>
            <ToggleButton value="W" sx={{ px: 1.5, fontSize: 11, fontWeight: 700 }}>W</ToggleButton>
            <ToggleButton value="SW" sx={{ px: 1.5, fontSize: 11, fontWeight: 700 }}>SW</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <FormControl fullWidth size="small">
        <InputLabel>Select Customer *</InputLabel>
        <Select
          value={selectedCustomer}
          label="Select Customer *"
          onChange={(e) => {
            if (e.target.value === "new") {
              setOpenCustomerModal(true);
            } else {
              handleCustomerChange(e);
            }
          }}
          disabled={isSaved}
          onKeyDown={(e) => handleEnterInField(e, "customer")}
          inputRef={(el) => (refs.current["customer"] = el)}
          onClose={() => setSearchCustomer("")}
          MenuProps={{
            PaperProps: {
              sx: { maxHeight: 350 },
            },
          }}
        >
          {/* SEARCH BOX */}
          <MenuItem
            disableRipple
            disableTouchRipple
            onClick={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <TextField
              autoFocus
              placeholder="Search customer..."
              fullWidth
              size="small"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              onChange={(e) => setSearchCustomer(e.target.value.toLowerCase())}
              sx={{
                "& .MuiOutlinedInput-root": {
                  padding: "4px",
                },
              }}
            />
          </MenuItem>

          {/* NEW CUSTOMER */}
          <MenuItem value="new" sx={{ color: "green", fontWeight: 600 }}>
            + Add New Customer
          </MenuItem>

          {/* CUSTOMER LIST */}
          {customers
            .filter((c) => {
              const name = getLocalizedText(c.customerName).toLowerCase();
              const type = (c.customerType || "").toLowerCase();

              return (
                name.includes(searchCustomer || "") ||
                type.includes(searchCustomer || "")
              );
            })
            .map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {getLocalizedText(c.customerName)} —{" "}
                <strong style={{ color: "#1976d2" }}>
                  {c.customerType?.toUpperCase()}
                </strong>
              </MenuItem>
            ))}
        </Select>

        <Box display="flex" justifyContent="space-between" mt={1}>
          <Typography sx={{ fontSize: 12 }}>
            Type: <strong>{saleType}</strong>
          </Typography>
        </Box>
      </FormControl>
    </Box>
  );
}
