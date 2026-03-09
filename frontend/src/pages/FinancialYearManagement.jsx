import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Tooltip,
    Chip,
} from "@mui/material";
import { Add, Delete, CheckCircle, RadioButtonUnchecked, CalendarMonth } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../utils/customFetch";

const FinancialYearManagement = () => {
    const [years, setYears] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        yearName: "",
        startDate: "",
        endDate: "",
    });

    const fetchYears = async () => {
        setLoading(true);
        try {
            const res = await customFetch.get("/financial-years");
            setYears(res.data.financialYears || []);
        } catch (err) {
            toast.error("Failed to load financial years");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.yearName || !formData.startDate || !formData.endDate) {
            return toast.error("Please fill all fields");
        }
        try {
            await customFetch.post("/financial-years", formData);
            toast.success("Financial Year added successfully");
            setOpen(false);
            setFormData({ yearName: "", startDate: "", endDate: "" });
            fetchYears();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error adding year");
        }
    };

    const handleActivate = async (id) => {
        if (!window.confirm("Switching the active financial year will change data visibility across the app. Continue?")) return;
        try {
            await customFetch.patch(`/financial-years/${id}/activate`);
            toast.success("Active Financial Year updated");
            fetchYears();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error activating year");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this year?")) return;
        try {
            await customFetch.delete(`/financial-years/${id}`);
            toast.success("Financial Year deleted");
            fetchYears();
        } catch (err) {
            toast.error(err.response?.data?.message || "Error deleting year");
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: "bold", display: "flex", alignItems: "center", gap: 2 }}>
                <CalendarMonth fontSize="large" color="primary" />
                Financial Year Management
            </Typography>

            <Box sx={{ mb: 4, display: "flex", justifyContent: "flex-end" }}>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setOpen(true)}
                    sx={{ borderRadius: 2, px: 4 }}
                >
                    Add New Financial Year
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={4} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: "primary.main" }}>
                        <TableRow>
                            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Year Name</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Start Date</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold" }}>End Date</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold" }}>Status</TableCell>
                            <TableCell sx={{ color: "white", fontWeight: "bold", textAlign: "right" }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {years.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                    No records found. Click "Add New" to begin.
                                </TableCell>
                            </TableRow>
                        ) : (
                            years.map((y) => (
                                <TableRow key={y._id} hover>
                                    <TableCell sx={{ fontWeight: "bold" }}>{y.yearName}</TableCell>
                                    <TableCell>{new Date(y.startDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(y.endDate).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        {y.isActive ? (
                                            <Chip
                                                icon={<CheckCircle style={{ color: "white" }} />}
                                                label="Active"
                                                color="success"
                                                sx={{ fontWeight: "bold" }}
                                            />
                                        ) : (
                                            <Chip label="Inactive" variant="outlined" />
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {!y.isActive && (
                                            <>
                                                <Tooltip title="Set as Active">
                                                    <IconButton onClick={() => handleActivate(y._id)} color="primary">
                                                        <RadioButtonUnchecked />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton onClick={() => handleDelete(y._id)} color="error">
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: "bold" }}>Add Financial Year</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
                        <TextField
                            label="Year Name (e.g., 2025-2026)"
                            name="yearName"
                            fullWidth
                            value={formData.yearName}
                            onChange={handleChange}
                        />
                        <TextField
                            label="Start Date"
                            name="startDate"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.startDate}
                            onChange={handleChange}
                        />
                        <TextField
                            label="End Date"
                            name="endDate"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.endDate}
                            onChange={handleChange}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">Save Year</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default FinancialYearManagement;
