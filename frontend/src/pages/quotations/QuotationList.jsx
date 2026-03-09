import { useEffect, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Pagination,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    Divider,
    IconButton,
} from "@mui/material";

import { Link, useParams, useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { Close, Visibility, Print } from "@mui/icons-material";
import { toast } from "react-toastify";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import customFetch from "../../utils/customFetch";
import getLocalizedText from "../../utils/getLocalizedText";

export default function QuotationList() {
    const { lang } = useParams();
    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [filters, setFilters] = useState({
        saleType: "",
        search: "",
        startDate: null,
        endDate: null,
    });

    const [activeQuotation, setActiveQuotation] = useState(null);
    const [openDetail, setOpenDetail] = useState(false);

    const limit = 10;

    const fetchQuotations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit,
                ...(filters.saleType && { saleType: filters.saleType }),
                ...(filters.search && { search: filters.search }),
                ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
                ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
            });

            const res = await customFetch.get(`/quotations?${params.toString()}`);

            if (res.data.success) {
                setQuotations(res.data.data || []);
                setTotalPages(res.data.totalPages || 1);
            } else {
                toast.error("Failed to load quotations");
            }
        } catch {
            toast.error("Error fetching quotations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, [page, filters]);

    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setPage(1);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h5" fontWeight="bold">
                        Quotations
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        component={Link}
                        to={`/${lang}/admin/quotations/create`}
                        startIcon={<FaPlus />}
                    >
                        New Quotation
                    </Button>
                </Box>

                <Paper sx={{ p: 2, mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <TextField
                        label="Search"
                        name="search"
                        value={filters.search}
                        onChange={handleChange}
                        size="small"
                        sx={{ minWidth: 220 }}
                    />

                    <TextField
                        select
                        label="Type"
                        name="saleType"
                        value={filters.saleType}
                        onChange={handleChange}
                        size="small"
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="B2C">B2C</MenuItem>
                        <MenuItem value="B2B">B2B</MenuItem>
                    </TextField>

                    <DatePicker
                        label="Start Date"
                        value={filters.startDate}
                        onChange={(d) => setFilters({ ...filters, startDate: d })}
                        renderInput={(params) => <TextField size="small" {...params} />}
                    />

                    <DatePicker
                        label="End Date"
                        value={filters.endDate}
                        onChange={(d) => setFilters({ ...filters, endDate: d })}
                        renderInput={(params) => <TextField size="small" {...params} />}
                    />

                    <Button
                        variant="outlined"
                        onClick={() =>
                            setFilters({
                                saleType: "",
                                search: "",
                                startDate: null,
                                endDate: null,
                            })
                        }
                    >
                        Clear
                    </Button>
                </Paper>

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                    <TableCell>Quote No</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell align="right">Net (₹)</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {quotations.length ? (
                                    quotations.map((quote) => (
                                        <TableRow key={quote._id} hover>
                                            <TableCell>{quote.quotationNumber}</TableCell>
                                            <TableCell>
                                                {getLocalizedText(quote.customerId?.customerName, lang) || "Walk-in"}
                                            </TableCell>
                                            <TableCell>{quote.saleType}</TableCell>
                                            <TableCell>
                                                {new Date(quote.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell align="right">
                                                ₹{quote.netTotal?.toFixed(2)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => {
                                                        setActiveQuotation(quote);
                                                        setOpenDetail(true);
                                                    }}
                                                >
                                                    <Visibility />
                                                </IconButton>
                                                <IconButton
                                                    color="success"
                                                    onClick={() => navigate(`/${lang}/admin/quotations/${quote._id}/print`)}
                                                >
                                                    <Print />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            No quotations found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(e, val) => setPage(val)}
                    />
                </Box>

                <Dialog
                    open={openDetail}
                    onClose={() => setOpenDetail(false)}
                    fullWidth
                    maxWidth="md"
                >
                    <DialogTitle sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="h6">
                            Quotation Details — {activeQuotation?.quotationNumber}
                        </Typography>
                        <IconButton onClick={() => setOpenDetail(false)}>
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <Divider />
                    <DialogContent dividers>
                        {activeQuotation && (
                            <Box>
                                <Typography>
                                    <b>Customer:</b>{" "}
                                    {getLocalizedText(activeQuotation.customerId?.customerName, lang)}
                                </Typography>
                                <Typography>
                                    <b>Type:</b> {activeQuotation.saleType}
                                </Typography>
                                <Typography>
                                    <b>Date:</b> {new Date(activeQuotation.createdAt).toLocaleString()}
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                <Typography variant="h6" sx={{ mb: 1 }}>Items</Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Qty</TableCell>
                                            <TableCell align="right">Price</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {activeQuotation.items?.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    {getLocalizedText(item.productName, lang)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.quantity} {getLocalizedText(item.unit, lang)}
                                                </TableCell>
                                                <TableCell align="right">₹{item.sellingPrice?.toFixed(2)}</TableCell>
                                                <TableCell align="right">₹{item.total?.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <Box sx={{ mt: 3, textAlign: "right" }}>
                                    <Typography><b>Gross Total:</b> ₹{activeQuotation.grossTotal?.toFixed(2)}</Typography>
                                    <Typography><b>Discount:</b> ₹{activeQuotation.discount?.toFixed(2)}</Typography>
                                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                                        <b>Net Total:</b> ₹{activeQuotation.netTotal?.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>
            </Box>
        </LocalizationProvider>
    );
}
