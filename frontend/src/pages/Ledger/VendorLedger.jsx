

import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  Modal,
  TextField,
  MenuItem,
} from "@mui/material";
import { Visibility, Payment, GridOn, PictureAsPdf } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import customFetch from "../../utils/customFetch";

const COLORS = ["#0088FE", "#00C49F", "#FF8042"];

const getLocalizedText = (value, lang = "en") => {
  if (!value) return "—";
  if (typeof value === "object") {
    if (lang === "both") {
      return `${value.en || "—"} / ${value.ta || "—"}`;
    }
    return value[lang] || value.en || value.ta || "—";
  }
  return value;
};

export default function VendorAnalytics() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery("(max-width:480px)");

  // PIE DATA
  const [pieData, setPieData] = useState([]);

  // BAR DATA & PAGINATION
  const [barData, setBarData] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const limitBar = isMobile ? 3 : 4;

  const [openModal, setOpenModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // VENDOR LIST
  const [vendors, setVendors] = useState([]);
  const [vendorPage, setVendorPage] = useState(1);
  const [totalVendorPages, setTotalVendorPages] = useState(1);
  const [loading, setLoading] = useState(false);
const [remainingBalance, setRemainingBalance] = useState(0);

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const loadAll = async () => {
    try {
      const [pieRes, barRes] = await Promise.all([
        customFetch.get("/vendoranalytics/summary-pie"),
        customFetch.get("/vendoranalytics/vendor-product-bar"),
      ]);

      const { totalPurchase, totalPaid, balance } = pieRes.data.data;

      setPieData([
        { name: "Total Purchase", value: totalPurchase },
        { name: "Total Paid", value: totalPaid },
        { name: "Balance", value: balance },
      ]);

      setBarData(
        barRes.data.data.map((v) => ({
          name: v.vendorName,
          count: v.totalProducts,
        }))
      );
    } catch (err) {
      console.log(err);
    }
  };

  const loadVendors = async (pageNum = 1) => {
    try {
      setLoading(true);
      const res = await customFetch.get(`/vendors?page=${pageNum}&limit=10`);
      const { vendors: vList, currentPage, totalPages } = res.data;

      setVendors(vList);
      setVendorPage(currentPage);
      setTotalVendorPages(totalPages);
    } catch (err) {
      console.log("Vendor list fetch failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadVendors(1);
  }, []);

  // Bar chart slice
  const pagedBarData = barData.slice(
    pageIndex * limitBar,
    pageIndex * limitBar + limitBar
  );

  const viewLedger = (id) => {
    navigate(`/${lang}/admin/vendors-ledger?vendor=${id}`);
  };

const addRepayment = async (vendorId) => {
  try {

    const res = await customFetch.get(
      `/vendoranalytics/vendor-payments?vendorId=${vendorId}`
    );

    const ledger = res?.data?.ledger || [];
    const vendor = vendors.find((v) => v._id === vendorId);
    const opening = Number(vendor?.openingBalance || 0);

    // If no ledger but opening balance exists
    if (ledger.length === 0) {

      if (opening <= 0) {
        showNotification("No outstanding balance.", "info");
        return;
      }

      setSelectedVendor(vendorId);
      setRemainingBalance(opening);
      setOpenModal(true);
      return;
    }

    let purchaseTotal = 0;

    ledger.forEach((row) => {
      if (row.type === "PURCHASE") {
        purchaseTotal += Number(row.debit || 0);
      }
    });

    const balance = purchaseTotal + opening;

    if (balance <= 0) {
      showNotification(
        `No outstanding payable (Remaining: ₹${balance})`,
        "info"
      );
      return;
    }

    setSelectedVendor(vendorId);
    setRemainingBalance(balance);
    setOpenModal(true);

  } catch (error) {
    console.error(error);
    showNotification("Failed checking vendor status", "error");
  }
};


  // Show notification
  const showNotification = (message, severity = "success") => {
    setNotification({ open: true, message, severity });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Export functions
  const exportToExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        vendors.map((v) => ({
          Name: getLocalizedText(v.name, lang),
          Company: v.companyName || "—",
          Mobile: v.mobile || "—",
          GST: v.gstNumber || "—",
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
      XLSX.writeFile(workbook, "Vendor_List.xlsx");
      showNotification("Excel file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      showNotification("Failed to export to Excel. Please try again.", "error");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text("Vendor List", 14, 15);

      // Prepare table data
      const tableData = vendors.map((v) => [
        getLocalizedText(v.name, lang),
        v.companyName || "—",
        v.mobile || "—",
        v.gstNumber || "—",
      ]);

      // Add table with improved styling
      autoTable(doc, {
        head: [["Name", "Company", "Mobile", "GST"]],
        body: tableData,
        startY: 25,
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [14, 165, 233],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 25 },
      });

      doc.save("Vendor_List.pdf");
      showNotification("PDF file downloaded successfully!");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      showNotification("Failed to export to PDF. Please try again.", "error");
    }
  };

 const submitPayment = async () => {
  const paying = Number(amount || 0);
  const balance = Number(remainingBalance || 0);

  if (!selectedVendor || !amount) {
    showNotification("Vendor & Amount required", "error");
    return;
  }

  if (paying > balance) {
    showNotification(
      `Amount exceeds remaining balance (Max: ₹${balance})`,
      "error"
    );
    return;
  }

  setLoading(true);
  try {
    await customFetch.post("/vendorsLedger/vendor-payments", {
      vendorId: selectedVendor,
      amount: paying,
      mode,
      reference,
      notes,
    });

    showNotification("Payment added successfully!");

    setOpenModal(false);
    setAmount("");
    setReference("");
    setNotes("");
    setMode("Cash");

    loadAll();
    loadVendors(vendorPage);
  } catch (err) {
    showNotification("Failed to add payment", "error");
  } finally {
    setLoading(false);
  }
};

  return (
    <Box p={isSmallMobile ? 1 : isMobile ? 2 : 3}>
      <Typography
        variant={isSmallMobile ? "h6" : "h5"}
        fontWeight={700}
        mb={isSmallMobile ? 1 : isMobile ? 2 : 3}
        textAlign={isSmallMobile ? "center" : "left"}
      >
        Vendor Analytics
      </Typography>

      {/* -------- TOP SECTION -------- */}
      <Box
        display="flex"
        gap={isSmallMobile ? 1 : isMobile ? 2 : 3}
        flexWrap="wrap"
        flexDirection={isMobile ? "column" : "row"}
      >
        {/* PIE CHART */}
        <Paper
          sx={{
            p: isSmallMobile ? 1 : isMobile ? 1.5 : 2,
            width: isMobile ? "100%" : "48%",
            minWidth: isMobile ? "auto" : 380,
          }}
        >
          <Typography
            fontWeight={600}
            mb={isSmallMobile ? 1 : 2}
            variant={isSmallMobile ? "body2" : "body1"}
            textAlign={isSmallMobile ? "center" : "left"}
          >
            Total Purchase / Paid / Balance
          </Typography>

          <Box height={isSmallMobile ? 250 : isMobile ? 300 : 350}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={isSmallMobile ? 80 : isMobile ? 100 : 140}
                  dataKey="value"
                  nameKey="name"
                  label={isMobile ? false : true}
                  labelLine={isMobile ? false : true}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`₹${value}`, "Amount"]}
                  contentStyle={{
                    fontSize: isSmallMobile ? "0.7rem" : "0.8rem",
                    padding: isSmallMobile ? "4px" : "8px",
                  }}
                />
                <Legend
                  layout={isMobile ? "horizontal" : "vertical"}
                  verticalAlign={isMobile ? "bottom" : "middle"}
                  align={isMobile ? "center" : "right"}
                  wrapperStyle={{
                    fontSize: isSmallMobile ? "0.7rem" : "0.8rem",
                    paddingTop: isMobile ? "10px" : "0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* BAR CHART */}
        <Paper
          sx={{
            p: isSmallMobile ? 1 : isMobile ? 1.5 : 2,
            width: isMobile ? "100%" : "48%",
            minWidth: isMobile ? "auto" : 380,
          }}
        >
          <Typography
            fontWeight={600}
            mb={isSmallMobile ? 1 : 2}
            variant={isSmallMobile ? "body2" : "body1"}
            textAlign={isSmallMobile ? "center" : "left"}
          >
            Products Purchased Per Vendor
          </Typography>

          <Box height={isSmallMobile ? 350 : isMobile ? 300 : 350}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pagedBarData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: isMobile ? 0 : 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isSmallMobile ? 10 : 12 }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 60 : 30}
                />
                <YAxis tick={{ fontSize: isSmallMobile ? 10 : 12 }} />
                <Tooltip
                  contentStyle={{
                    fontSize: isSmallMobile ? "0.7rem" : "0.8rem",
                    padding: isSmallMobile ? "4px" : "8px",
                  }}
                />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Bar Pagination */}
          <Box
            display="flex"
            justifyContent="space-between"
            mt={isSmallMobile ? 1 : 2}
            gap={1}
          >
            <Button
              variant="outlined"
              size={isSmallMobile ? "small" : "medium"}
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
              sx={{
                fontSize: isSmallMobile ? "0.7rem" : "inherit",
                minWidth: isSmallMobile ? "60px" : "auto",
              }}
            >
              ◀ Prev
            </Button>
            <Button
              variant="outlined"
              size={isSmallMobile ? "small" : "medium"}
              disabled={(pageIndex + 1) * limitBar >= barData.length}
              onClick={() => setPageIndex((p) => p + 1)}
              sx={{
                fontSize: isSmallMobile ? "0.7rem" : "inherit",
                minWidth: isSmallMobile ? "60px" : "auto",
              }}
            >
              Next ▶
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* -------- VENDOR LIST TABLE -------- */}
      <Paper
        sx={{
          p: isSmallMobile ? 1 : isMobile ? 1.5 : 2,
          mt: isSmallMobile ? 2 : 4,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={isSmallMobile ? 1 : 2}
        >
          <Typography
            variant={isSmallMobile ? "body1" : "h6"}
            textAlign={isSmallMobile ? "center" : "left"}
          >
            Vendor List
          </Typography>

          <Box display="flex" gap={isSmallMobile ? 0.5 : 1}>
            <Button
              variant="outlined"
              size={isSmallMobile ? "small" : "medium"}
              startIcon={<GridOn />}
              onClick={exportToExcel}
              sx={{
                fontSize: isSmallMobile ? "0.7rem" : "inherit",
                minWidth: isSmallMobile ? "60px" : "auto",
              }}
            >
              Excel
            </Button>

            <Button
              variant="outlined"
              size={isSmallMobile ? "small" : "medium"}
              startIcon={<PictureAsPdf />}
              onClick={exportToPDF}
              sx={{
                fontSize: isSmallMobile ? "0.7rem" : "inherit",
                minWidth: isSmallMobile ? "60px" : "auto",
              }}
            >
              PDF
            </Button>
          </Box>
        </Box>

        {/* Desktop Table */}
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <table className="min-w-full" style={{ width: "100%" }}>
            <thead>
              <tr style={{ background: "#0ea5e9", color: "white" }}>
                <th style={{ padding: isSmallMobile ? 4 : 8 }}>#</th>
                <th style={{ padding: isSmallMobile ? 4 : 8 }}>Name</th>
                <th style={{ padding: isSmallMobile ? 4 : 8 }}>Company</th>
                <th style={{ padding: isSmallMobile ? 4 : 8 }}>Mobile</th>
                <th style={{ padding: isSmallMobile ? 4 : 8 }}>GST</th>
                <th style={{ padding: isSmallMobile ? 4 : 8 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 16, textAlign: "center" }}>
                    {loading ? (
                      <CircularProgress size={isSmallMobile ? 20 : 24} />
                    ) : (
                      "No vendors found."
                    )}
                  </td>
                </tr>
              ) : (
                vendors.map((v, idx) => (
                  <tr key={v._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: isSmallMobile ? 4 : 8 }}>
                      {(vendorPage - 1) * 10 + idx + 1}
                    </td>
                    <td style={{ padding: isSmallMobile ? 4 : 8 }}>
                      {" "}
                      {getLocalizedText(v.name, lang)}
                    </td>
                    <td style={{ padding: isSmallMobile ? 4 : 8 }}>
                      {v.companyName || "—"}
                    </td>
                    <td style={{ padding: isSmallMobile ? 4 : 8 }}>
                      {v.mobile || "—"}
                    </td>
                    <td style={{ padding: isSmallMobile ? 4 : 8 }}>
                      {v.gstNumber || "—"}
                    </td>

                    <td style={{ padding: isSmallMobile ? 4 : 8 }}>
                      <IconButton
                        size="small"
                        title="View Ledger"
                        onClick={() => viewLedger(v._id)}
                      >
                        <Visibility
                          fontSize={isSmallMobile ? "small" : "small"}
                        />
                      </IconButton>

                      <IconButton
                        size="small"
                        title="Add Repayment"
                        onClick={() => addRepayment(v._id)}
                      >
                        <Payment fontSize={isSmallMobile ? "small" : "small"} />
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>

        {/* Mobile Cards */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            flexDirection: "column",
            gap: isSmallMobile ? 1 : 2,
          }}
        >
          {vendors.length === 0 ? (
            <Typography align="center">
              {loading ? (
                <CircularProgress size={isSmallMobile ? 20 : 24} />
              ) : (
                "No vendors found."
              )}
            </Typography>
          ) : (
            vendors.map((v) => (
              <Paper
                key={v._id}
                sx={{
                  p: isSmallMobile ? 1 : 2,
                  border: "1px solid #ddd",
                  borderRadius: 2,
                }}
              >
                <Typography
                  fontWeight="bold"
                  variant={isSmallMobile ? "body2" : "body1"}
                >
                  {getLocalizedText(v.name, lang)}
                </Typography>
                <Typography variant={isSmallMobile ? "caption" : "body2"}>
                  Company: {v.companyName || "—"}
                </Typography>
                <Typography variant={isSmallMobile ? "caption" : "body2"}>
                  Mobile: {v.mobile || "—"}
                </Typography>
                <Typography variant={isSmallMobile ? "caption" : "body2"}>
                  GST: {v.gstNumber || "—"}
                </Typography>

                <Box
                  display="flex"
                  justifyContent="flex-end"
                  gap={isSmallMobile ? 0.5 : 1}
                  mt={isSmallMobile ? 0.5 : 1}
                >
                  <IconButton
                    onClick={() => viewLedger(v._id)}
                    size={isSmallMobile ? "small" : "medium"}
                  >
                    <Visibility fontSize={isSmallMobile ? "small" : "small"} />
                  </IconButton>
                  <IconButton
                    onClick={() => addRepayment(v._id)}
                    size={isSmallMobile ? "small" : "medium"}
                  >
                    <Payment fontSize={isSmallMobile ? "small" : "small"} />
                  </IconButton>
                </Box>
              </Paper>
            ))
          )}
        </Box>

        {/* Pagination */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: isSmallMobile ? 1 : 2,
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            size={isSmallMobile ? "small" : "medium"}
            disabled={vendorPage === 1}
            onClick={() => {
              const p = vendorPage - 1;
              setVendorPage(p);
              loadVendors(p);
            }}
            sx={{
              fontSize: isSmallMobile ? "0.7rem" : "inherit",
              minWidth: isSmallMobile ? "60px" : "auto",
            }}
          >
            ◀ Prev
          </Button>

          <Button
            variant="outlined"
            size={isSmallMobile ? "small" : "medium"}
            disabled={vendorPage === totalVendorPages}
            onClick={() => {
              const p = vendorPage + 1;
              setVendorPage(p);
              loadVendors(p);
            }}
            sx={{
              fontSize: isSmallMobile ? "0.7rem" : "inherit",
              minWidth: isSmallMobile ? "60px" : "auto",
            }}
          >
            Next ▶
          </Button>
        </Box>
      </Paper>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
  <Box
    sx={{
      position: "absolute",
      top: { xs: "auto", sm: "50%" },
      bottom: { xs: 0, sm: "auto" },
      left: "50%",
      transform: {
        xs: "translateX(-50%)",
        sm: "translate(-50%, -50%)",
      },
      width: {
        xs: "100%",
        sm: 420,
      },
      maxHeight: {
        xs: "90vh",
        sm: "auto",
      },
      overflowY: "auto",
      bgcolor: "white",
      p: 3,
      borderRadius: {
        xs: "16px 16px 0 0",
        sm: 2,
      },
    }}
  >
    <Typography variant="h6">Vendor Repayment</Typography>

    <Typography sx={{ color: "red", fontWeight: "bold", mt: 1 }}>
      Remaining Balance: ₹{remainingBalance}
    </Typography>

    <TextField
      fullWidth
      sx={{ mt: 2 }}
      label="Amount"
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
    />

    <TextField
      fullWidth
      sx={{ mt: 2 }}
      select
      label="Mode"
      value={mode}
      onChange={(e) => setMode(e.target.value)}
    >
      <MenuItem value="Cash">Cash</MenuItem>
      <MenuItem value="UPI">UPI</MenuItem>
      <MenuItem value="Bank">Bank Transfer</MenuItem>
      <MenuItem value="Other">Other</MenuItem>
    </TextField>

    <TextField
      fullWidth
      sx={{ mt: 2 }}
      label="Reference"
      value={reference}
      onChange={(e) => setReference(e.target.value)}
    />

    <TextField
      fullWidth
      sx={{ mt: 2 }}
      label="Notes"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
    />

    <Button
      fullWidth
      variant="contained"
      sx={{ mt: 2 }}
      onClick={submitPayment}
      disabled={remainingBalance <= 0}
    >
      Submit
    </Button>
  </Box>
</Modal>
    </Box>
  );
}