import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
  useMediaQuery,
  TableContainer,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";

import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; //  FIXED IMPORT

import customFetch from "../../utils/customFetch";
import Breadcrumbs from "../../components/common/BreadCrumbs";
import getLocalizedText from "../../utils/getLocalizedText";
import { useParams } from "react-router-dom";

export default function PurchaseLedger() {
  const theme = useTheme();
  const { lang = "en" } = useParams();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallMobile = useMediaQuery("(max-width:320px)");

  const [ledger, setLedger] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendor, setVendor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [monthly, setMonthly] = useState([]);
  const [vendorSummary, setVendorSummary] = useState([]);
  const [purchasePayments, setPurchasePayments] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [openPayments, setOpenPayments] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  const normalizeEN = (value) => {
    if (!value) return "";

    // plain string
    if (typeof value === "string") {
      // old stringified object case
      if (value.includes("en:")) {
        try {
          const fixed = value.replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
          const parsed = JSON.parse(fixed);
          return parsed.en || value;
        } catch {
          return value;
        }
      }
      return value;
    }

    // proper object
    if (typeof value === "object") {
      return value.en || "";
    }

    return "";
  };

  const top5VendorSummary = [...vendorSummary]
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map((v) => ({
      ...v,
      vendor: normalizeEN(v.vendor),
    }));
  const top5Outstanding = [...outstanding]
    .sort((a, b) => (b.pending || 0) - (a.pending || 0))
    .slice(0, 5)
    .map((o) => ({
      ...o,
      vendor: normalizeEN(o.vendor),
    }));

  const safeVendorSummary = vendorSummary.map((v) => ({
    ...v,
    vendor: getLocalizedText(v.vendor, lang),
  }));

  const safeOutstanding = outstanding.map((o) => ({
    ...o,
    vendor: getLocalizedText(o.vendor, lang),
  }));

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
  ];

  // LOAD DATA
  const loadData = async () => {
    try {
      const ledgerRes = await customFetch.get(
        `/purchase-ledger?vendorId=${vendor}&from=${from}&to=${to}`,
      );
      setLedger(ledgerRes?.data?.data || []);

      setMonthly(
        (await customFetch.get("/purchase-ledger/summary/monthly")).data
          ?.data || [],
      );
      setVendorSummary(
        (await customFetch.get("/purchase-ledger/summary/vendor")).data?.data ||
          [],
      );
      setPurchasePayments(
        (await customFetch.get("/purchase-ledger/summary/payments")).data
          ?.data || [],
      );
      setOutstanding(
        (await customFetch.get("/purchase-ledger/summary/outstanding")).data
          ?.data || [],
      );
    } catch (err) {
      console.error("Load Error:", err);
    }
  };

  // LOAD VENDORS
  const loadVendors = async () => {
    try {
      const res = await customFetch.get("/vendors");
      setVendors(res?.data?.vendors || []);
    } catch (err) {
      console.error("Vendor Load Error:", err);
    }
  };

  useEffect(() => {
    loadData();
    loadVendors();
  }, []);

  const handleTabChange = (e, v) => setTabValue(v);

  // EXPORT EXCEL
  const exportExcel = () => {
    const ledgerRows = ledger.map((row) => ({
      Date: row.date ? new Date(row.date).toLocaleDateString() : "-",
      Vendor: getLocalizedText(row.vendor, lang) || "-",
      Bill: row.billAmount ?? 0,
      Paid: row.paidAmount ?? 0,
      Balance: row.balanceAmount ?? 0,
    }));
    const monthlyRows = monthly.map((m) => ({
      Month: m.month,
      Total: m.total ?? 0,
    }));
    const vendorRows = top5VendorSummary.map((v) => ({
      Vendor: getLocalizedText(v.vendor, lang) || "-",
      Amount: v.amount ?? 0,
    }));
    const purchaseVsPaidRows = purchasePayments.map((p) => ({
      Month: p.month,
      Purchase: p.purchase ?? 0,
      Paid: p.paid ?? 0,
      Balance: p.balance ?? 0,
    }));
    const outstandingRows = top5Outstanding.map((o) => ({
      Vendor: getLocalizedText(o.vendor, lang) || "-",
      Pending: o.pending ?? 0,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(ledgerRows),
      "Purchase Ledger",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(monthlyRows),
      "Monthly Purchases",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(vendorRows),
      "Vendor Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(purchaseVsPaidRows),
      "Purchase vs Paid",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(outstandingRows),
      "Outstanding",
    );
    XLSX.writeFile(wb, "Purchase_Ledger.xlsx");
  };

  // ===============================================================
  //  FIXED PDF EXPORT (NO ERRORS)
  // ===============================================================
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Purchase Ledger Entries", 14, 15);
      const tableRows = ledger.map((row) => [
        row.date ? new Date(row.date).toLocaleDateString() : "-",
        getLocalizedText(row.vendor, lang) || "-",
        row.billAmount ?? 0,
        row.paidAmount ?? 0,
        row.balanceAmount ?? 0,
      ]);
      autoTable(doc, {
        startY: 25,
        head: [["Date", "Vendor", "Bill", "Paid", "Balance"]],
        body: tableRows,
      });
      let nextY = (doc.lastAutoTable?.finalY || 25) + 10;
      if (nextY > 180) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFontSize(12);
      doc.text("Monthly Purchases", 14, nextY);
      autoTable(doc, {
        startY: nextY + 3,
        head: [["Month", "Total"]],
        body: monthly.map((m) => [m.month, m.total ?? 0]),
      });
      nextY = (doc.lastAutoTable?.finalY || nextY) + 10;
      if (nextY > 180) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFontSize(12);
      doc.text("Vendor Summary", 14, nextY);
      autoTable(doc, {
        startY: nextY + 3,
        head: [["Vendor", "Amount"]],
        body: top5VendorSummary.map((v) => [
          getLocalizedText(v.vendor, lang) || "-",
          v.amount ?? 0,
        ]),
      });
      nextY = (doc.lastAutoTable?.finalY || nextY) + 10;
      if (nextY > 180) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFontSize(12);
      doc.text("Purchase vs Paid", 14, nextY);
      autoTable(doc, {
        startY: nextY + 3,
        head: [["Month", "Purchase", "Paid", "Balance"]],
        body: purchasePayments.map((p) => [
          p.month,
          p.purchase ?? 0,
          p.paid ?? 0,
          p.balance ?? 0,
        ]),
      });
      nextY = (doc.lastAutoTable?.finalY || nextY) + 10;
      if (nextY > 180) {
        doc.addPage();
        nextY = 20;
      }
      doc.setFontSize(12);
      doc.text("Outstanding by Vendor", 14, nextY);
      autoTable(doc, {
        startY: nextY + 3,
        head: [["Vendor", "Pending"]],
        body: top5Outstanding.map((o) => [
          getLocalizedText(o.vendor, lang) || "-",
          o.pending ?? 0,
        ]),
      });
      doc.save("Purchase_Ledger.pdf");
    } catch (err) {
      console.log("PDF ERROR:", err);
    }
  };

  // ===============================================================

  // MOBILE CHARTS ---------------------
  const renderMonthlyMobile = () => (
    <Box sx={{ width: "100%" }}>
      <Typography fontWeight={600} textAlign="center" mb={1}>
        Monthly Purchases
      </Typography>

      <Box sx={{ height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={monthly}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <ReTooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="total" fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );

  const renderVendorMobile = () => (
    <Box sx={{ width: "100%" }}>
      <Typography fontWeight={600} textAlign="center" mb={1}>
        Vendor-wise Purchases
      </Typography>

      <Box sx={{ height: 240 }}>
        <ResponsiveContainer>
          <PieChart>
            <ReTooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />

            <Pie
              data={top5VendorSummary}
              dataKey="amount"
              nameKey="vendor"
              cx="50%"
              cy="50%"
              outerRadius={90}
            >
              {top5VendorSummary.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );

  const renderPurchaseVsPaidMobile = () => (
    <Box sx={{ width: "100%" }}>
      <Typography fontWeight={600} textAlign="center" mb={1}>
        Purchase vs Paid
      </Typography>

      <Box sx={{ height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={purchasePayments}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <ReTooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="purchase"
              fill={theme.palette.primary.main}
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="paid"
              fill={theme.palette.success.main}
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="balance"
              fill={theme.palette.warning.main}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );

  const renderOutstandingMobile = () => (
    <Box sx={{ width: "100%" }}>
      <Typography fontWeight={600} textAlign="center" mb={1}>
        Outstanding by Vendor
      </Typography>

      <Box sx={{ height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={safeOutstanding}>
            <XAxis dataKey="vendor" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} />
            <ReTooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="pending" fill={theme.palette.error.main} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );

  // UI -----------------------
  return (
    <Box sx={{ p: isMobile ? 1.5 : 3, width: "90%", maxWidth: "90vw" }}>
      {/* <Breadcrumbs /> */}

      <Typography variant={isMobile ? "h6" : "h5"} fontWeight={600} mb={2}>
        Purchase Ledger
      </Typography>

      {/* Charts */}
      {isMobile ? (
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isSmallMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isSmallMobile ? "auto" : false}
          >
            <Tab label="Monthly" />
            <Tab label="Vendor" />
            <Tab label="Purchase vs Paid" />
            <Tab label="Outstanding" />
          </Tabs>

          <Box sx={{ p: 1.5 }}>
            {tabValue === 0 && renderMonthlyMobile()}
            {tabValue === 1 && renderVendorMobile()}
            {tabValue === 2 && renderPurchaseVsPaidMobile()}
            {tabValue === 3 && renderOutstandingMobile()}
          </Box>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 3,
            mb: 4,
          }}
        >
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={600}>Monthly Purchases</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Bar dataKey="total" fill={COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={600}>Vendor-wise Purchases</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <ReTooltip />
                  <Legend />
                  <Pie
                    data={top5VendorSummary}
                    dataKey="amount"
                    nameKey="vendor"
                    outerRadius={70}
                  >
                    {top5VendorSummary.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={600}>Purchase vs Paid</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={purchasePayments}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ReTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="purchase"
                    fill={COLORS[0]}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="paid"
                    fill={COLORS[1]}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    fill={COLORS[2]}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={600}>Outstanding by Vendor</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={top5Outstanding}>
                  <XAxis dataKey="vendor" />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="pending" fill={theme.palette.error.main} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>
      )}

      {/* LEDGER TABLE */}
      <Paper sx={{ p: isMobile ? 1.5 : 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexDirection: isMobile ? "column" : "row",
            gap: 1.5,
          }}
        >
          {/* Filters */}
          <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 1.5 : 2,
              }}
            >
              <TextField
                select
                label="Vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                size={isMobile ? "small" : "medium"}
                sx={{ minWidth: isMobile ? "100%" : 200 }}
              >
                <MenuItem value="">All Vendors</MenuItem>
                {vendors.map((v) => (
                  <MenuItem key={v._id} value={v._id}>
                    {getLocalizedText(v.name, lang)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                type="date"
                label="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: isMobile ? "100%" : 180 }}
                size={isMobile ? "small" : "medium"}
              />

              <TextField
                type="date"
                label="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: isMobile ? "100%" : 180 }}
                size={isMobile ? "small" : "medium"}
              />

              <Button
                variant="contained"
                onClick={loadData}
                fullWidth={isMobile}
              >
                Search
              </Button>
            </Box>
          </Paper>

          <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight={600}>
            Ledger Entries
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Export to Excel">
              <IconButton color="primary" onClick={exportExcel}>
                <GridOnIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Export to PDF">
              <IconButton color="error" onClick={exportPDF}>
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 350 }}>
          <Table stickyHeader size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                {["Date", "Vendor", "Bill", "Paid", "Balance", "Payments"].map(
                  (head) => (
                    <TableCell key={head}>{head}</TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {ledger.length > 0 ? (
                ledger.map((row) => (
                  <TableRow key={row.purchaseId} hover>
                    <TableCell>
                      {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {getLocalizedText(row.vendor, lang) || "-"}
                    </TableCell>

                    <TableCell>₹{row.billAmount ?? 0}</TableCell>
                    <TableCell>₹{row.paidAmount ?? 0}</TableCell>
                    <TableCell>₹{row.balanceAmount ?? 0}</TableCell>

                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedPayments(row.payments || []);
                          setOpenPayments(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* PAYMENT MODAL */}
      <Dialog
        open={openPayments}
        onClose={() => setOpenPayments(false)}
        fullScreen={isMobile}
        fullWidth
      >
        <DialogTitle>Payment History</DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  {["Date", "Amount", "Mode", "Reference"].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {selectedPayments.length > 0 ? (
                  selectedPayments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>
                        {p.paymentDate
                          ? new Date(p.paymentDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>₹{p.amount ?? 0}</TableCell>
                      <TableCell>
                        {getLocalizedText(p.mode, lang) || "-"}
                      </TableCell>

                      <TableCell>{p.reference || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No payments for this bill.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

