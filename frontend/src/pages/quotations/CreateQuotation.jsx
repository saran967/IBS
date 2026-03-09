import React, { useEffect, useState, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    TextField,
    Autocomplete,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    MenuItem,
    IconButton,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { useParams, useNavigate } from "react-router-dom";
import { FaTrash, FaPlus } from "react-icons/fa";

export default function CreateQuotation() {
    const { lang = "en" } = useParams();
    const navigate = useNavigate();

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [saleType, setSaleType] = useState("B2C");
    const [billType, setBillType] = useState("GST");
    const [priceTier, setPriceTier] = useState("R");
    const [discount, setDiscount] = useState(0);

    const [products, setProducts] = useState([]);
    const [productOptions, setProductOptions] = useState({});

    const createRow = () => ({
        rowKey: crypto.randomUUID(),
        productId: null,
        productCode: "",
        name: "",
        quantity: 1,
        unit: "",
        sellingPrice: 0,
        cgstPercentage: 0,
        sgstPercentage: 0,
        total: 0,
        productDoc: null,
    });

    const [items, setItems] = useState([createRow()]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const custRes = await customFetch.get("/customer");
                setCustomers(custRes.data.customers || []);
            } catch (err) {
                toast.error("Failed to fetch customers");
            }
        };
        fetchData();
    }, []);

    const handleProductSearch = async (index, query) => {
        if (!query || query.length < 2) return;
        try {
            const res = await customFetch.get(`/product/search?q=${encodeURIComponent(query)}`);
            setProductOptions((prev) => ({ ...prev, [index]: res.data.products || [] }));
        } catch {
            setProductOptions((prev) => ({ ...prev, [index]: [] }));
        }
    };

    const recalcTotals = (currentItems, currentDiscount) => {
        let newItems = [...currentItems];
        newItems = newItems.map((item) => {
            if (!item.productId) return item;
            const qty = Number(item.quantity || 0);
            const price = Number(item.sellingPrice || 0);

            const cgst = billType === "WITHOUT_GST" ? 0 : Number(item.cgstPercentage || 0);
            const sgst = billType === "WITHOUT_GST" ? 0 : Number(item.sgstPercentage || 0);

            const cgstAmt = (price * cgst) / 100;
            const sgstAmt = (price * sgst) / 100;

            const total =
                billType === "WITHOUT_GST"
                    ? price * qty
                    : (price + cgstAmt + sgstAmt) * qty;

            return { ...item, total };
        });

        setItems(newItems);
    };

    const handleProductSelect = (index, productObj) => {
        const updated = [...items];
        if (!productObj) {
            updated[index] = createRow();
            setItems(updated);
            return;
        }

        let initialPrice = productObj.sellingPrice ?? 0;
        if (priceTier === "W") initialPrice = productObj.sellingPriceforB2B ?? initialPrice;
        if (priceTier === "SW") initialPrice = productObj.sellingPriceforAgent ?? initialPrice;

        updated[index] = {
            ...updated[index],
            productId: productObj._id,
            productCode: productObj.productCode || "",
            name: productObj.name?.en || "",
            sellingPrice: initialPrice,
            cgstPercentage: productObj.cgstPercentage || 0,
            sgstPercentage: productObj.sgstPercentage || 0,
            unit: productObj.unit?.en || "",
            productDoc: productObj,
        };
        recalcTotals(updated, discount);
    };

    const grossTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const netTotal = grossTotal - Number(discount || 0);

    const handleSubmit = async () => {
        if (!selectedCustomer) return toast.error("Please select a customer");

        const validItems = items.filter((i) => i.productId && i.quantity > 0);
        if (!validItems.length) return toast.error("Please add at least one valid item");

        try {
            const payload = {
                customerId: selectedCustomer._id,
                saleType,
                billType,
                priceTier,
                discount: Number(discount || 0),
                items: validItems.map(it => ({
                    productId: it.productId,
                    quantity: Number(it.quantity),
                    sellingPrice: Number(it.sellingPrice),
                })),
            };

            const res = await customFetch.post("/quotations", payload);
            if (res.data.success) {
                toast.success("Quotation created successfully!");
                navigate(`/${lang}/admin/quotations/${res.data.quotation._id}/print`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Failed to create quotation");
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight="bold" mb={3}>
                Create Quotation
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Autocomplete
                            options={customers}
                            getOptionLabel={(opt) => opt.customerName?.en || opt.customerName || ""}
                            value={selectedCustomer}
                            onChange={(_, val) => {
                                setSelectedCustomer(val);
                                if (val?.customerType) setSaleType(val.customerType);
                            }}
                            renderInput={(params) => <TextField {...params} label="Customer" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Sale Type"
                            value={saleType}
                            onChange={(e) => setSaleType(e.target.value)}
                        >
                            <MenuItem value="B2C">B2C</MenuItem>
                            <MenuItem value="B2B">B2B</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Bill Type"
                            value={billType}
                            onChange={(e) => {
                                setBillType(e.target.value);
                                setTimeout(() => recalcTotals(items, discount), 0);
                            }}
                        >
                            <MenuItem value="GST">GST Bill</MenuItem>
                            <MenuItem value="WITHOUT_GST">Without GST</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Price Tier"
                            value={priceTier}
                            onChange={(e) => {
                                setPriceTier(e.target.value);
                                // In full implementation, we'd trigger a price update across items here.
                                // For simplicity, we just set the state.
                            }}
                        >
                            <MenuItem value="R">Retail</MenuItem>
                            <MenuItem value="W">Wholesale</MenuItem>
                            <MenuItem value="SW">Semi-Wholesale</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ p: 2, mb: 3, overflowX: "auto" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                            <TableCell>Product</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Price</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell align="center">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((row, i) => (
                            <TableRow key={row.rowKey}>
                                <TableCell sx={{ minWidth: 250 }}>
                                    <Autocomplete
                                        options={productOptions[i] || []}
                                        getOptionLabel={(opt) => `${opt.productCode || ""} - ${opt.name?.en || opt.name || ""}`}
                                        value={row.productDoc}
                                        onChange={(_, val) => handleProductSelect(i, val)}
                                        onInputChange={(_, val) => handleProductSearch(i, val)}
                                        renderInput={(params) => <TextField {...params} size="small" placeholder="Search product..." />}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={row.quantity}
                                        onChange={(e) => {
                                            const updated = [...items];
                                            updated[i].quantity = e.target.value;
                                            recalcTotals(updated, discount);
                                        }}
                                        inputProps={{ min: 1 }}
                                        sx={{ width: 80 }}
                                    />
                                </TableCell>
                                <TableCell>{row.unit}</TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        size="small"
                                        value={row.sellingPrice}
                                        onChange={(e) => {
                                            const updated = [...items];
                                            updated[i].sellingPrice = e.target.value;
                                            recalcTotals(updated, discount);
                                        }}
                                        sx={{ width: 100 }}
                                    />
                                </TableCell>
                                <TableCell align="right">₹{row.total?.toFixed(2)}</TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        color="error"
                                        onClick={() => {
                                            const updated = items.filter((_, idx) => idx !== i);
                                            if (updated.length === 0) updated.push(createRow());
                                            setItems(updated);
                                        }}
                                    >
                                        <FaTrash size={14} />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Button
                    startIcon={<FaPlus />}
                    sx={{ mt: 2 }}
                    onClick={() => setItems([...items, createRow()])}
                >
                    Add Row
                </Button>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Grid container justifyContent="flex-end" spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4} textAlign="right">
                        <Typography>Gross Total:</Typography>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Typography fontWeight="bold" textAlign="right">₹{grossTotal.toFixed(2)}</Typography>
                    </Grid>
                </Grid>

                <Grid container justifyContent="flex-end" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4} textAlign="right">
                        <Typography>Discount (₹):</Typography>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={discount}
                            onChange={(e) => {
                                setDiscount(e.target.value);
                                // recalculation handled in netTotal variable
                            }}
                            inputProps={{ min: 0, style: { textAlign: "right" } }}
                        />
                    </Grid>
                </Grid>

                <Grid container justifyContent="flex-end" spacing={2} alignItems="center" sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={4} textAlign="right">
                        <Typography variant="h6" color="primary" fontWeight="bold">Net Total:</Typography>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Typography variant="h6" color="primary" fontWeight="bold" textAlign="right">
                            ₹{netTotal.toFixed(2)}
                        </Typography>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                    <Button variant="outlined" color="error" onClick={() => navigate(`/${lang}/admin/quotations`)}>
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleSubmit}>
                        Save Quotation
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
