import React from "react";
import {
    Box,
    Typography,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";

export default function QuotationTotalsSection({
    totals,
    items,
    refs,
    recalcTotals,
    billType,
    setBillType,
    priceTier,
    setPriceTier,
}) {
    const numeric = (v) => {
        if (v === "" || v === null || v === undefined) return 0;
        const n = Number(v);
        return Number.isNaN(n) ? 0 : n;
    };

    const handleTotalFieldChange = (field, value) => {
        const newTotals = { ...totals, [field]: value };
        recalcTotals(items, newTotals);
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
                    value={totals.discount}
                    onChange={(e) => handleTotalFieldChange("discount", e.target.value)}
                    sx={{ width: 190 }}
                    inputRef={(el) => (refs.current["discount"] = el)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            refs.current["saveBtn"]?.focus();
                        }
                    }}
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

                {/* Bill Type */}
                <Box>
                    <Typography variant="caption" display="block">Bill Type</Typography>
                    <ToggleButtonGroup
                        value={billType}
                        exclusive
                        size="small"
                        onChange={(_, val) => val && setBillType(val)}
                    >
                        <ToggleButton value="GST">GST</ToggleButton>
                        <ToggleButton value="WITHOUT_GST">No GST</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* Price Tier */}
                <Box>
                    <Typography variant="caption" display="block">Price Tier</Typography>
                    <ToggleButtonGroup
                        value={priceTier}
                        exclusive
                        size="small"
                        onChange={(_, val) => val && setPriceTier(val)}
                    >
                        <ToggleButton value="R">Retail</ToggleButton>
                        <ToggleButton value="W">Wholesale</ToggleButton>
                        <ToggleButton value="SW">Semi</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>
        </Box>
    );
}
