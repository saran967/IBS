import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    CircularProgress,
    MenuItem,
    TextField,
    Grid
} from "@mui/material";
import { Download, Refresh } from "@mui/icons-material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import customFetch from "../utils/customFetch";
import { toast } from "react-toastify";
import { useLanguage } from "../context/LanguageContext";

export default function LowStockReport() {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [categories, setCategories] = useState([]);
    
    const [shops, setShops] = useState([]);
    const [godowns, setGodowns] = useState([]);
    
    const [selectedShop, setSelectedShop] = useState("");
    const [selectedGodown, setSelectedGodown] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const language = useLanguage() || "en";

    useEffect(() => {
        fetchLocations();
        fetchReport();
    }, [selectedShop, selectedGodown]);

    useEffect(() => {
        let result = [...data];

        if (productFilter.trim()) {
            const lower = productFilter.toLowerCase();
            result = result.filter(item => 
                (item.productCode?.toLowerCase() || "").includes(lower) ||
                (item.productName?.en?.toLowerCase() || "").includes(lower) ||
                (item.productName?.ta?.toLowerCase() || "").includes(lower)
            );
        }

        if (selectedCategory) {
            result = result.filter(item => {
                const cat = item.category?.en || item.category?.ta || "";
                return cat.toLowerCase().includes(selectedCategory.toLowerCase());
            });
        }

        setFilteredData(result);
    }, [productFilter, selectedCategory, data]);

    const fetchLocations = async () => {
        try {
            const [shopRes, godownRes] = await Promise.all([
                customFetch.get("/shops"),
                customFetch.get("/godowns")
            ]);
            setShops(shopRes.data?.shops || shopRes.data || []);
            setGodowns(godownRes.data?.godowns || godownRes.data || []);
        } catch (err) {
            console.error("fetchLocations error", err);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            let params = new URLSearchParams();
            if (selectedShop) params.append("shopId", selectedShop);
            if (selectedGodown) params.append("godownId", selectedGodown);

            const res = await customFetch.get(`/inventory/reports/low-stock-report?${params.toString()}`);
            const fetchedData = res.data?.data || [];
            setData(fetchedData);

            const uniqueCats = [
                ...new Map(
                    fetchedData
                        .map((item) => item.category)
                        .filter(Boolean)
                        .map((cat) => [cat.en, cat])
                ).values(),
            ];
            setCategories(uniqueCats);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load low stock report");
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.text("Low Stock Report", 14, 15);

        let locationText = "All Locations";
        if (selectedShop) locationText = `Shop: ${shops.find(s => s._id === selectedShop)?.name?.en || 'Selected'}`;
        if (selectedGodown) locationText = `Godown: ${godowns.find(g => g._id === selectedGodown)?.name?.en || 'Selected'}`;

        doc.setFontSize(10);
        doc.text(`Location: ${locationText}`, 14, 22);

        const tableColumn = ["Product Code", "Product Name", "Category", "Min Stock", "Current Stock"];
        const tableRows = [];

        filteredData.forEach(item => {
            let currentStockText = item.purchaseType === "SKU"
                ? `${item.totalPacks || 0} Packs`
                : `${(item.totalWeight || 0) / (item.baseUnitType === "G" || item.baseUnitType === "ML" ? 1000 : 1)} ${item.baseUnitType || ""}`;

            const row = [
                item.productCode,
                item.productName?.en || "Unknown",
                item.category?.en || "-",
                item.minStockLevel || 0,
                currentStockText
            ];
            tableRows.push(row);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
        });

        doc.save(`Low_Stock_Report_${new Date().toLocaleDateString()}.pdf`);
    };

    const downloadExcel = () => {
        if (!filteredData.length) {
            toast.warning("No data to export");
            return;
        }

        const excelData = filteredData.map(item => {
            let currentStockText = item.purchaseType === "SKU"
                ? `${item.totalPacks || 0} Packs`
                : `${(item.totalWeight || 0) / (item.baseUnitType === "G" || item.baseUnitType === "ML" ? 1000 : 1)} ${item.baseUnitType || ""}`;

            return {
                "Product Code": item.productCode,
                "Product Name": item.productName?.en || "Unknown",
                "Category": item.category?.en || "-",
                "Min Stock": item.minStockLevel || 0,
                "Current Stock": currentStockText
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Low Stock Report");
        XLSX.writeFile(workbook, `Low_Stock_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    return (
        <Box p={3}>
            <Typography variant="h5" mb={3} fontWeight={600} color="primary">
                Low Stock Report
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            label="Search Product"
                            value={productFilter}
                            onChange={(e) => setProductFilter(e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            size="small"
                        >
                            <MenuItem value="">-- All Categories --</MenuItem>
                            {categories.map((cat, i) => (
                                <MenuItem key={i} value={cat.en}>{cat.en || cat.ta}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Select Shop"
                            value={selectedShop}
                            onChange={(e) => {
                                setSelectedShop(e.target.value);
                                setSelectedGodown("");
                            }}
                            size="small"
                        >
                            <MenuItem value="">-- All Shops --</MenuItem>
                            {shops.map(s => (
                                <MenuItem key={s._id} value={s._id}>{s.name?.en || s.name}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            select
                            fullWidth
                            label="Select Godown"
                            value={selectedGodown}
                            onChange={(e) => {
                                setSelectedGodown(e.target.value);
                                setSelectedShop("");
                            }}
                            size="small"
                        >
                            <MenuItem value="">-- All Godowns --</MenuItem>
                            {godowns.map(g => (
                                <MenuItem key={g._id} value={g._id}>{g.name?.en || g.name}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} display="flex" gap={2} mt={1}>
                        <Button variant="contained" onClick={fetchReport} startIcon={<Refresh />}>
                            Refresh
                        </Button>
                        <Button variant="outlined" color="success" onClick={downloadExcel} disabled={filteredData.length === 0}>
                            Export Excel
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={downloadPDF} startIcon={<Download />} disabled={filteredData.length === 0}>
                            Export PDF
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#424242" }}>
                                <TableCell sx={{ color: "white" }}>Code</TableCell>
                                <TableCell sx={{ color: "white" }}>Name</TableCell>
                                <TableCell sx={{ color: "white" }}>Category</TableCell>
                                <TableCell sx={{ color: "white" }}>Purchase Mode</TableCell>
                                <TableCell sx={{ color: "white" }}>Min Level</TableCell>
                                <TableCell sx={{ color: "white" }}>Current Stock</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">No Low Stock Items Found</TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row) => (
                                    <TableRow key={row.productId}>
                                        <TableCell>{row.productCode}</TableCell>
                                        <TableCell>{row.productName?.en}</TableCell>
                                        <TableCell>{row.category?.en || "-"}</TableCell>
                                        <TableCell>{row.purchaseType}</TableCell>
                                        <TableCell>{row.minStockLevel || 0}</TableCell>
                                        <TableCell sx={{ color: "red", fontWeight: 600 }}>
                                            {row.purchaseType === "SKU"
                                                ? `${row.totalPacks || 0} Packs`
                                                : `${((row.totalWeight || 0) / (row.baseUnitType === "G" || row.baseUnitType === "ML" ? 1000 : 1)).toFixed(3)} ${row.baseUnitType === "G" ? "KG" : row.baseUnitType === "ML" ? "L" : row.baseUnitType}`}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
