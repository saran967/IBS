import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
  Pagination,
  Stack,
  Grid,
  Divider,
  Card,
  CardContent,
  TableContainer,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import customFetch from "../../utils/customFetch";
import getLocalizedText from "../../utils/getLocalizedText";

export default function SalesLedger() {
  const { lang = "en" } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [ledger, setLedger] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [monthly, setMonthly] = useState([]);
  const [customerSummary, setCustomerSummary] = useState([]);
  const [salesPayments, setSalesPayments] = useState([]);
  const [outstanding, setOutstanding] = useState([]);

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const formatAmount = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const normalizeLabel = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value.en || "";
    return "";
  };

  const loadData = async () => {
    try {
      const ledgerRes = await customFetch.get(`/sales-ledger?customerId=${customer}&from=${from}&to=${to}`);
      setLedger(ledgerRes?.data?.data || []);

      const [mRes, cRes, pRes, oRes] = await Promise.all([
        customFetch.get("/sales-ledger/summary/monthly"),
        customFetch.get("/sales-ledger/summary/customer"),
        customFetch.get("/sales-ledger/summary/payments"),
        customFetch.get("/sales-ledger/summary/outstanding"),
      ]);

      setMonthly(mRes.data?.data || []);
      setCustomerSummary(cRes.data?.data || []);
      setSalesPayments(pRes.data?.data || []);
      setOutstanding(oRes.data?.data || []);
      setPage(1);
    } catch (err) {
      console.error("Sales Ledger load error:", err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await customFetch.get("/customer");
      setCustomers(res?.data?.customers || []);
    } catch (err) {
      console.error("Load customers error:", err);
    }
  };

  useEffect(() => {
    loadData();
    loadCustomers();
  }, []);

  const totals = useMemo(() => {
    return ledger.reduce((acc, curr) => ({
      bill: acc.bill + (curr.billAmount || 0),
      paid: acc.paid + (curr.paidAmount || 0),
      balance: acc.balance + (curr.balanceAmount || 0),
    }), { bill: 0, paid: 0, balance: 0 });
  }, [ledger]);

  const top5CustomerSummary = useMemo(() => {
    return [...customerSummary]
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 5)
      .map(d => ({ ...d, customer: normalizeLabel(d.customer) }));
  }, [customerSummary]);

  const pieColors = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#9C27B0"];

  const paginatedLedger = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return ledger.slice(start, start + rowsPerPage);
  }, [ledger, page]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Sales Ledger Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = ledger.map(row => [
      new Date(row.date).toLocaleDateString(),
      row.invoiceNumber || "-",
      normalizeLabel(row.customer),
      formatAmount(row.billAmount),
      formatAmount(row.paidAmount),
      formatAmount(row.balanceAmount),
    ]);

    autoTable(doc, {
      head: [["Date", "Invoice", "Customer", "Bill Amount", "Paid Amount", "Balance"]],
      body: tableData,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [66, 133, 244] }
    });
    doc.save("SalesLedger.pdf");
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 4 }, minHeight: "100vh", bgcolor: "#f4f7fe" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        flexDirection={{ xs: "column", sm: "row" }}
        gap={{ xs: 2, sm: 0 }}
        mb={4}
      >
        <Box>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight={800} color="#1B2559">Sales Dashboard</Typography>
          <Typography variant="subtitle1" color="text.secondary">Comprehensive overview of sales activities</Typography>
        </Box>
        <Box
          display="flex"
          gap={2}
          width={{ xs: "100%", sm: "auto" }}
          flexDirection={{ xs: "column", sm: "row" }}
        >
          <Button variant="contained" onClick={exportPDF} sx={{ borderRadius: 2, px: 3, bgcolor: "#4285F4", width: { xs: "100%", sm: "auto" } }}>Export PDF</Button>
          <Button variant="contained" onClick={() => {
            const excelData = ledger.map(row => ({
              Date: new Date(row.date).toLocaleDateString(),
              Invoice: row.invoiceNumber || "-",
              Customer: normalizeLabel(row.customer),
              "Bill Amount": row.billAmount || 0,
              "Paid Amount": row.paidAmount || 0,
              Balance: row.balanceAmount || 0,
            }));
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Ledger");
            XLSX.writeFile(workbook, "SalesLedger.xlsx");
          }} sx={{ borderRadius: 2, px: 3, bgcolor: "#34A853", width: { xs: "100%", sm: "auto" } }}>Export Excel</Button>
        </Box>
      </Box>

      {/* SUMMARY CARDS */}
     <Grid container spacing={3} mb={4} alignItems="stretch">
        {[
          { label: "Total Sales", value: totals.bill, color: "#4285F4", bg: "#E9F2FF" },
          { label: "Amount Paid", value: totals.paid, color: "#34A853", bg: "#E6F6EC" },
          { label: "Outstanding", value: totals.balance, color: "#EA4335", bg: "#FEECEB" },
          { label: "Total Invoices", value: ledger.length, color: "#9C27B0", bg: "#F5E9FF" },
        ].map((card, idx) => (
          <Grid item xs={12} sm={6} md={3} lg={3} key={idx}>
            <Card sx={{ borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "none" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: card.bg, color: card.color, display: "flex" }}>
                  <Typography variant="h5">₹</Typography>
                </Box>
                <Box sx={{width:150}}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">{card.label.toUpperCase()}</Typography>
                  <Typography variant="h5" fontWeight={700} color="#1B2559">
                    {typeof card.value === 'number' && card.label !== "Total Invoices" ? `₹${formatAmount(card.value)}` : card.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* FILTER BAR */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 4, borderRadius: 4, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <TextField
          select
          label="Filter by Customer"
          size="small"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          sx={{ width: { xs: "100%", sm: 250 } }}
        >
          <MenuItem value="">All Customers</MenuItem>
          {customers.map((c) => (
            <MenuItem key={c._id} value={c._id}>{normalizeLabel(c.customerName)}</MenuItem>
          ))}
        </TextField>

        <TextField type="date" label="From Date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: "auto" } }} />
        <TextField type="date" label="To Date" size="small" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: { xs: "100%", sm: "auto" } }} />

        <Button
          variant="contained"
          onClick={loadData}
          sx={{
            borderRadius: 2,
            px: 4,
            height: 40,
            width: { xs: "100%", sm: "auto" },
            background: "linear-gradient(135deg, #4285F4 0%, #2A5BD7 100%)",
          }}
        >
          Apply Filters
        </Button>
      </Paper>

      {/* CHARTS SECTION */}
      <Grid container spacing={3} mb={4} alignItems="stretch">
<Grid item xs={12} md={6} sx={{ display: "flex", width:550 }} >
 <Paper
  sx={{
    p: { xs: 2, sm: 3 },
    borderRadius: 4,
    height: "100%",
    width: "100%",
    minHeight: 380,
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  }}
>
            <Typography variant="h6" fontWeight={700} mb={3}>Monthly Sales Performance</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={salesPayments}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4285F4" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4285F4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E5F2" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#A3AED0', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A3AED0', fontSize: 12 }} />
                <ReTooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="sales" name="Total Sales" stroke="#4285F4" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="paid" name="Payments" stroke="#34A853" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
  <Grid item xs={12} md={6} sx={{ display: "flex", width:550 }} >
 <Paper
  sx={{
    p: { xs: 2, sm: 3 },
    borderRadius: 4,
    height: "100%",
    width: "100%",
    minHeight: 380,
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  }}
 
>
            <Typography variant="h6" fontWeight={700} mb={3}>Customer Contribution</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={top5CustomerSummary} dataKey="amount" nameKey="customer" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {top5CustomerSummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <ReTooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* DETAILED TABLE */}
      <Paper sx={{ p: 0, borderRadius: 4, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
        <Box
          p={{ xs: 2, sm: 3 }}
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          flexDirection={{ xs: "column", sm: "row" }}
          gap={{ xs: 1, sm: 0 }}
        >
          <Typography variant="h6" fontWeight={700}>Sales Transactions</Typography>
          <Typography variant="body2" color="text.secondary">Showing {paginatedLedger.length} of {ledger.length} entries</Typography>
        </Box>
        <Divider />
        <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 760 }}>
            <TableHead sx={{ bgcolor: "#f9fafb" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: "#A3AED0" }}>DATE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#A3AED0" }}>INVOICE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#A3AED0" }}>CUSTOMER</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#A3AED0" }}>BILL AMOUNT</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#A3AED0" }}>PAID</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#A3AED0" }}>BALANCE</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLedger.map((row) => (
                <TableRow key={row.saleId} hover>
                  <TableCell fontWeight={500}>{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell color="primary" fontWeight={600}>{row.invoiceNumber || "-"}</TableCell>
                  <TableCell>{normalizeLabel(row.customer)}</TableCell>
                  <TableCell fontWeight={700}>₹{formatAmount(row.billAmount)}</TableCell>
                  <TableCell color="success.main" fontWeight={600}>₹{formatAmount(row.paidAmount)}</TableCell>
                  <TableCell color="error.main" fontWeight={600}>₹{formatAmount(row.balanceAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {Math.ceil(ledger.length / rowsPerPage) > 1 && (
          <Box p={{ xs: 2, sm: 3 }} display="flex" justifyContent="center">
            <Pagination count={Math.ceil(ledger.length / rowsPerPage)} page={page} onChange={(_, v) => setPage(v)} color="primary" shape="rounded" />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
