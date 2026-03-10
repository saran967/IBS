import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Stack,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
  Modal,
} from "@mui/material";
import PaymentIcon from "@mui/icons-material/Payment";
import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import customFetch from "../../utils/customFetch";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Recharts
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

// Icons
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";

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

export default function VendorLedger() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);

  const [searchParams] = useSearchParams();
  const vendorFromURL = searchParams.get("vendor");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [remainingBalance, setRemainingBalance] = useState(0);

  const COLORS = ["#FF8042", "#00C49F", "#0088FE"];

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery("(max-width:480px)");
  const isExtraSmall = useMediaQuery("(max-width:360px)");

  // ----------------------------------------
  // Load vendors
  // ----------------------------------------
  useEffect(() => {
    const loadVendors = async () => {
      try {
        const { data } = await customFetch.get("/vendors");
        setVendors(data.vendors || []);
      } catch {
        toast.error("Failed to load vendors");
      }
    };
    loadVendors();
  }, []);

  // ----------------------------------------
  // Auto-select vendor from URL
  // ----------------------------------------
  useEffect(() => {
    if (vendors.length === 0) return;

    if (vendorFromURL && !selectedVendor) {
      setSelectedVendor(vendorFromURL);
      const v = vendors.find((x) => x._id === vendorFromURL);
      setVendorName(getLocalizedText(v?.name));

      fetchLedger(vendorFromURL);
      fetchCharts(vendorFromURL);
    }
  }, [vendors]); // eslint-disable-line

  // ----------------------------------------
  // Fetch Ledger
  // ----------------------------------------
  const fetchLedger = async (vendorId = selectedVendor) => {
    if (!vendorId) return toast.warn("Select a vendor first");

    setLoading(true);

    try {
      const params = new URLSearchParams({ vendorId, from, to }).toString();

      const { data } = await customFetch.get(
        `/vendoranalytics/vendor-payments?${params}`
      );

      setRows(data.ledger || []);

      const v = vendors.find((x) => x._id === vendorId);
      setVendorName(getLocalizedText(v?.name));
    } catch {
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  // Fetch Charts: PIE + BAR (INDIVIDUAL)
  // ----------------------------------------
  const fetchCharts = async (vendorId) => {
    if (!vendorId) return;

    try {
      // INDIVIDUAL PIE
      const pieRes = await customFetch.get(
        `/vendoranalytics/summary-pie/single?vendorId=${vendorId}`
      );

      const { totalPurchase, totalPaid, balance } =
        pieRes.data?.data || pieRes.data;

      setPieData([
        { name: "Balance", value: balance || 0 },
        { name: "Total Paid", value: totalPaid || 0 },
        { name: "Total Purchase", value: totalPurchase || 0 },
      ]);

      // INDIVIDUAL BAR
      const barRes = await customFetch.get(
        `/vendoranalytics/vendor-product-bar/single?vendorId=${vendorId}`
      );

      const safeBar =
        barRes.data?.data?.map((item) => ({
          productName: item.productName || "Unknown",
          count: item.totalProducts || 0,
        })) || [];

      setBarData(safeBar);
    } catch (err) {
      console.log(err);
    }
  };

  // Auto-load charts on vendor change
  useEffect(() => {
    if (selectedVendor && !vendorFromURL) {
      fetchLedger(selectedVendor);
      fetchCharts(selectedVendor);
    }
  }, [selectedVendor]); // eslint-disable-line

  // Mobile-friendly table row component
  const MobileTableRow = ({ row, index }) => (
    <Card key={index} sx={{ mb: 1, boxShadow: 1 }}>
      <CardContent sx={{ p: isExtraSmall ? 1 : 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Date
            </Typography>
            <Typography variant="body2">
              {new Date(row.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: isExtraSmall ? "2-digit" : "numeric",
              })}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body2">{row.type}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Reference
            </Typography>
            <Typography variant="body2" noWrap>
              {row.referenceId
                ? isExtraSmall
                  ? `${row.referenceId.substring(0, 8)}...`
                  : row.referenceId
                : "—"}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Debit
            </Typography>
            <Typography variant="body2">
              {row.debit ? `₹${Number(row.debit).toFixed(2)}` : "—"}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Credit
            </Typography>
            <Typography variant="body2">
              {row.credit ? `₹${Number(row.credit).toFixed(2)}` : "—"}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              Balance
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ₹{Number(row.balance || 0).toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const exportToExcel = () => {
    if (!rows.length && !pieData.length && !barData.length) {
      toast.warn("No data to export");
      return;
    }

    const ledgerRows = rows.map((row, index) => ({
      "#": index + 1,
      Date: row.date ? new Date(row.date).toLocaleDateString("en-IN") : "-",
      Type: row.type || "-",
      Reference: row.referenceId || "-",
      Debit: row.debit ? Number(row.debit).toFixed(2) : "0.00",
      Credit: row.credit ? Number(row.credit).toFixed(2) : "0.00",
      Balance: Number(row.balance || 0).toFixed(2),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(ledgerRows),
      "Vendor Ledger",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        pieData.map((item) => ({
          Metric: item.name,
          Value: item.value ?? 0,
        })),
      ),
      "Vendor Summary",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        barData.map((item) => ({
          Product: item.productName || "Unknown",
          Count: item.count ?? 0,
        })),
      ),
      "Product Count",
    );
    XLSX.writeFile(workbook, "Vendor_Ledger.xlsx");
  };

  const exportToPDF = () => {
    if (!rows.length && !pieData.length && !barData.length) {
      toast.warn("No data to export");
      return;
    }

    const doc = new jsPDF("landscape");
    doc.setFontSize(14);
    doc.text(`Vendor Ledger${vendorName ? ` - ${vendorName}` : ""}`, 14, 14);

    if (rows.length) {
      const tableRows = rows.map((row, index) => [
        index + 1,
        row.date ? new Date(row.date).toLocaleDateString("en-IN") : "-",
        row.type || "-",
        row.referenceId || "-",
        row.debit ? Number(row.debit).toFixed(2) : "0.00",
        row.credit ? Number(row.credit).toFixed(2) : "0.00",
        Number(row.balance || 0).toFixed(2),
      ]);

      autoTable(doc, {
        startY: 22,
        head: [["#", "Date", "Type", "Reference", "Debit", "Credit", "Balance"]],
        body: tableRows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
      });
    }

    let nextY = (doc.lastAutoTable?.finalY || 22) + 10;
    if (nextY > 180) {
      doc.addPage();
      nextY = 20;
    }

    if (pieData.length) {
      doc.setFontSize(12);
      doc.text("Vendor Summary", 14, nextY);
      autoTable(doc, {
        startY: nextY + 3,
        head: [["Metric", "Value"]],
        body: pieData.map((item) => [item.name, item.value ?? 0]),
      });
      nextY = (doc.lastAutoTable?.finalY || nextY) + 10;
      if (nextY > 180) {
        doc.addPage();
        nextY = 20;
      }
    }

    if (barData.length) {
      doc.setFontSize(12);
      doc.text("Product Count", 14, nextY);
      autoTable(doc, {
        startY: nextY + 3,
        head: [["Product", "Count"]],
        body: barData.map((item) => [item.productName || "Unknown", item.count ?? 0]),
      });
    }

    doc.save("Vendor_Ledger.pdf");
  };

  return (
    <Box p={isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 2 : 3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant={isExtraSmall ? "subtitle2" : isSmallMobile ? "h6" : "h5"}
          gutterBottom
          sx={{ fontSize: isExtraSmall ? "0.875rem" : "inherit" }}
        >
          Vendor Ledger
        </Typography>
        {isMobile && (
          <IconButton
            onClick={() => setShowFilters(!showFilters)}
            color="primary"
            size={isExtraSmall ? "small" : "medium"}
          >
            <FilterListIcon />
          </IconButton>
        )}
      </Box>

      {/* ---------------- FILTER ---------------- */}
      {(!isMobile || showFilters) && (
        <Paper
          sx={{
            p: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 1.5 : 2,
            mb: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
            display: "flex",
            gap: isExtraSmall ? 0.5 : isSmallMobile ? 1 : 2,
            flexWrap: "wrap",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <TextField
            select
            label="Vendor"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            size={isExtraSmall ? "small" : isSmallMobile ? "small" : "medium"}
            sx={{
              minWidth: isMobile ? "100%" : 240,
              width: isMobile ? "100%" : "auto",
              "& .MuiInputBase-input": {
                fontSize: isExtraSmall ? "0.75rem" : "inherit",
              },
            }}
          >
            <MenuItem value="">Select Vendor</MenuItem>
            {vendors.map((v) => (
              <MenuItem
                key={v._id}
                value={v._id}
                sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit" }}
              >
                {getLocalizedText(v.name)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="From"
            type="date"
            size={isExtraSmall ? "small" : isSmallMobile ? "small" : "medium"}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{
              shrink: true,
              style: { fontSize: isExtraSmall ? "0.75rem" : "inherit" },
            }}
            sx={{
              width: isMobile ? "100%" : "auto",
              "& .MuiInputBase-input": {
                fontSize: isExtraSmall ? "0.75rem" : "inherit",
              },
            }}
          />

          <TextField
            label="To"
            type="date"
            size={isExtraSmall ? "small" : isSmallMobile ? "small" : "medium"}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{
              shrink: true,
              style: { fontSize: isExtraSmall ? "0.75rem" : "inherit" },
            }}
            sx={{
              width: isMobile ? "100%" : "auto",
              "& .MuiInputBase-input": {
                fontSize: isExtraSmall ? "0.75rem" : "inherit",
              },
            }}
          />

          <Stack
            direction={isMobile ? "row" : "row"}
            spacing={isExtraSmall ? 0.5 : isSmallMobile ? 0.5 : 1}
            sx={{ width: isMobile ? "100%" : "auto" }}
          >
            <Button
              variant="contained"
              onClick={() => {
                fetchLedger();
                fetchCharts(selectedVendor);
                if (isMobile) setShowFilters(false);
              }}
              disabled={loading}
              size={isExtraSmall ? "small" : isSmallMobile ? "small" : "medium"}
              sx={{
                width: isMobile ? "100%" : "auto",
                fontSize: isExtraSmall
                  ? "0.7rem"
                  : isSmallMobile
                  ? "0.75rem"
                  : "inherit",
                padding: isExtraSmall ? "4px 8px" : "inherit",
              }}
              startIcon={
                loading ? (
                  <CircularProgress
                    size={isExtraSmall ? 14 : isSmallMobile ? 16 : 18}
                  />
                ) : (
                  <RefreshIcon />
                )
              }
            >
              {loading ? "" : "LOAD LEDGER"}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ---------------- CHARTS ---------------- */}
      {selectedVendor && (
        <Box
          sx={{
            display: "flex",
            gap: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 2 : 3,
            flexWrap: "wrap",
            mb: isExtraSmall ? 1 : isSmallMobile ? 2 : 3,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          {/* PIE CHART */}
          <Paper
            sx={{
              p: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 1.5 : 2,
              width: isMobile ? "100%" : 350,
            }}
          >
            <Typography
              variant={
                isExtraSmall ? "caption" : isSmallMobile ? "body2" : "subtitle1"
              }
              align="center"
              sx={{
                mb: isExtraSmall ? 0.25 : isSmallMobile ? 0.5 : 1,
                fontSize: isExtraSmall ? "0.75rem" : "inherit",
              }}
            >
              Vendor Summary
            </Typography>

            <ResponsiveContainer
              width="100%"
              height={isExtraSmall ? 150 : isSmallMobile ? 200 : 250}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={isExtraSmall ? 40 : isSmallMobile ? 60 : 90}
                  label={isMobile ? false : true}
                  labelLine={isMobile ? false : true}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(v, n) => [`₹${v}`, n]}
                  contentStyle={{
                    fontSize: isExtraSmall
                      ? "0.65rem"
                      : isSmallMobile
                      ? "0.7rem"
                      : "0.8rem",
                    padding: isExtraSmall
                      ? "2px"
                      : isSmallMobile
                      ? "4px"
                      : "8px",
                  }}
                />
                <Legend
                  layout={isMobile ? "horizontal" : "vertical"}
                  verticalAlign={isMobile ? "bottom" : "middle"}
                  align={isMobile ? "center" : "right"}
                  wrapperStyle={{
                    fontSize: isExtraSmall
                      ? "0.65rem"
                      : isSmallMobile
                      ? "0.7rem"
                      : "0.8rem",
                    paddingTop: isMobile ? "5px" : "0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* BAR CHART */}
          <Paper
            sx={{
              p: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 1.5 : 2,
              flex: 1,
              minWidth: isMobile ? "100%" : 450,
            }}
          >
            <Typography
              variant={
                isExtraSmall ? "caption" : isSmallMobile ? "body2" : "subtitle1"
              }
              align="center"
              sx={{
                mb: isExtraSmall ? 0.25 : isSmallMobile ? 0.5 : 1,
                fontSize: isExtraSmall ? "0.75rem" : "inherit",
              }}
            >
              Product Count
            </Typography>

            <ResponsiveContainer
              width="100%"
              height={isExtraSmall ? 150 : isSmallMobile ? 200 : 300}
            >
              <BarChart
                data={barData}
                margin={{
                  top: 20,
                  right: 30,
                  left: isExtraSmall ? 5 : 20,
                  bottom: isMobile ? 60 : 5,
                }}
              >
                <XAxis
                  dataKey="productName"
                  tick={{
                    fontSize: isExtraSmall ? 7 : isSmallMobile ? 8 : 10,
                    angle: isMobile ? -45 : -30,
                    textAnchor: "end",
                  }}
                  interval={0}
                  height={isMobile ? 60 : 30}
                />
                <YAxis
                  tick={{
                    fontSize: isExtraSmall ? 7 : isSmallMobile ? 8 : 10,
                    width: isExtraSmall ? 30 : 40,
                  }}
                />

                <Tooltip
                  formatter={(v) => [`${v} Packs`, "Total Packs"]}
                  contentStyle={{
                    fontSize: isExtraSmall
                      ? "0.65rem"
                      : isSmallMobile
                      ? "0.7rem"
                      : "0.8rem",
                    padding: isExtraSmall
                      ? "2px"
                      : isSmallMobile
                      ? "4px"
                      : "8px",
                  }}
                />

                <Bar
                  dataKey="count"
                  fill="#0088FE"
                  barSize={isExtraSmall ? 15 : isSmallMobile ? 20 : 40}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      )}

      {/* ---------------- TABLE ---------------- */}
      {vendorName && (
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant={isExtraSmall ? "body2" : "h6"}>
            Ledger for:
          </Typography>

          <Chip
            label={vendorName}
            color="primary"
            size={isExtraSmall ? "small" : "medium"}
            sx={{ ml: 1 }}
          />

          <IconButton
            size="small"
            sx={{ ml: 1 }}
            title="Export Excel"
            onClick={exportToExcel}
          >
            <GridOnIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            title="Export PDF"
            onClick={exportToPDF}
          >
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>

          {/* ADD REPAYMENT BUTTON */}
         <IconButton
  size="small"
  sx={{ ml: 1 }}
  title="Add Repayment"
  onClick={async () => {
    if (!selectedVendor) {
      return toast.warn("Select a vendor first");
    }

    try {
      const res = await customFetch.get(
        `/vendoranalytics/vendor-payments?vendorId=${selectedVendor}`
      );

      const ledger = res.data?.ledger || [];

      const vendor = vendors.find((v) => v._id === selectedVendor);
      const opening = Number(vendor?.openingBalance || 0);

      // If no ledger but vendor has opening balance
      if (ledger.length === 0) {
        if (opening <= 0) {
          toast.info("No outstanding balance.");
          return;
        }

        setRemainingBalance(opening);
        setPaymentModalOpen(true);
        return;
      }

      // Calculate purchase total
      let purchaseTotal = 0;

      ledger.forEach((row) => {
        if (row.type === "PURCHASE") {
          purchaseTotal += Number(row.debit || 0);
        }
      });

      const balance = purchaseTotal + opening;

      if (balance <= 0) {
        toast.info(`No outstanding payable (Remaining: ₹${balance})`);
        return;
      }

      setRemainingBalance(balance);
      setPaymentModalOpen(true);

    } catch {
      toast.error("Failed to check vendor ledger");
    }
  }}
>
            <PaymentIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Paper
        sx={{
          p: isExtraSmall ? 0.5 : isSmallMobile ? 1 : isMobile ? 1.5 : 2,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            py={isExtraSmall ? 2 : isSmallMobile ? 3 : 5}
          >
            <CircularProgress
              size={isExtraSmall ? 20 : isSmallMobile ? 24 : 28}
            />
          </Box>
        ) : rows.length === 0 ? (
          <Typography
            align="center"
            color="text.secondary"
            variant={
              isExtraSmall ? "caption" : isSmallMobile ? "body2" : "body1"
            }
            sx={{ fontSize: isExtraSmall ? "0.75rem" : "inherit", py: 3 }}
          >
            No ledger entries found
          </Typography>
        ) : isSmallMobile ? (
          // Mobile-friendly card-based layout for table data
          <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
            {rows.map((row, index) => (
              <MobileTableRow row={row} index={index} key={index} />
            ))}
          </Box>
        ) : (
          // Regular table for larger screens
          <TableContainer
            sx={{
              overflowX: "auto",
              "&::-webkit-scrollbar": {
                height: isExtraSmall ? 4 : 6,
              },
            }}
          >
            <Table
              size={isExtraSmall ? "small" : isSmallMobile ? "small" : "medium"}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      p: isExtraSmall
                        ? "2px 4px"
                        : isSmallMobile
                        ? "4px 8px"
                        : "inherit",
                      fontSize: isExtraSmall
                        ? "0.65rem"
                        : isSmallMobile
                        ? "0.7rem"
                        : "inherit",
                      minWidth: isExtraSmall ? 60 : 80,
                    }}
                  >
                    Date
                  </TableCell>
                  <TableCell
                    sx={{
                      p: isExtraSmall
                        ? "2px 4px"
                        : isSmallMobile
                        ? "4px 8px"
                        : "inherit",
                      fontSize: isExtraSmall
                        ? "0.65rem"
                        : isSmallMobile
                        ? "0.7rem"
                        : "inherit",
                      minWidth: isExtraSmall ? 50 : 70,
                    }}
                  >
                    Type
                  </TableCell>
                  <TableCell
                    sx={{
                      p: isExtraSmall
                        ? "2px 4px"
                        : isSmallMobile
                        ? "4px 8px"
                        : "inherit",
                      fontSize: isExtraSmall
                        ? "0.65rem"
                        : isSmallMobile
                        ? "0.7rem"
                        : "inherit",
                      minWidth: isExtraSmall ? 70 : 100,
                    }}
                  >
                    Reference
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      p: isExtraSmall
                        ? "2px 4px"
                        : isSmallMobile
                        ? "4px 8px"
                        : "inherit",
                      fontSize: isExtraSmall
                        ? "0.65rem"
                        : isSmallMobile
                        ? "0.7rem"
                        : "inherit",
                      minWidth: isExtraSmall ? 60 : 80,
                    }}
                  >
                    Debit (₹)
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      p: isExtraSmall
                        ? "2px 4px"
                        : isSmallMobile
                        ? "4px 8px"
                        : "inherit",
                      fontSize: isExtraSmall
                        ? "0.65rem"
                        : isSmallMobile
                        ? "0.7rem"
                        : "inherit",
                      minWidth: isExtraSmall ? 60 : 80,
                    }}
                  >
                    Credit (₹)
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      p: isExtraSmall
                        ? "2px 4px"
                        : isSmallMobile
                        ? "4px 8px"
                        : "inherit",
                      fontSize: isExtraSmall
                        ? "0.65rem"
                        : isSmallMobile
                        ? "0.7rem"
                        : "inherit",
                      minWidth: isExtraSmall ? 70 : 90,
                    }}
                  >
                    Balance (₹)
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell
                      sx={{
                        p: isExtraSmall
                          ? "2px 4px"
                          : isSmallMobile
                          ? "4px 8px"
                          : "inherit",
                        fontSize: isExtraSmall
                          ? "0.65rem"
                          : isSmallMobile
                          ? "0.7rem"
                          : "inherit",
                      }}
                    >
                      {new Date(r.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: isExtraSmall ? "2-digit" : "numeric",
                      })}
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall
                          ? "2px 4px"
                          : isSmallMobile
                          ? "4px 8px"
                          : "inherit",
                        fontSize: isExtraSmall
                          ? "0.65rem"
                          : isSmallMobile
                          ? "0.7rem"
                          : "inherit",
                      }}
                    >
                      {r.type}
                    </TableCell>
                    <TableCell
                      sx={{
                        p: isExtraSmall
                          ? "2px 4px"
                          : isSmallMobile
                          ? "4px 8px"
                          : "inherit",
                        fontSize: isExtraSmall
                          ? "0.65rem"
                          : isSmallMobile
                          ? "0.7rem"
                          : "inherit",
                      }}
                    >
                      {r.referenceId
                        ? isExtraSmall
                          ? `${r.referenceId.substring(0, 4)}...`
                          : r.referenceId
                        : "—"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        p: isExtraSmall
                          ? "2px 4px"
                          : isSmallMobile
                          ? "4px 8px"
                          : "inherit",
                        fontSize: isExtraSmall
                          ? "0.65rem"
                          : isSmallMobile
                          ? "0.7rem"
                          : "inherit",
                      }}
                    >
                      {r.debit ? Number(r.debit).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        p: isExtraSmall
                          ? "2px 4px"
                          : isSmallMobile
                          ? "4px 8px"
                          : "inherit",
                        fontSize: isExtraSmall
                          ? "0.65rem"
                          : isSmallMobile
                          ? "0.7rem"
                          : "inherit",
                      }}
                    >
                      {r.credit ? Number(r.credit).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        p: isExtraSmall
                          ? "2px 4px"
                          : isSmallMobile
                          ? "4px 8px"
                          : "inherit",
                        fontSize: isExtraSmall
                          ? "0.65rem"
                          : isSmallMobile
                          ? "0.7rem"
                          : "inherit",
                      }}
                    >
                      {Number(r.balance || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* REPAYMENT MODAL */}
      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}>
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
              xs: "100%", // 📱 Mobile: full width
              sm: 420, // 💻 Desktop: fixed width
            },

            maxHeight: {
              xs: "90vh", // 📱 Prevent overflow
              sm: "auto",
            },

            overflowY: "auto",

            bgcolor: "white",
            p: 3,
            borderRadius: {
              xs: "16px 16px 0 0", // 📱 Bottom sheet style
              sm: 2,
            },
          }}
        >
          <Typography variant="h6">Add Vendor Repayment</Typography>

          <Typography sx={{ color: "red", fontWeight: "bold", mb: 2 }}>
            Remaining Balance: ₹{remainingBalance}
          </Typography>

          <TextField
            label="Amount"
            type="number"
            fullWidth
            sx={{ mb: 2 }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <TextField
            select
            label="Mode"
            fullWidth
            sx={{ mb: 2 }}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="Bank">Bank Transfer</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>

          <TextField
            label="Reference"
            fullWidth
            sx={{ mb: 2 }}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <TextField
            label="Notes"
            fullWidth
            sx={{ mb: 2 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button
            variant="contained"
            fullWidth
            disabled={Number(remainingBalance) <= 0}
            onClick={async () => {
              const paying = Number(amount || 0);
              const balance = Number(remainingBalance || 0);

              if (!amount) return toast.warn("Enter amount");

              if (paying > balance) {
                return toast.error(
                  `Amount exceeds remaining balance (Max: ₹${balance})`
                );
              }

              try {
                await customFetch.post("/vendorsLedger/vendor-payments", {
                  vendorId: selectedVendor,
                  amount: paying,
                  mode,
                  reference,
                  notes,
                });

                toast.success("Payment added");
                setPaymentModalOpen(false);
                setAmount("");
                setReference("");
                setNotes("");
                setMode("Cash");

                fetchLedger(selectedVendor);
              } catch {
                toast.error("Failed to add repayment");
              }
            }}
          >
            Submit
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
