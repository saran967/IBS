import React, { useEffect, useState, useRef, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Autocomplete,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    IconButton,
    FormControl,
    Select,
    MenuItem,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import { Add, Delete, Save } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { useParams, useNavigate } from "react-router-dom";
import getLocalizedText from "../../utils/getLocalizedText";

export default function CreateQuotation() {
    const { lang = "en" } = useParams();
    const navigate = useNavigate();

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [saleType, setSaleType] = useState("B2C");
    const [billType, setBillType] = useState("GST");
    const [priceTier, setPriceTier] = useState("R");
    const [productOptions, setProductOptions] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const refs = useRef({});
    const debounceTimeouts = useRef({});

    const getText = (val) => getLocalizedText(val, lang);

    const numeric = (v) => {
        if (v === "" || v === null || v === undefined) return 0;
        const n = Number(v);
        return Number.isNaN(n) ? 0 : n;
    };

    const getProductPriceByTier = (product, tier, fallback = 0) => {
        if (!product) return numeric(fallback);
        let price = product.sellingPrice ?? fallback;
        if (tier === "W") price = product.sellingPriceforB2B ?? price;
        if (tier === "SW") price = product.sellingPriceforAgent ?? price;
        return numeric(price);
    };

    const getSkuPriceByTier = (sku, tier, fallback = 0) => {
        if (!sku) return numeric(fallback);
        let price = sku.retailPrice ?? fallback;
        if (tier === "W") price = sku.wholesalePrice ?? price;
        if (tier === "SW") price = sku.agentPrice ?? price;
        return numeric(price);
    };

    const createRow = () => ({
        rowKey: crypto.randomUUID(),
        productId: "",
        productCode: "",
        name: "",
        quantity: 1,
        unit: "__BASE__",
        sellingPrice: 0,
        cgstPercentage: 0,
        sgstPercentage: 0,
        total: 0,
        productBaseUnit: "",
        skuList: [],
        hsnCode: "",
        isLoose: false,
        skuId: "",
        productDoc: null,
    });

    const [items, setItems] = useState([createRow()]);
    const [totals, setTotals] = useState({
        gross: 0,
        discount: "",
        net: 0,
    });

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const res = await customFetch.get("/customer");
                setCustomers(res.data.customers || []);
            } catch (err) {
                toast.error("Failed to load customers");
            }
        };
        fetchCustomers();
    }, []);

    const handleProductSearch = async (index, query) => {
        if (!query || query.length < 2) {
            setProductOptions((prev) => ({ ...prev, [index]: [] }));
            return;
        }
        if (debounceTimeouts.current[index]) clearTimeout(debounceTimeouts.current[index]);
        debounceTimeouts.current[index] = setTimeout(async () => {
            try {
                const res = await customFetch.get(`/product/search?q=${encodeURIComponent(query)}`);
                setProductOptions((prev) => ({ ...prev, [index]: res.data.products || [] }));
            } catch {
                setProductOptions((prev) => ({ ...prev, [index]: [] }));
            }
        }, 300);
    };

    const loadProductSkus = async (productId) => {
        if (!productId) return [];
        try {
            const res = await customFetch.get(`/retail-skus/product/${productId}`);
            return res.data?.data || [];
        } catch {
            return [];
        }
    };

    const recalcTotals = (rows, updatedDiscount = null, billTypeOverride = billType) => {
        let grossTotal = 0;
        const disc = updatedDiscount !== null ? numeric(updatedDiscount) : numeric(totals.discount);
        const activeBillType = billTypeOverride || billType;

        const updatedRows = rows.map((item) => {
            if (!item.productId) return item;
            const qty = numeric(item.quantity);
            const price = numeric(item.sellingPrice);
            const cgst = activeBillType === "WITHOUT_GST" ? 0 : numeric(item.cgstPercentage);
            const sgst = activeBillType === "WITHOUT_GST" ? 0 : numeric(item.sgstPercentage);

            const cgstAmt = (price * cgst) / 100;
            const sgstAmt = (price * sgst) / 100;

            const rowTotal = activeBillType === "WITHOUT_GST"
                ? price * qty
                : (price + cgstAmt + sgstAmt) * qty;

            grossTotal += rowTotal;
            return { ...item, total: rowTotal };
        });

        setItems(updatedRows);
        setTotals({
            gross: grossTotal,
            discount: updatedDiscount !== null ? updatedDiscount : totals.discount,
            net: grossTotal - disc,
        });
    };

    const handleProductSelect = async (index, product) => {
        const updated = [...items];
        if (!product) {
            updated[index] = createRow();
            setItems(updated);
            recalcTotals(updated);
            return;
        }
        const skuList = Array.isArray(product.skus) && product.skus.length
            ? product.skus
            : await loadProductSkus(product._id);
        const initialPrice = getProductPriceByTier(product, priceTier, 0);

        updated[index] = {
            ...updated[index],
            productId: product._id,
            productCode: product.productCode || "",
            name: product.name,
            sellingPrice: initialPrice,
            cgstPercentage: product.cgstPercentage || 0,
            sgstPercentage: product.sgstPercentage || 0,
            productBaseUnit: product.unit,
            skuList,
            hsnCode: product.hsnCode || "",
            productDoc: { ...product, skus: skuList },
            unit: "__BASE__",
            skuId: "",
            isLoose: false,
        };
        recalcTotals(updated);
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;

        if (field === "unit") {
            const row = updated[index];
            const basePrice = getProductPriceByTier(row.productDoc, priceTier, row.sellingPrice);
            if (value === "LOOSE") {
                row.isLoose = true;
                row.skuId = "";
                row.sellingPrice = basePrice;
            } else if (value === "__BASE__") {
                row.isLoose = false;
                row.skuId = "";
                row.sellingPrice = basePrice;
            } else {
                row.isLoose = false;
                row.skuId = value;
                const selectedSku = (row.skuList || []).find(
                    (sku) => String(sku._id) === String(value),
                );
                row.sellingPrice = getSkuPriceByTier(selectedSku, priceTier, basePrice);
            }
        }

        recalcTotals(updated);
    };

    const handleAddRow = () => setItems([...items, createRow()]);
    const handleDeleteRow = (index) => {
        const updated = items.filter((_, i) => i !== index);
        if (!updated.length) updated.push(createRow());
        recalcTotals(updated);
    };

    const handleSubmit = async () => {
        if (!selectedCustomer) return toast.error("Please select a customer");
        const validItems = items.filter((it) => it.productId && numeric(it.quantity) > 0);
        if (!validItems.length) return toast.error("Please add at least one valid item");

        setSubmitting(true);
        try {
            const payload = {
                customerId: selectedCustomer._id,
                saleType,
                billType,
                priceTier,
                discount: numeric(totals.discount),
                items: validItems.map((it) => ({
                    productId: it.productId,
                    quantity: numeric(it.quantity),
                    sellingPrice: numeric(it.sellingPrice),
                    skuId: it.skuId || undefined,
                    isLoose: it.isLoose,
                })),
            };

            const res = await customFetch.post("/quotations", payload);
            if (res.data.success) {
                toast.success("Quotation created successfully");
                navigate(`/${lang}/admin/quotations/${res.data.quotation._id}/print`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save quotation");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Styles ---
    const headCellStyle = (w = 120) => ({
        fontWeight: 800,
        fontSize: 13,
        background: "#F4F6FB",
        borderBottom: "2px solid #E3E8F7",
        whiteSpace: "nowrap",
        width: w,
        minWidth: w,
        textAlign: "center",
        py: 1,
    });

    const bodyCellStyle = (w = 120) => ({
        fontSize: 13,
        whiteSpace: "nowrap",
        width: w,
        minWidth: w,
        textAlign: "center",
        py: 0.5,
        px: 1,
        borderRight: '1px solid #E3E8F7',
    });

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
            padding: "6px 8px",
            fontSize: 13,
            textAlign: 'center',
        },
    };

    return (
        <Box sx={{ p: 4, background: '#F8FAFD', minHeight: '100vh' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={900} sx={{ color: '#1A237E' }}>
                    Create New Quotation
                </Typography>
                <Box display="flex" gap={2}>
                    <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button
                        variant="contained"
                        startIcon={<Save />}
                        color="primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
                    >
                        {submitting ? "Saving..." : "Save Quotation"}
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', ml: 1 }}>CUSTOMER</Typography>
                        <Autocomplete
                            options={customers}
                            getOptionLabel={(o) => getText(o.customerName)}
                            value={selectedCustomer}
                            onChange={(_, val) => {
                                setSelectedCustomer(val);
                                if (val?.customerType) setSaleType(val.customerType);
                            }}
                            renderInput={(params) => <TextField {...params} size="small" placeholder="Select Customer" fullWidth />}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', ml: 1 }}>SALE TYPE</Typography>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={saleType}
                            onChange={(e) => setSaleType(e.target.value)}
                        >
                            <MenuItem value="B2C">B2C (Retail)</MenuItem>
                            <MenuItem value="B2B">B2B (Business)</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', ml: 1 }}>PRICE TIER</Typography>
                        <Box>
                            <ToggleButtonGroup
                                value={priceTier}
                                exclusive
                                size="small"
                                onChange={(_, val) => val && setPriceTier(val)}
                                fullWidth
                                sx={{ height: 40 }}
                            >
                                <ToggleButton value="R">Retail</ToggleButton>
                                <ToggleButton value="W">Wholesale</ToggleButton>
                                <ToggleButton value="SW">Semi</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', ml: 1 }}>GST SETTING</Typography>
                        <Box>
                            <ToggleButtonGroup
                                value={billType}
                                exclusive
                                size="small"
                                onChange={(_, val) => {
                                    if (val) {
                                        setBillType(val);
                                        recalcTotals(items, null, val);
                                    }
                                }}
                                fullWidth
                                sx={{ height: 40 }}
                            >
                                <ToggleButton value="GST">With GST</ToggleButton>
                                <ToggleButton value="WITHOUT_GST">No GST</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer
                component={Paper}
                sx={{
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    border: '1px solid #E3E8F7'
                }}
            >
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headCellStyle(60)}>S.No</TableCell>
                            <TableCell sx={headCellStyle(200)}>Product Search</TableCell>
                            <TableCell sx={headCellStyle(240)}>Product Name</TableCell>
                            <TableCell sx={headCellStyle(140)}>Unit (SKU)</TableCell>
                            <TableCell sx={headCellStyle(90)}>Qty</TableCell>
                            <TableCell sx={headCellStyle(120)}>Price (₹)</TableCell>
                            <TableCell sx={headCellStyle(150)}>Amount (₹)</TableCell>
                            <TableCell sx={headCellStyle(70)}>Del</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={item.rowKey} hover>
                                <TableCell sx={bodyCellStyle(60)}>
                                    <Typography fontWeight={900} color="primary">{index + 1}</Typography>
                                </TableCell>
                                <TableCell sx={bodyCellStyle(200)}>
                                    <Autocomplete
                                        size="small"
                                        freeSolo
                                        options={productOptions[index] || []}
                                        getOptionLabel={(p) => (typeof p === "string" ? p : `${p.productCode} - ${getText(p.name)}`)}
                                        onInputChange={(_, val) => handleProductSearch(index, val)}
                                        onChange={(_, val) => handleProductSelect(index, val)}
                                        value={item.productDoc}
                                        renderInput={(params) => (
                                            <TextField {...params} sx={classicInputSx} placeholder="Code / Name" />
                                        )}
                                    />
                                </TableCell>
                                <TableCell sx={bodyCellStyle(240)}>
                                    <Typography fontWeight={700} sx={{ textAlign: 'left' }}>{getText(item.name) || "—"}</Typography>
                                </TableCell>
                                <TableCell sx={bodyCellStyle(140)}>
                                    <FormControl fullWidth size="small" variant="standard">
                                        <Select
                                            value={item.isLoose ? "LOOSE" : (item.skuId || "__BASE__")}
                                            onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                            disabled={!item.productId}
                                            sx={{ fontSize: 13, textAlign: 'center' }}
                                            disableUnderline
                                        >
                                            <MenuItem value="__BASE__">{getText(item.productBaseUnit) || "Base"}</MenuItem>
                                            {(item.skuList || []).map((sku) => (
                                                <MenuItem key={sku._id} value={sku._id}>{getText(sku.sellUnit)} ({sku.baseQty})</MenuItem>
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
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                        sx={classicInputSx}
                                    />
                                </TableCell>
                                <TableCell sx={bodyCellStyle(120)}>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={item.sellingPrice}
                                        onChange={(e) => handleItemChange(index, "sellingPrice", e.target.value)}
                                        sx={classicInputSx}
                                    />
                                </TableCell>
                                <TableCell sx={bodyCellStyle(150)}>
                                    <Typography fontWeight={900} color="#2E7D32">
                                        ₹ {Number(item.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ ...bodyCellStyle(70), borderRight: 'none' }}>
                                    <Tooltip title="Delete Row">
                                        <IconButton color="error" onClick={() => handleDeleteRow(index)} size="small">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
                <Button
                    startIcon={<Add />}
                    variant="contained"
                    onClick={handleAddRow}
                    sx={{ borderRadius: 4, background: '#1A237E', "&:hover": { background: '#0D47A1' } }}
                >
                    Add Product Row
                </Button>
            </Box>

            <Paper sx={{ p: 4, mt: 4, borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                <Grid container spacing={4} justifyContent="flex-end">
                    <Grid item xs={12} md={4}>
                        <Box display="flex" justifyContent="space-between" mb={2}>
                            <Typography color="text.secondary" fontWeight={700}>Gross Amount:</Typography>
                            <Typography fontWeight={800}>₹ {totals.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography color="text.secondary" fontWeight={700}>Discount (₹):</Typography>
                            <TextField
                                size="small"
                                type="number"
                                value={totals.discount}
                                onChange={(e) => recalcTotals(items, e.target.value)}
                                sx={{ width: 120, "& .MuiInputBase-input": { textAlign: 'right', fontWeight: 800 } }}
                            />
                        </Box>
                        <Box sx={{ borderTop: '2px dashed #E3E8F7', pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h5" fontWeight={900} color="#1A237E">Net Quote Total:</Typography>
                            <Typography variant="h4" fontWeight={900} color="#2E7D32">
                                ₹ {totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
}
