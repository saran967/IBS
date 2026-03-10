import React, { useEffect, useState, useRef, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Autocomplete,
    Button,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../../utils/customFetch";
import { useParams, useNavigate } from "react-router-dom";
import QuotationItemsTable from "./components/QuotationItemsTable";
import QuotationTotalsSection from "./components/QuotationTotalsSection";
import { recalcTotals, numeric } from "./utils/quotationCalc";
import { focusField, focusNextLogicalField } from "./utils/quotationFocus";
import getLocalizedText from "../../../utils/getLocalizedText";

export default function CreateQuotation() {
    const { lang = "en" } = useParams();
    const navigate = useNavigate();

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [saleType, setSaleType] = useState("B2C");
    const [billType, setBillType] = useState("GST");
    const [priceTier, setPriceTier] = useState("R");
    const [products, setProducts] = useState([]);
    const [productSearchOptions, setProductSearchOptions] = useState({});
    const [productSearchText, setProductSearchText] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const refs = useRef({});
    const debounceTimeouts = useRef({});

    const createRow = () => ({
        rowKey: crypto.randomUUID(),
        productId: "",
        productCode: "",
        name: "",
        quantity: "",
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
    });

    const [items, setItems] = useState([createRow()]);
    const [totals, setTotals] = useState({
        gross: 0,
        discount: "",
        net: 0,
    });

    const getText = (val) => getLocalizedText(val, lang);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([
                    customFetch.get("/customer"),
                    customFetch.get("/product"),
                ]);
                setCustomers(custRes.data.customers || []);
                setProducts(prodRes.data.products || []);
            } catch (err) {
                toast.error("Failed to load data");
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        Object.entries(productSearchText).forEach(([key, text]) => {
            if (!text || text.length < 2) {
                setProductSearchOptions((prev) => ({ ...prev, [key]: [] }));
                return;
            }

            if (debounceTimeouts.current[key]) clearTimeout(debounceTimeouts.current[key]);
            debounceTimeouts.current[key] = setTimeout(async () => {
                try {
                    const res = await customFetch.get(`/product/search?q=${encodeURIComponent(text)}`);
                    setProductSearchOptions((prev) => ({ ...prev, [key]: res.data.products || [] }));
                } catch {
                    setProductSearchOptions((prev) => ({ ...prev, [key]: [] }));
                }
            }, 300);
        });
    }, [productSearchText]);

    const handleRecalc = (rows, updatedTotals = {}) => {
        const next = recalcTotals({ rows, totals, updatedTotals });
        setTotals(next);
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;

        if (field === "unit") {
            const product = products.find(p => String(p._id) === String(updated[index].productId));
            if (product) {
                if (value === "LOOSE") {
                    updated[index].isLoose = true;
                    updated[index].skuId = "";
                } else if (value === "__BASE__") {
                    updated[index].isLoose = false;
                    updated[index].skuId = "";
                } else {
                    updated[index].isLoose = false;
                    updated[index].skuId = value;
                }
            }
        }

        // Recalculate row total
        const qty = numeric(updated[index].quantity);
        const price = numeric(updated[index].sellingPrice);
        const cgst = billType === "WITHOUT_GST" ? 0 : numeric(updated[index].cgstPercentage);
        const sgst = billType === "WITHOUT_GST" ? 0 : numeric(updated[index].sgstPercentage);

        const cgstAmt = (price * cgst) / 100;
        const sgstAmt = (price * sgst) / 100;

        updated[index].total = billType === "WITHOUT_GST"
            ? price * qty
            : (price + cgstAmt + sgstAmt) * qty;

        setItems(updated);
        handleRecalc(updated);
    };

    const handleProductCodeChange = async (index, code) => {
        if (!code) return;
        try {
            const res = await customFetch.get(`/product/search?q=${encodeURIComponent(code)}`);
            const product = res.data.products?.find(p => p.productCode === code) || res.data.products?.[0];

            if (product) {
                const updated = [...items];
                let initialPrice = product.sellingPrice ?? 0;
                if (priceTier === "W") initialPrice = product.sellingPriceforB2B ?? initialPrice;
                if (priceTier === "SW") initialPrice = product.sellingPriceforAgent ?? initialPrice;

                updated[index] = {
                    ...updated[index],
                    productId: product._id,
                    productCode: product.productCode,
                    name: product.name,
                    sellingPrice: initialPrice,
                    cgstPercentage: product.cgstPercentage || 0,
                    sgstPercentage: product.sgstPercentage || 0,
                    productBaseUnit: product.unit,
                    skuList: product.skus || [],
                    hsnCode: product.hsnCode || "",
                };
                setItems(updated);
                handleRecalc(updated);
            }
        } catch (err) {
            toast.error("Product fetch failed");
        }
    };

    const handleAddRow = () => setItems([...items, createRow()]);
    const handleDeleteRow = (index) => {
        const updated = items.filter((_, i) => i !== index);
        if (!updated.length) updated.push(createRow());
        setItems(updated);
        handleRecalc(updated);
    };

    const handleSubmit = async () => {
        if (!selectedCustomer) return toast.error("Please select a customer");
        const validItems = items.filter(it => it.productId && numeric(it.quantity) > 0);
        if (!validItems.length) return toast.error("Please add at least one valid item");

        setSubmitting(true);
        try {
            const payload = {
                customerId: selectedCustomer._id,
                saleType,
                billType,
                priceTier,
                discount: numeric(totals.discount),
                items: validItems.map(it => ({
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

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>Create Quotation</Typography>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Autocomplete
                            options={customers}
                            getOptionLabel={(o) => getText(o.customerName)}
                            value={selectedCustomer}
                            onChange={(_, val) => {
                                setSelectedCustomer(val);
                                if (val?.customerType) setSaleType(val.customerType);
                            }}
                            renderInput={(params) => <TextField {...params} label="Customer" size="small" inputRef={el => refs.current["customer"] = el} />}
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField select fullWidth size="small" label="Sale Type" value={saleType} onChange={(e) => setSaleType(e.target.value)}>
                            <MenuItem value="B2C">B2C</MenuItem>
                            <MenuItem value="B2B">B2B</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            <QuotationItemsTable
                items={items}
                setItems={setItems}
                productSearchOptions={productSearchOptions}
                setProductSearchText={setProductSearchText}
                products={products}
                billType={billType}
                refs={refs}
                handleItemChange={handleItemChange}
                handleProductCodeChange={handleProductCodeChange}
                handleDeleteRow={handleDeleteRow}
                handleAddRow={handleAddRow}
                focusField={focusField}
                focusNextLogicalField={focusNextLogicalField}
                getText={getText}
            />

            <QuotationTotalsSection
                totals={totals}
                items={items}
                refs={refs}
                recalcTotals={handleRecalc}
                billType={billType}
                setBillType={setBillType}
                priceTier={priceTier}
                setPriceTier={setPriceTier}
            />

            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
                <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting} ref={el => refs.current["saveBtn"] = el}>
                    {submitting ? "Saving..." : "Save Quotation"}
                </Button>
            </Box>
        </Box>
    );
}
