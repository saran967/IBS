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
  Menu,
  MenuItem as MUIMenuItem,
} from "@mui/material";

import { Link, useParams, useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import { MoreVert, Close, Visibility } from "@mui/icons-material";
import { toast } from "react-toastify";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import customFetch from "../../utils/customFetch";
import getLocalizedText from "../../utils/getLocalizedText";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function SalesList() {
  const { lang } = useParams();

  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState({
    totalGrand: 0,
    totalPaid: 0,
    totalBalance: 0,
  });

  const [filters, setFilters] = useState({
    saleType: "",
    billType: "",
    search: "",
    startDate: null,
    endDate: null,
  });

  const [activeSale, setActiveSale] = useState(null);
  const [openDetail, setOpenDetail] = useState(false);

  // Token modal
  const [openTokenModal, setOpenTokenModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [pickupDate, setPickupDate] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuSale, setMenuSale] = useState(null);

  const limit = 10;

  const getEndOfDayISOString = (dateValue) => {
    if (!dateValue) return undefined;
    const d = new Date(dateValue);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  };

  const buildSalesParams = ({ pageValue = page, limitValue = limit } = {}) => {
    return new URLSearchParams({
      page: String(pageValue),
      limit: String(limitValue),
      lang,
      ...(filters.saleType && { saleType: filters.saleType }),
      ...(filters.billType && { billType: filters.billType }),
      ...(filters.search && { search: filters.search }),
      ...(filters.startDate && {
        startDate: new Date(filters.startDate).toISOString(),
      }),
      ...(filters.endDate && {
        endDate: getEndOfDayISOString(filters.endDate),
      }),
    });
  };

  // ======================================================
  // Fetch sales
  // ======================================================
  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = buildSalesParams();
      const res = await customFetch(`/sales?${params.toString()}`);

      if (res.data.success) {
        setSales(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
        setSummary(res.data.summary || {});
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error("Error fetching sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, filters]);

  // ======================================================
  // Keyboard Shortcuts
  // ======================================================
  useEffect(() => {
    const handler = (e) => {
      if (!activeSale) return;

      // PRINT INVOICE
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        navigate(`/${lang}/admin/sales/${activeSale._id}/print`);
      }

      // QUICK BILL
      // QUICK BILL (GST / NON-GST)
      if (e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();

        if (activeSale.billType === "GST") {
          navigate(`/${lang}/admin/sales/${activeSale._id}/gstbill`);
        } else {
          navigate(`/${lang}/admin/sales/${activeSale._id}/bill`);
        }
      }

      // TOKEN SHORTCUTS
      if (!activeSale.tokenNumber) return;

      // PRINT TOKEN
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        navigate(`/${lang}/admin/token/${activeSale.tokenNumber}/print`);
      }

      // FULFILL TOKEN
      if (e.ctrlKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        customFetch
          .put(`/token/fulfill/${activeSale.tokenNumber}`)
          .then((res) => {
            if (res.data.success) {
              toast.success("Token fulfilled");
              fetchSales();
            }
          });
      }

      // CANCEL TOKEN
      if (e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        customFetch
          .put(`/token/cancel/${activeSale.tokenNumber}`)
          .then((res) => {
            if (res.data.success) {
              toast.success("Token cancelled");
              fetchSales();
            }
          });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeSale, lang, navigate]);

  // ======================================================
  // Row click → Open modal + highlight row
  // ======================================================
  const handleRowClick = (sale) => {
    setActiveSale(sale);
    setOpenDetail(true);
  };

  const handleCloseDetail = () => setOpenDetail(false);

  // ======================================================
  // Token Create
  // ======================================================
  const handleTokenCreate = async () => {
    if (!pickupDate) return toast.error("Select pickup date");

    setTokenLoading(true);

    try {
      const res = await customFetch.post("/token/create", {
        saleId: selectedSaleId,
        pickupDate,
      });

      if (res.data.success) {
        toast.success("Token created");
        setOpenTokenModal(false);
        setPickupDate(null);
        fetchSales();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error("Error creating token");
    } finally {
      setTokenLoading(false);
    }
  };

  // ======================================================
  // Token Menu Actions
  // ======================================================
  const handleMenuOpen = (e, sale) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuSale(sale);
  };

  const handleMenuClose = () => setMenuAnchor(null);

  const handleFulfill = async () => {
    handleMenuClose();
    try {
      const res = await customFetch.put(
        `/token/fulfill/${menuSale.tokenNumber}`,
      );
      if (res.data.success) {
        toast.success("Token fulfilled");
        fetchSales();
      }
    } catch {
      toast.error("Error fulfilling token");
    }
  };

  const handleCancel = async () => {
    handleMenuClose();
    try {
      const res = await customFetch.put(
        `/token/cancel/${menuSale.tokenNumber}`,
      );
      if (res.data.success) {
        toast.success("Token cancelled");
        fetchSales();
      }
    } catch {
      toast.error("Error cancelling token");
    }
  };

  const handlePrint = () => {
    handleMenuClose();
    navigate(`/${lang}/admin/token/${menuSale.tokenNumber}/print`);
  };

  // ======================================================
  // Export PDF
  // ======================================================
  const fetchAllFilteredSales = async () => {
    const exportLimit = 200;
    let exportPage = 1;
    let pages = 1;
    let allRows = [];
    let exportSummary = summary;

    do {
      const params = buildSalesParams({
        pageValue: exportPage,
        limitValue: exportLimit,
      });
      const res = await customFetch(`/sales?${params.toString()}`);

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to fetch export data");
      }

      allRows = allRows.concat(res.data.data || []);
      pages = Number(res.data.totalPages || 1);
      exportSummary = res.data.summary || exportSummary;
      exportPage += 1;
    } while (exportPage <= pages);

    return { rows: allRows, totals: exportSummary };
  };

  const exportSalesPDF = async () => {
    let rows = sales;
    let totals = summary;

    try {
      const exportData = await fetchAllFilteredSales();
      rows = exportData.rows;
      totals = exportData.totals;
    } catch {
      toast.error("Failed to prepare export");
      return;
    }

    if (!rows || rows.length === 0) {
      toast.warning("No sales available to export");
      return;
    }
    const doc = new jsPDF("landscape");
    doc.setFontSize(16);
    doc.text("Sales Report", 14, 15);

    let periodText = "Date Range: All Time";
    if (filters.startDate || filters.endDate) {
      const sDate = filters.startDate ? new Date(filters.startDate).toLocaleDateString() : "Beginning";
      const eDate = filters.endDate ? new Date(filters.endDate).toLocaleDateString() : "Today";
      periodText = `Date Range: ${sDate} - ${eDate}`;
    }
    doc.setFontSize(11);
    doc.text(periodText, 14, 22);

    const tableColumn = [
      "Invoice",
      "Date",
      "Shop",
      "Customer",
      "Type",
      "Bill Type",
      "Payment",
      "Net Total (Rs)",
    ];

    const tableRows = [];

    rows.forEach((s) => {
      const shopName = getLocalizedText(s.items?.[0]?.godownId?.name || s.items?.[0]?.shopId?.name || "--", "en");
      const custName = getLocalizedText(s.customerId?.customerName, "en") || "Walk-in";
      const paymentStr = s.paymentSplits?.length ? s.paymentSplits.map((p) => `${p.mode} ${Number(p.amount).toFixed(0)}`).join(", ") : "-";
      const dt = new Date(s.saleDate).toLocaleDateString("en-IN");
      const net = s.netTotal ? s.netTotal.toFixed(2) : "0.00";

      tableRows.push([
        s.invoiceNumber,
        dt,
        shopName,
        custName,
        s.saleType,
        s.billType,
        paymentStr,
        net
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] }
    });

    // Totals Footer
    const finalY = doc.lastAutoTable?.finalY || 30;
    doc.setFontSize(11);
    doc.text(`Grand Total: Rs ${totals.totalGrand ? totals.totalGrand.toFixed(2) : 0}`, 14, finalY + 10);
    doc.text(`Total Paid: Rs ${totals.totalPaid ? totals.totalPaid.toFixed(2) : 0}`, 14, finalY + 16);
    doc.text(`Total Balance: Rs ${totals.totalBalance ? totals.totalBalance.toFixed(2) : 0}`, 14, finalY + 22);

    doc.save("Sales_Report.pdf");
  };

  // ======================================================
  // Filters Change
  // ======================================================
  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Sales List
          </Typography>

          <Button
            variant="contained"
            color="primary"
            component={Link}
            to={`/ ${lang} / admin / sales / create`}
            startIcon={<FaPlus />}
          >
            New Sale
          </Button>
        </Box>

        {/* FILTERS */}
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
            label="Sale Type"
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

          <TextField
            select
            label="Bill Type"
            name="billType"
            value={filters.billType}
            onChange={handleChange}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="GST">GST</MenuItem>
            <MenuItem value="WITHOUT_GST">Without GST</MenuItem>
          </TextField>

          <DatePicker
            label="Start Date"
            value={filters.startDate}
            onChange={(d) => setFilters({ ...filters, startDate: d })}
            slotProps={{ textField: { size: "small" } }}
          />

          <DatePicker
            label="End Date"
            value={filters.endDate}
            onChange={(d) => setFilters({ ...filters, endDate: d })}
            slotProps={{ textField: { size: "small" } }}
          />

          <Button
            variant="outlined"
            onClick={() =>
              setFilters({
                saleType: "",
                billType: "",
                search: "",
                startDate: null,
                endDate: null,
              })
            }
          >
            Clear
          </Button>
          <Button variant="contained" color="secondary" onClick={exportSalesPDF}>
            Export PDF
          </Button>
        </Paper>

        {/* TABLE */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Shop</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Sale Type</TableCell>
                  <TableCell>Bill Type</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Token</TableCell>
                  <TableCell>Actions</TableCell>
                  <TableCell align="right">Net (₹)</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {sales.length ? (
                  sales.map((sale) => (
                    <TableRow
                      key={sale._id}
                      hover
                      onClick={() => setActiveSale(sale)} // ✔ Row click = ONLY select
                      sx={{
                        cursor: "pointer",
                        backgroundColor:
                          activeSale?._id === sale._id ? "#E0F7FA" : "inherit",
                      }}
                    >
                      <TableCell>{sale.invoiceNumber}</TableCell>

                      <TableCell>
                        <TableCell>
                          {getLocalizedText(
                            sale.items?.[0]?.godownId?.name ||
                            sale.items?.[0]?.shopId?.name ||
                            "--",
                            lang,
                          )}
                        </TableCell>
                      </TableCell>

                      <TableCell>
                        {getLocalizedText(sale.customerId?.customerName, lang)}
                      </TableCell>

                      <TableCell>{sale.saleType}</TableCell>
                      <TableCell>{sale.billType}</TableCell>

                      <TableCell>
                        {sale.paymentSplits?.length
                          ? sale.paymentSplits
                            .map(
                              (p) =>
                                `${p.mode} ₹${Number(p.amount).toFixed(0)}`,
                            )
                            .join(", ")
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </TableCell>

                      {/* TOKEN COLUMN unchanged */}
                      <TableCell>
                        {sale.tokenNumber ? (
                          <Box>
                            <Typography fontWeight="bold">
                              {sale.tokenNumber}
                            </Typography>

                            <Box
                              sx={{
                                mt: 0.5,
                                px: 1,
                                py: 0.3,
                                display: "inline-block",
                                borderRadius: "6px",
                                fontSize: "12px",
                                backgroundColor:
                                  sale.tokenStatus === "FULFILLED"
                                    ? "#C8E6C9"
                                    : sale.tokenStatus === "CANCELLED"
                                      ? "#FFCDD2"
                                      : "#FFF9C4",
                                color:
                                  sale.tokenStatus === "FULFILLED"
                                    ? "#2E7D32"
                                    : sale.tokenStatus === "CANCELLED"
                                      ? "#C62828"
                                      : "#F57F17",
                              }}
                            >
                              {sale.tokenStatus}
                            </Box>

                            {sale.pickupDate && (
                              <Typography variant="caption" display="block">
                                Pickup:{" "}
                                {new Date(sale.pickupDate).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSaleId(sale._id);
                              setOpenTokenModal(true);
                            }}
                          >
                            Create Token
                          </Button>
                        )}
                      </TableCell>

                      {/* ACTIONS COLUMN */}
                      <TableCell>
                        {/* 👁️ EYE ICON — OPEN MODAL */}
                        <IconButton
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSale(sale);
                            setOpenDetail(true); // ✔ Only eye icon opens modal
                          }}
                        >
                          <Visibility />
                        </IconButton>

                        {/* TOKEN MENU (unchanged) */}
                        {sale.tokenNumber && (
                          <>
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, sale)}
                            >
                              <MoreVert />
                            </IconButton>

                            <Menu
                              anchorEl={menuAnchor}
                              open={Boolean(menuAnchor)}
                              onClose={handleMenuClose}
                              sx={{ zIndex: 99999 }} //  Keep menu above all UI
                              MenuListProps={{
                                sx: { zIndex: 99999 }, //  Ensures options are clickable
                              }}
                            >
                              {menuSale?.tokenStatus === "PENDING" && (
                                <>
                                  <MUIMenuItem onClick={handleFulfill}>
                                    Fulfill Token
                                  </MUIMenuItem>
                                  <MUIMenuItem onClick={handleCancel}>
                                    Cancel Token
                                  </MUIMenuItem>
                                </>
                              )}

                              <MUIMenuItem onClick={handlePrint}>
                                Print Token
                              </MUIMenuItem>
                            </Menu>
                          </>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        ₹{sale.netTotal?.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No sales found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* PAGINATION */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, val) => setPage(val)}
          />
        </Box>

        {/* DETAILS MODAL */}
        <Dialog
          open={openDetail}
          onClose={handleCloseDetail}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle
            sx={{ display: "flex", justifyContent: "space-between" }}
          >
            <Typography variant="h6">
              Sale Details — {activeSale?.invoiceNumber}
            </Typography>

            <IconButton onClick={handleCloseDetail}>
              <Close />
            </IconButton>
          </DialogTitle>

          <Divider />

          {/* DETAILS MODAL */}
          <Dialog
            open={openDetail}
            onClose={handleCloseDetail}
            fullWidth
            maxWidth="md"
          >
            <DialogTitle
              sx={{ display: "flex", justifyContent: "space-between" }}
            >
              <Typography variant="h6">
                Sale Details — {activeSale?.invoiceNumber}
              </Typography>

              <IconButton onClick={handleCloseDetail}>
                <Close />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent dividers>
              {activeSale && (
                <Box>
                  {/*  Basic Info */}
                  <Typography>
                    <b>Shop:</b>{" "}
                    {getLocalizedText(
                      activeSale.items?.[0]?.godownId?.name ||
                      activeSale.items?.[0]?.shopId?.name ||
                      "--",
                      lang,
                    )}
                  </Typography>

                  <Typography>
                    <b>Customer:</b>{" "}
                    {getLocalizedText(
                      activeSale.customerId?.customerName,
                      lang,
                    )}
                  </Typography>

                  <Typography>
                    <b>Sale Type:</b> {activeSale.saleType}
                  </Typography>

                  <Typography>
                    <b>Bill Type:</b> {activeSale.billType}
                  </Typography>

                  <Typography>
                    <b>Payment:</b>{" "}
                    {activeSale.paymentSplits?.length
                      ? activeSale.paymentSplits
                        .map(
                          (p) =>
                            `${p.mode} ₹${Number(p.amount || 0).toFixed(2)
                            }`,
                        )
                        .join(", ")
                      : "-"}
                  </Typography>

                  <Typography sx={{ mt: 1 }}>
                    <b>Date:</b>{" "}
                    {new Date(activeSale.saleDate).toLocaleString()}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/*  Handling + Transport details */}
                  {(activeSale.includeHandling ||
                    (activeSale.handlingCharges || []).length > 0 ||
                    activeSale.includeTransport) && (
                      <>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          Additional Details
                        </Typography>

                        {/*  Handling */}
                        {(activeSale.includeHandling ||
                          (activeSale.handlingCharges || []).length > 0) && (
                            <Box sx={{ mb: 2 }}>
                              <Typography fontWeight={700}>
                                Handling Charges
                              </Typography>

                              <Typography sx={{ mt: 0.5 }}>
                                <b>Total Handling:</b> ₹
                                {Number(activeSale.handlingTotal || 0).toFixed(2)}
                              </Typography>

                              {/* OPTIONAL: show full handling list */}
                              {(activeSale.handlingCharges || []).length > 0 && (
                                <Table size="small" sx={{ mt: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Product</TableCell>
                                      <TableCell align="center">Per Pack</TableCell>
                                      <TableCell align="right">Total</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {activeSale.handlingCharges.map((h) => (
                                      <TableRow key={h._id}>
                                        <TableCell>
                                          {h.productName || "-"}
                                        </TableCell>
                                        <TableCell align="center">
                                          ₹{Number(h.perPackCharge || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right">
                                          ₹{Number(h.totalCharge || 0).toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </Box>
                          )}

                        {/*  Transport */}
                        {activeSale.includeTransport && (
                          <Box sx={{ mb: 2 }}>
                            <Typography fontWeight={700}>
                              Transport Details
                            </Typography>

                            <Box sx={{ mt: 0.5, lineHeight: 1.8 }}>
                              <Typography>
                                <b>Vehicle No:</b>{" "}
                                {activeSale.transportDetails?.vehicleNumber ||
                                  "-"}
                              </Typography>
                              <Typography>
                                <b>Driver Name:</b>{" "}
                                {activeSale.transportDetails?.driverName || "-"}
                              </Typography>
                              <Typography>
                                <b>Driver Phone:</b>{" "}
                                {activeSale.transportDetails?.driverPhone || "-"}
                              </Typography>
                              <Typography>
                                <b>Agency:</b>{" "}
                                {activeSale.transportDetails?.transportAgency ||
                                  "-"}
                              </Typography>
                              <Typography>
                                <b>Remarks:</b>{" "}
                                {activeSale.transportDetails?.remarks || "-"}
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        <Divider sx={{ my: 2 }} />
                      </>
                    )}

                  {/*  Items Table */}
                  <Typography variant="h6">Items</Typography>

                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>HSN</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Qty</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>CGST%</TableCell>
                        <TableCell>SGST%</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {activeSale.items?.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            {getLocalizedText(item.productName, lang)}
                          </TableCell>
                          <TableCell>{item.hsnCode || "-"}</TableCell>

                          <TableCell>
                            {item.unit
                              ? item.unit[lang] || item.unit.en || "-"
                              : "-"}
                          </TableCell>

                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            ₹{Number(item.sellingPrice || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {Number(item.cgstPercentage || 0)}%
                          </TableCell>
                          <TableCell>
                            {Number(item.sgstPercentage || 0)}%
                          </TableCell>
                          <TableCell align="right">
                            ₹{Number(item.total || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Divider sx={{ my: 2 }} />

                  {/*  Totals */}
                  <Typography>
                    <b>Gross:</b> ₹
                    {Number(activeSale.grossTotal || 0).toFixed(2)}
                  </Typography>

                  <Typography>
                    <b>Discount:</b> ₹
                    {Number(activeSale.discount || 0).toFixed(2)}
                  </Typography>

                  {/*  Handling total show inside totals */}
                  {(activeSale.includeHandling ||
                    (activeSale.handlingCharges || []).length > 0) && (
                      <Typography>
                        <b>Handling:</b> ₹
                        {Number(activeSale.handlingTotal || 0).toFixed(2)}
                      </Typography>
                    )}

                  <Typography>
                    <b>Net Total:</b> ₹
                    {Number(activeSale.netTotal || 0).toFixed(2)}
                  </Typography>

                  <Typography>
                    <b>Paid:</b> ₹
                    {Number(activeSale.paidAmount || 0).toFixed(2)}
                  </Typography>

                  <Typography>
                    <b>Balance:</b> ₹
                    {Number(activeSale.balanceAmount || 0).toFixed(2)}
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </Dialog>
        </Dialog>

        {/* TOKEN CREATE MODAL */}
        <Dialog
          open={openTokenModal}
          onClose={() => setOpenTokenModal(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Create Token</DialogTitle>
          <Divider />

          <DialogContent sx={{ mt: 2 }}>
            <DatePicker
              label="Pickup Date"
              value={pickupDate}
              onChange={(d) => setPickupDate(d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </DialogContent>

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", p: 2, gap: 2 }}
          >
            <Button onClick={() => setOpenTokenModal(false)}>Cancel</Button>

            <Button
              variant="contained"
              disabled={tokenLoading}
              onClick={handleTokenCreate}
            >
              {tokenLoading ? "Saving..." : "Create Token"}
            </Button>
          </Box>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
