import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import {
  Typography,
  TextField,
  Button,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Stack,
  Modal,
  Paper,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Pagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import {
  Delete,
  PictureAsPdf,
  GridOn,
  Close,
  Search,
  CalendarToday,
  Clear,
} from "@mui/icons-material";
import customFetch from "../utils/customFetch";
import StockTransfer from "../components/Admin/StockTransferForm";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import PendingRequests from "../components/Admin/PendingRequests";
import getLocalizedText from "../utils/getLocalizedText";
import { useLanguage } from "../context/LanguageContext";

// ---------------- Actions Component ----------------
const ExportActions = ({ data, exportPDF, exportExcel, isMobile }) => (
  <Box
    sx={{
      mb: 2,
      display: "flex",
      gap: 1,
      flexWrap: "wrap",
      justifyContent: isMobile ? "center" : "flex-start",
    }}
  >
    <Button
      variant="contained"
      color="primary"
      onClick={() => exportPDF(data)}
      startIcon={<PictureAsPdf />}
      size={isMobile ? "small" : "medium"}
      fullWidth={isMobile}
      sx={{ maxWidth: isMobile ? "100%" : "auto" }}
    >
      Export PDF
    </Button>
    <Button
      variant="contained"
      color="success"
      onClick={() => exportExcel(data)}
      startIcon={<GridOn />}
      size={isMobile ? "small" : "medium"}
      fullWidth={isMobile}
      sx={{ maxWidth: isMobile ? "100%" : "auto" }}
    >
      Export Excel
    </Button>
  </Box>
);

// ---------------- Details Modal ----------------
const TransferDetailsModal = ({ open, onClose, transfer, isMobile, lang }) => {
  if (!transfer) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          boxShadow: 24,
          borderRadius: 2,
          width: isMobile ? "95%" : "90%",
          maxWidth: 500,
          p: isMobile ? 2 : 3,
          outline: "none",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant={isMobile ? "h6" : "h5"}>
            📦 Transfer Details
          </Typography>
          <IconButton onClick={onClose} size={isMobile ? "small" : "medium"}>
            <Close />
          </IconButton>
        </Box>

        <Paper
          sx={{ p: isMobile ? 1.5 : 2, borderRadius: 2, bgcolor: "#fafafa" }}
          elevation={0}
        >
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Date & Time:</strong>{" "}
                {new Date(transfer.transferDate).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>From:</strong>
                {transfer.fromType}: {getLocalizedText(transfer.fromName, lang)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>TO:</strong>
                {transfer.toType}: {getLocalizedText(transfer.toName, lang)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Product:</strong>{" "}
                {getLocalizedText(transfer.productName, lang)}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Quantity:</strong> {transfer.quantity}{" "}
                {transfer.unit || ""}
              </Typography>
            </Grid>
            {transfer.remarks && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Remarks:</strong> {transfer.remarks}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Transfer ID: {transfer.transferId}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button
            onClick={onClose}
            variant="contained"
            color="primary"
            size={isMobile ? "small" : "medium"}
            fullWidth={isMobile}
          >
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

// ---------------- Mobile Card Component ----------------
const TransferCard = ({
  transfer,
  index,
  onView,
  onExportPDF,
  onExportExcel,
  onDelete,
  page,
  limit,
  lang,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Card sx={{ mb: 2, borderRadius: 2, overflow: "hidden" }}>
      <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={1}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              #{(page - 1) * limit + index + 1}
            </Typography>

            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {getLocalizedText(transfer.productName, lang)}
            </Typography>
          </Box>

          <Chip
            label={`${transfer.quantity} ${transfer.unit || ""}`}
            color="primary"
            size="small"
          />
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* FROM & TO DETAILS */}
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              From:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {transfer.fromType}: {getLocalizedText(transfer.fromName, lang)}
            </Typography>
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              To:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {transfer.toType}: {getLocalizedText(transfer.toName, lang)}
            </Typography>
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Date:
            </Typography>
            <Typography variant="body2">
              {new Date(transfer.transferDate).toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Performed By:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {transfer.transferredByName} ({transfer.transferredByRole})
            </Typography>
          </Grid>
        </Grid>

        {/* ACTION BUTTONS */}
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onView(transfer)}
            fullWidth
            sx={{ mr: 1 }}
          >
            Details
          </Button>

          <Box display="flex">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onExportPDF([transfer])}
            >
              <PictureAsPdf fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              color="success"
              onClick={() => onExportExcel([transfer])}
            >
              <GridOn fontSize="small" />
            </IconButton>

            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(transfer)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ---------------- Main Component ----------------
const StockTransferPage = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Filters
  const [searchFromShop, setSearchFromShop] = useState("");
  const [searchToShop, setSearchToShop] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);

  const [searchProduct, setSearchProduct] = useState("");
  const [allProducts, setAllProducts] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  // Modal for Pending Requests
  const [pendingOpen, setPendingOpen] = useState(false);

  const lang = useLanguage();
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchLocations = async () => {
      const [shopRes, godownRes] = await Promise.all([
        customFetch.get("/shops"),
        customFetch.get("/godowns"),
      ]);

      const shops = (shopRes.data || []).map((s) => ({
        _id: s._id,
        name: s.name,
        type: "Shop",
      }));

      const godowns = (godownRes.data?.data || []).map((g) => ({
        _id: g._id,
        name: g.name,
        type: "Godown",
      }));

      setLocations([...shops, ...godowns]);
    };

    fetchLocations();
  }, []);
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await customFetch.get("/auth/current-user");
        setCurrentUser(res.data?.user || null);
      } catch (err) {
        console.error("Failed to load current user", err);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    fetchTransfers(1);
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [
    searchFromShop,
    searchToShop,
    fromDate,
    toDate,
    transfers,
    searchProduct,
  ]);

  const fetchTransfers = async (pageNum = 1, overrides = {}) => {
    setLoading(true);
    try {
      const appliedProduct = overrides.searchProduct ?? searchProduct;
      const appliedFromDate = overrides.fromDate ?? fromDate;
      const appliedToDate = overrides.toDate ?? toDate;
      const appliedFromLocation = overrides.searchFromShop ?? searchFromShop;
      const appliedToLocation = overrides.searchToShop ?? searchToShop;

      const res = await customFetch.get("/stock-transfer/transfers", {
        params: {
          page: pageNum,
          limit,
          productName: appliedProduct || "",
          startDate: appliedFromDate || "",
          endDate: appliedToDate || "",
          fromLocationId: appliedFromLocation || "",
          toLocationId: appliedToLocation || "",
        },
      });

      const { transfers: fetched = [], totalPages: tp = 1 } = res.data;

      // 🚀 FILTER ONLY APPROVED TRANSFERS
      const approvedTransfers = fetched.filter((t) => t.status === "approved");

      const transformed = approvedTransfers.map((t) => ({
        ...t,

        // KEEP ORIGINAL OBJECTS (VERY IMPORTANT)
        fromShopId: t.fromShopId,
        fromGodownId: t.fromGodownId,
        toShopId: t.toShopId,
        toGodownId: t.toGodownId,

        productName: t.productId?.name || null,

        fromName: t.fromGodownId?.name || t.fromShopId?.name || null,

        fromType: t.fromGodownId ? "Godown" : t.fromShopId ? "Shop" : "",

        toName: t.toGodownId?.name || t.toShopId?.name || null,

        toType: t.toGodownId ? "Godown" : t.toShopId ? "Shop" : "",

        transferredByName: t.transferredBy?.name || "Unknown",
        transferredByRole: t.transferredBy?.role || "—",
      }));

      setTransfers(transformed);
      // NEW — Extract unique product names for product filter
      const products = [
        ...new Map(
          transformed
            .filter((t) => t.productName)
            .map((t) => [t.productName, { name: t.productName }]),
        ).values(),
      ];

      setAllProducts(products);

      setTotalPages(tp);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching transfer history");
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = transfers;

    // -----------------------------
    // SUBADMIN / EMPLOYEE FILTER
    // -----------------------------
    // ------------------ FILTER BASED ON USER ROLE ------------------

    if (currentUser && currentUser.role !== "admin") {
      const userShopId =
        currentUser?.shopId?._id || currentUser?.shopId || null;

      filtered = filtered.filter((t) => {
        const fromShop = t.fromShopId?._id || null;
        const fromGodownShop = t.fromGodownId?.shopId || null;

        return (
          // Case 1: Transfer from user's shop
          (userShopId && fromShop?.toString() === userShopId?.toString()) ||
          // Case 2: Transfer from godown whose shopId matches user shopId
          (userShopId && fromGodownShop?.toString() === userShopId?.toString())
        );
      });
    }

    // -----------------------------
    // LOCATION FILTERS
    // -----------------------------
    if (searchFromShop) {
      filtered = filtered.filter((t) => {
        const fromShop = t.fromShopId?._id || t.fromShopId || null;
        const fromGodown = t.fromGodownId?._id || t.fromGodownId || null;
        return (
          String(fromShop || "") === String(searchFromShop) ||
          String(fromGodown || "") === String(searchFromShop)
        );
      });
    }

    if (searchToShop) {
      filtered = filtered.filter((t) => {
        const toShop = t.toShopId?._id || t.toShopId || null;
        const toGodown = t.toGodownId?._id || t.toGodownId || null;
        return (
          String(toShop || "") === String(searchToShop) ||
          String(toGodown || "") === String(searchToShop)
        );
      });
    }

    // -----------------------------
    // DATE FILTERS
    // -----------------------------
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter((t) => {
        const date = new Date(t.transferDate);
        return date >= start && date <= end;
      });
    } else if (fromDate) {
      const start = new Date(fromDate);
      filtered = filtered.filter((t) => new Date(t.transferDate) >= start);
    } else if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.transferDate) <= end);
    }

    // -----------------------------
    // SEARCH FILTERS
    // -----------------------------

    // NEW — Product Filter
    if (searchProduct) {
      filtered = filtered.filter((t) =>
        getLocalizedText(t.productName, lang)
          .toLowerCase()
          .includes(searchProduct.toLowerCase()),
      );
    }

    setFilteredTransfers(filtered);
  };

  const handleView = (transfer) => {
    setSelectedTransfer(transfer);
    setViewOpen(true);
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setSelectedTransfer(null);
  };

  const handleDelete = (transfer) => {
    if (
      window.confirm("Are you sure you want to delete this transfer record?")
    ) {
      // Implement delete functionality
      toast.info("Delete functionality would be implemented here");
    }
  };

  // ---------------- Export Functions ----------------
  const exportPDF = (exportData) => {
    if (!exportData.length) return toast.warning("No data to export");

    const doc = new jsPDF();

    autoTable(doc, {
      head: [["#", "Date", "From", "To", "Product", "Qty", "Transferred By"]],
      body: exportData.map((t, i) => [
        i + 1,
        new Date(t.transferDate).toLocaleString(),
        `${t.fromType}: ${getLocalizedText(t.fromName, lang)}`,
        `${t.toType}: ${getLocalizedText(t.toName, lang)}`,
        getLocalizedText(t.productName, lang),
        t.quantity,
        `${t.transferredByName} (${t.transferredByRole})`,
      ]),
    });

    doc.save("stock_transfers.pdf");
  };

  const exportExcel = (exportData) => {
    if (!exportData.length) return toast.warning("No data to export");

    const wsData = [
      ["#", "Date", "From", "To", "Product", "Qty", "Transferred By"],
      ...exportData.map((t, i) => [
        i + 1,
        new Date(t.transferDate).toLocaleString(),
        `${t.fromType}: ${getLocalizedText(t.fromName, lang)}`,
        `${t.toType}: ${getLocalizedText(t.toName, lang)}`,
        getLocalizedText(t.productName, lang),
        t.quantity,
        `${t.transferredByName} (${t.transferredByRole})`,
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    XLSX.utils.book_append_sheet(wb, ws, "Transfers");
    XLSX.writeFile(wb, "stock_transfers.xlsx");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    fetchTransfers(value);
  };

  const clearFilters = () => {
    setSearchFromShop("");
    setSearchToShop("");
    setFromDate("");
    setToDate("");
    setSearchProduct("");
    fetchTransfers(1, {
      searchFromShop: "",
      searchToShop: "",
      fromDate: "",
      toDate: "",
      searchProduct: "",
    });
  };

  return (
    <div style={{ padding: isMobile ? 8 : 16, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Stock Transfer Form */}
        <Box sx={{ mb: 4 }}>
          <Typography variant={isMobile ? "h5" : "h6"} gutterBottom>
            🔄 Stock Transfer Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transfer stock between shops efficiently
          </Typography>
          {/* ------------ ADMIN ONLY: Button to open Pending Requests modal ------------ */}
          {currentUser?.role === "admin" && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setPendingOpen(true)}
              >
                ⏳ View Pending Requests
              </Button>
            </Box>
          )}

          <StockTransfer onTransferComplete={() => fetchTransfers(page)} />
        </Box>

        {/* Filters */}
        <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            Filter Transfers
          </Typography>

          <Grid container spacing={isMobile ? 1 : 2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="date"
                size="small"
                value={fromDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setFromDate(value);
                  fetchTransfers(1, { fromDate: value });
                }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                label="From Date"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                type="date"
                size="small"
                value={toDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setToDate(value);
                  fetchTransfers(1, { toDate: value });
                }}
                fullWidth
                InputLabelProps={{ shrink: true }}
                label="To Date"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={locations}
                getOptionLabel={(loc) =>
                  `${getLocalizedText(loc.name, lang)} (${loc.type})`
                }
                value={locations.find((l) => l._id === searchFromShop) || null}
                onChange={(e, newValue) => {
                  const nextFrom = newValue?._id || "";
                  setSearchFromShop(nextFrom);
                  fetchTransfers(1, { searchFromShop: nextFrom });
                }}
                renderInput={(params) => (
                  <TextField
                    sx={{ width: 200 }}
                    {...params}
                    label="From Shop / Godown"
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={locations}
                getOptionLabel={(loc) =>
                  `${getLocalizedText(loc.name, lang)} (${loc.type})`
                }
                value={locations.find((l) => l._id === searchToShop) || null}
                onChange={(e, newValue) => {
                  const nextTo = newValue?._id || "";
                  setSearchToShop(nextTo);
                  fetchTransfers(1, { searchToShop: nextTo });
                }}
                renderInput={(params) => (
                  <TextField
                    sx={{ width: 200 }}
                    {...params}
                    label="To Shop / Godown"
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={allProducts.map((p) => getLocalizedText(p.name, lang))}
                value={searchProduct}
                onChange={(event, newValue) => {
                  const nextProduct = newValue || "";
                  setSearchProduct(nextProduct);
                  fetchTransfers(1, { searchProduct: nextProduct });
                }}
                renderInput={(params) => (
                  <TextField
                    sx={{ width: 200 }}
                    {...params}
                    label="Product"
                    size="small"
                    placeholder="Search Product"
                  />
                )}
                freeSolo // allows typing custom text
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="outlined"
                  onClick={clearFilters}
                  startIcon={<Clear />}
                  size="small"
                >
                  Reset Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Export Buttons */}
        <ExportActions
          data={filteredTransfers}
          exportPDF={exportPDF}
          exportExcel={exportExcel}
          isMobile={isMobile}
        />

        {/* Table/Cards */}
        <Box sx={{ mb: 2 }}>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 8,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: 64,
                  height: 64,
                  border: "4px solid #e0e0e0",
                  borderTop: "4px solid #0ea5e9",
                  borderRadius: "50%",
                }}
              />
            </Box>
          ) : (
            <>
              {!isMobile ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          background: "#424242",
                          color: "#fff",
                        }}
                      >
                        <th style={{ padding: 8 }}>S.No</th>
                        <th style={{ padding: 8 }}>Date & Time</th>
                        <th style={{ padding: 8 }}>From</th>
                        <th style={{ padding: 8 }}>To</th>

                        <th style={{ padding: 8 }}>Product</th>
                        <th style={{ padding: 8 }}>Qty</th>
                        <th style={{ padding: 8 }}>Transferred By</th>

                        <th style={{ padding: 8, textAlign: "center" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <motion.tbody
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {filteredTransfers.length === 0 ? (
                        <motion.tr variants={itemVariants}>
                          <td
                            colSpan={7}
                            style={{ padding: 16, textAlign: "center" }}
                          >
                            No transfer history found.
                          </td>
                        </motion.tr>
                      ) : (
                        filteredTransfers.map((t, index) => (
                          <motion.tr
                           key={t.transferId || t._id}
                            variants={itemVariants}
                            style={{ borderBottom: "1px solid #eee" }}
                          >
                            <td style={{ padding: 8 }}>
                              {(page - 1) * limit + index + 1}
                            </td>
                            <td style={{ padding: 8 }}>
                              {new Date(t.transferDate).toLocaleString()}
                            </td>
                            <td>
                              {t.fromType}: {getLocalizedText(t.fromName, lang)}
                            </td>

                            <td>
                              {t.toType}: {getLocalizedText(t.toName, lang)}
                            </td>

                            <td style={{ padding: 8 }}>
                              {getLocalizedText(t.productName, lang)}
                            </td>
                            <td style={{ padding: 8 }}>{t.quantity}</td>
                            <td style={{ padding: 8 }}>
                              {t.transferredByName} ({t.transferredByRole})
                            </td>

                            <td style={{ padding: 8, textAlign: "center" }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="center"
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleView(t)}
                                >
                                  Details
                                </Button>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => exportPDF([t])}
                                >
                                  <PictureAsPdf fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => exportExcel([t])}
                                >
                                  <GridOn fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDelete(t)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Stack>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </motion.tbody>
                  </table>
                </div>
              ) : (
                <Stack spacing={2}>
                  {filteredTransfers.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      No transfer history found.
                    </Box>
                  ) : (
                    filteredTransfers.map((t, index) => (
                      <motion.div
                        key={t.transferId || t._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <TransferCard
                          transfer={t}
                          index={index}
                          onView={handleView}
                          onExportPDF={exportPDF}
                          onExportExcel={exportExcel}
                          onDelete={handleDelete}
                          page={page}
                          limit={limit}
                          lang={lang}
                        />
                      </motion.div>
                    ))
                  )}
                </Stack>
              )}
            </>
          )}
        </Box>

        {/* Pagination */}
        {filteredTransfers.length > 0 && (
          <Box display="flex" justifyContent="center" mt={2} mb={4}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        )}

        {/* Details Modal */}
        <TransferDetailsModal
          open={viewOpen}
          onClose={handleCloseView}
          transfer={selectedTransfer}
          isMobile={isMobile}
          lang={lang}
        />
      </div>

      {/* ------------------ Pending Requests Modal ------------------ */}
      <Modal open={pendingOpen} onClose={() => setPendingOpen(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 3,
            width: { xs: "95%", sm: "70%", md: "60%" },
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">Pending Transfer Requests</Typography>

            <IconButton onClick={() => setPendingOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {/* Pending Requests Component */}
          <PendingRequests
            onActionComplete={() => {
              // refresh history after approve/reject
              fetchTransfers(page);
            }}
          />
        </Box>
      </Modal>
    </div>
  );
};

export default StockTransferPage;
