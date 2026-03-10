import React, { useState } from "react";
import {
    Box,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    TextField,
    IconButton,
    Button,
    FormControl,
    Select,
    MenuItem,
    Autocomplete,
    Tooltip,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";


export default function QuotationItemsTable({
    items = [],
    setItems,
    productSearchOptions = {},
    setProductSearchText,
    products = [],
    billType,
    refs,
    handleItemChange,
    handleProductCodeChange,
    handleDeleteRow,
    handleAddRow,
    focusField,
    focusNextLogicalField,
    getText,
}) {
    const [activeRow, setActiveRow] = useState(0);

    const headCellStyle = (w = 120) => ({
        fontWeight: 800,
        fontSize: 13,
        background: "#F4F6FB",
        borderBottom: "2px solid #E3E8F7",
        whiteSpace: "nowrap",
        width: w,
        minWidth: w,
        textAlign: "center",
        py: 0.7,
    });

    const bodyCellStyle = (w = 120) => ({
        fontSize: 13,
        whiteSpace: "nowrap",
        width: w,
        minWidth: w,
        textAlign: "center",
        py: 0,
        px: 0,
    });

    const moneyCell = { fontWeight: 900, fontSize: 13 };

    const classicInputSx = {
        "& .MuiOutlinedInput-root": {
            borderRadius: 0,
            background: "transparent",
            padding: 0,
            "& fieldset": { border: "none" },
            "&:hover fieldset": { border: "none" },
            "&.Mui-focused fieldset": { border: "none" },
        },
        "& input": {
            padding: "6px 6px",
            fontSize: 13,
        },
    };

    const rowHighlight = (index) => ({
        backgroundColor: activeRow === index ? "#b2ebf2" : "#ffffff",
    });

    return (
        <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>
                Items
            </Typography>

            <TableContainer
                sx={{
                    border: "1px solid #9e9e9e",
                    borderRadius: 1,
                    maxHeight: "45vh",
                    "&::-webkit-scrollbar": { height: 8, width: 8 },
                    "&::-webkit-scrollbar-thumb": { backgroundColor: "#aaa", borderRadius: 4 },
                }}
            >
                <Table stickyHeader size="small" sx={{ borderCollapse: "collapse", "& td, & th": { border: "1px solid #9e9e9e" } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headCellStyle(60)}>S.No</TableCell>
                            <TableCell sx={headCellStyle(160)}>Product Code</TableCell>
                            <TableCell sx={headCellStyle(240)}>Product Name</TableCell>
                            <TableCell sx={headCellStyle(120)}>Unit</TableCell>
                            <TableCell sx={headCellStyle(90)}>Qty</TableCell>
                            <TableCell sx={headCellStyle(140)}>Selling Price</TableCell>
                            <TableCell sx={headCellStyle(150)}>Amount</TableCell>
                            <TableCell sx={headCellStyle(80)}>CGST%</TableCell>
                            <TableCell sx={headCellStyle(80)}>SGST%</TableCell>
                            <TableCell sx={headCellStyle(100)}>HSN</TableCell>
                            <TableCell sx={headCellStyle(70)}>Del</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item, index) => {
                            const key = item.rowKey || index;
                            const safeUnitValue = item.isLoose ? "LOOSE" : (item.skuId || "__BASE__");

                            return (
                                <TableRow key={key} sx={rowHighlight(index)} onClick={() => setActiveRow(index)}>
                                    <TableCell sx={bodyCellStyle(60)}>
                                        <Typography fontWeight={900}>{index + 1}</Typography>
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(160)}>
                                        <Autocomplete
                                            size="small"
                                            freeSolo
                                            options={productSearchOptions[key] || []}
                                            inputValue={item.productCode ?? ""}
                                            value={products.find((p) => String(p._id) === String(item.productId)) || null}
                                            getOptionLabel={(p) => (typeof p === "string" ? p : `${p.productCode} - ${getText(p.name)}`)}
                                            onInputChange={(_, value, reason) => {
                                                if (reason !== "input") return;
                                                handleItemChange(index, "productCode", value);
                                                setProductSearchText((prev) => ({ ...prev, [key]: value }));
                                            }}
                                            onChange={(_, newValue) => {
                                                if (typeof newValue === "string") {
                                                    handleProductCodeChange(index, newValue.trim());
                                                } else if (newValue?.productCode) {
                                                    handleProductCodeChange(index, newValue.productCode);
                                                }
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    size="small"
                                                    sx={classicInputSx}
                                                    inputRef={(el) => (refs.current[`productCode_${index}`] = el)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleProductCodeChange(index, item.productCode);
                                                            setTimeout(() => focusNextLogicalField({ refs, currentKey: `productCode_${index}`, items }), 50);
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(240)}>
                                        <Typography fontWeight={800} sx={{ px: 1 }}>{getText(item.name) || "—"}</Typography>
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(120)}>
                                        <FormControl fullWidth size="small">
                                            <Select
                                                value={safeUnitValue}
                                                sx={classicInputSx}
                                                inputProps={{ ref: (el) => (refs.current[`unit_${index}`] = el) }}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleItemChange(index, "unit", val);
                                                    setTimeout(() => refs.current[`qty_${index}`]?.focus(), 50);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        refs.current[`qty_${index}`]?.focus();
                                                    }
                                                }}
                                            >
                                                <MenuItem value="__BASE__">{getText(item.productBaseUnit) || "Base"}</MenuItem>
                                                {(item.skuList || []).map((sku) => (
                                                    <MenuItem key={sku._id} value={sku._id}>{getText(sku.sellUnit)}</MenuItem>
                                                ))}
                                                {["kg", "l", "ltr"].includes(String(item.productBaseUnit || "").toLowerCase()) && (
                                                    <MenuItem value="LOOSE">Loose</MenuItem>
                                                )}
                                            </Select>
                                        </FormControl>
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(90)}>
                                        <TextField
                                            type="number"
                                            size="small"
                                            fullWidth
                                            sx={classicInputSx}
                                            value={item.quantity || ""}
                                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                            inputRef={(el) => (refs.current[`qty_${index}`] = el)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    focusField(refs, `sellingPrice_${index}`);
                                                }
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(140)}>
                                        <TextField
                                            type="number"
                                            size="small"
                                            fullWidth
                                            sx={classicInputSx}
                                            value={item.sellingPrice || ""}
                                            onChange={(e) => handleItemChange(index, "sellingPrice", e.target.value)}
                                            inputRef={(el) => (refs.current[`sellingPrice_${index}`] = el)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    const isLastRow = index === items.length - 1;
                                                    if (isLastRow) {
                                                        handleAddRow();
                                                        setTimeout(() => focusField(refs, `productCode_${index + 1}`), 100);
                                                    } else {
                                                        focusField(refs, `productCode_${index + 1}`);
                                                    }
                                                }
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(150)}>
                                        <Typography sx={{ ...moneyCell, px: 1 }}>₹ {Number(item.total || 0).toFixed(2)}</Typography>
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(80)}>
                                        <Typography fontWeight={800}>{billType === "WITHOUT_GST" ? 0 : Number(item.cgstPercentage || 0)}</Typography>
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(80)}>
                                        <Typography fontWeight={800}>{billType === "WITHOUT_GST" ? 0 : Number(item.sgstPercentage || 0)}</Typography>
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(100)}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            sx={classicInputSx}
                                            value={item.hsnCode || ""}
                                            onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                                            placeholder="HSN"
                                        />
                                    </TableCell>

                                    <TableCell sx={bodyCellStyle(70)}>
                                        <Tooltip title="Delete Row">
                                            <IconButton color="error" onClick={() => handleDeleteRow(index)} size="small">
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={2}>
                <Button startIcon={<Add />} variant="outlined" onClick={handleAddRow}>
                    Add Product
                </Button>
            </Box>
        </Box>
    );
}
