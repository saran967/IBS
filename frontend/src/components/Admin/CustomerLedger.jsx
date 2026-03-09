import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Divider,
  Chip,
  Stack,
  Card,
  CardContent,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Checkbox,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ArrowBack,
  AccountBalanceWallet,
  Payments,
  Download,
  CheckBox,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const getLocalizedText = (value, lang = "en") => {
  if (!value) return "—";
  if (typeof value === "object") {
    return value[lang] || value.en || value.ta || "—";
  }
  return value;
};

const CustomerLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ledger, setLedger] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [totals, setTotals] = useState({});
  const [payments, setPayments] = useState([]);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [note, setNote] = useState("");
  const [selectedPayments, setSelectedPayments] = useState([]);
  const fetchLedgerData = async () => {
    try {
      const res = await customFetch.get(`/customer/${id}/ledger`);
      setCustomer(res.data.customer);
      setLedger(res.data.ledger);
      setTotals(res.data.totals);
    } catch {
      toast.error("Failed to load ledger");
    }
  };

  const downloadSelectedReceipts = () => {
    const selected = payments.filter((p) => selectedPayments.includes(p._id));

    if (!selected.length) {
      toast.warn("No payments selected");
      return;
    }

    const doc = new jsPDF();

    /* ===== HEADER ===== */
    doc.setFontSize(20);
    doc.text("PAYMENT STATEMENT", 105, 20, { align: "center" });

    /* ===== CUSTOMER INFO ===== */
    doc.setFontSize(12);
    doc.text(`Customer: ${getLocalizedText(customer.customerName)}`, 14, 40);
    doc.text(`Phone: ${customer.mobileNumber || "-"}`, 14, 48);
    doc.text(`Date: ${format(new Date(), "dd MMM yyyy")}`, 14, 56);

    /* ===== TABLE DATA ===== */
   const tableRows = selected.map((p, index) => [
  index + 1,
  format(new Date(p.date), "dd MMM yyyy"),
  p.paymentMode,
  p.note || "-",
  Number(p.amount).toLocaleString("en-IN"),
]);

    autoTable(doc, {
      startY: 70,
      head: [["#", "Date", "Mode", "Note", "Amount"]],
      body: tableRows,
    });

    /* ===== TOTAL ===== */
    const total = selected.reduce((sum, p) => sum + p.amount, 0);

    doc.setFontSize(14);
    doc.text(`Total Received: Rs ${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 15);

    /* ===== FOOTER ===== */
    doc.setFontSize(11);
    doc.text(
      "Thank you for your business!",
      105,
      doc.lastAutoTable.finalY + 30,
      {
        align: "center",
      },
    );

    doc.save("Payment_Statement.pdf");
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await customFetch.get(`/customer/${id}/payment-history`);
      setPayments(res.data.payments || []);
    } catch {
      toast.error("Failed to load payment history");
    }
  };
  const toggleSelect = (id) =>
    setSelectedPayments((prev = []) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  useEffect(() => {
    fetchLedgerData();
    fetchPaymentHistory();
  }, [id]);

  const recordPayment = async () => {
    const paying = Number(paymentAmount || 0);
    const balance = Number(totals?.totalBalance || 0);

    if (!paymentAmount || Number(paymentAmount) <= 0) {
  return toast.warn("Enter valid payment amount");
}

    if (paying > balance) {
      return toast.error(`Amount exceeds remaining balance (Max: ₹${balance})`);
    }

    try {
      await customFetch.post("/customer/payment", {
        customerId: id,
        amount: Number(paymentAmount),
        paymentMode,
        note,
      });

      toast.success("Payment recorded");
      setOpenPaymentModal(false);
      setPaymentAmount("");
      setNote("");

      fetchLedgerData();
      fetchPaymentHistory();
    } catch {
      toast.error("Payment failed");
    }
  };

  // const downloadReceipt = async (paymentId) => {
  //   try {
  //     const response = await customFetch.get(
  //       `/customer/payment/${paymentId}/receipt`,
  //       {
  //         responseType: "blob", // VERY IMPORTANT
  //       },
  //     );

  //     // Create blob link
  //     const file = new Blob([response.data], { type: "application/pdf" });
  //     const fileURL = URL.createObjectURL(file);

  //     // Download trigger
  //     const link = document.createElement("a");
  //     link.href = fileURL;
  //     link.download = `Receipt_${paymentId}.pdf`;
  //     link.click();

  //     URL.revokeObjectURL(fileURL);
  //   } catch (error) {
  //     toast.error("Failed to download receipt");
  //   }
  // };

  //  Correct chart data mapping

  const downloadReceipt = (payment) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Customer: ${getLocalizedText(customer.customerName)}`, 14, 40);
    doc.text(`Phone: ${customer.mobileNumber || "-"}`, 14, 48);
    doc.text(`Payment Mode: ${payment.paymentMode}`, 14, 56);
    doc.text(
      `Date: ${format(new Date(payment.date), "dd MMM yyyy, hh:mm a")}`,
      14,
      64,
    );

    autoTable(doc, {
      startY: 75,
      head: [["Description", "Amount (₹)"]],
      body: [["Payment Received", payment.amount.toFixed(2)]],
    });

    doc.setFontSize(14);
    doc.text(
      `Total Received: ₹${payment.amount}`,
      14,
      doc.lastAutoTable.finalY + 15,
    );

    doc.setFontSize(11);
    doc.text(
      "Thank you for your payment!",
      105,
      doc.lastAutoTable.finalY + 30,
      {
        align: "center",
      },
    );

    doc.save(`Receipt_${payment._id}.pdf`);
  };

  const chartData = ledger.map((entry) => ({
    date: entry.invoiceNumber || format(new Date(entry.saleDate), "dd MMM"),
   gross: entry.netTotal ?? entry.grossTotal ?? 0,
    paid: entry.paidAmount ?? 0,
    balance: entry.balanceAmount ?? 0,
  }));

  return (
    <Box sx={{ p: 3, minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          Back
        </Button>

        <Chip
          icon={<AccountBalanceWallet />}
          label={`Balance: ₹${totals?.totalBalance || 0}`}
          color={totals.totalBalance > 0 ? "error" : "success"}
          sx={{ fontWeight: "bold" }}
        />
      </Box>

      {customer && (
        <Card sx={{ mt: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="h5" fontWeight="bold">
              {getLocalizedText(customer.customerName)}
            </Typography>
            <Typography color="text.secondary">
              {customer.customerType}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={5}>
              <Box>
                <Typography>Sales</Typography>
                <Typography fontWeight="bold">₹{totals.totalSales}</Typography>
              </Box>
              <Box>
                <Typography>Paid</Typography>
                <Typography fontWeight="bold" color="green">
                  ₹{totals.totalPaid}
                </Typography>
              </Box>
              <Box>
                <Typography>Balance</Typography>
                <Typography fontWeight="bold" color="red">
                  ₹{totals.totalBalance}
                </Typography>
              </Box>
            </Stack>

            <Button
              startIcon={<Payments />}
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => {
                if (totals?.totalBalance <= 0) {
                  toast.info(
                    "Customer has no outstanding due. Payment not required.",
                  );
                  return;
                }
                setOpenPaymentModal(true);
              }}
            >
              Record Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {ledger.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography fontWeight="bold" sx={{ mb: 2 }}>
            Sales Overview
          </Typography>

          <Paper sx={{ p: 2, mb: 3 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="gross" fill="#1976d2" name="Gross" />
                <Bar dataKey="paid" fill="#2e7d32" name="Paid" />
                <Bar dataKey="balance" fill="#d32f2f" name="Balance" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="gross" stroke="#ff9800" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      )}

      <Typography variant="h6" sx={{ mb: 1 }}>
        Sales Ledgers
      </Typography>
      <Paper sx={{ mb: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Gross</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Balance</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {ledger.map((l) => (
                <TableRow key={l._id}>
                  <TableCell>
                    {format(new Date(l.saleDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>₹{l.netTotal ?? l.grossTotal}</TableCell>
     <TableCell sx={{ color: "green" }}>
₹{Number(l.paidAmount || 0).toFixed(2)}
</TableCell>
       <TableCell sx={{ color: "red" }}>
₹{Number(l.balanceAmount || 0).toFixed(2)}
</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Payment History
        <Button
          variant="contained"
          sx={{ mb: 2 }}
          onClick={downloadSelectedReceipts}
        >
          Download Selected
        </Button>
      </Typography>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Select</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Note</TableCell>
                <TableCell>Receipt</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {payments.length > 0 ? (
                payments.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPayments?.includes(p._id)}
                        onChange={() => toggleSelect(p._id)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(p.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(p.invoices) && p.invoices.length > 0
                        ? p.invoices.map((i) => getLocalizedText(i)).join(", ")
                        : "-"}
                    </TableCell>

                    <TableCell>₹{p.amount}</TableCell>
                    <TableCell>{p.paymentMode}</TableCell>

                    {/* <TableCell sx={{ color: "red" }}>
  ₹{p.balanceAfterPayment ?? "-"}
</TableCell> */}

                    <TableCell sx={{ color: "red" }}>
                      ₹{p.balanceAfterPayment ?? "-"}
                    </TableCell>

                    <TableCell>{p.note || "-"}</TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={() => downloadReceipt(p)}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No payment records yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={openPaymentModal}
        onClose={() => setOpenPaymentModal(false)}
      >
        {/* <DialogTitle>Record Payment</DialogTitle> */}
        <DialogTitle>
          Record Payment
          <Typography
            variant="body2"
            sx={{ color: "red", mt: 0.5, fontWeight: "bold" }}
          >
            Remaining Balance: ₹{totals?.totalBalance || 0}
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <TextField
            label="Amount"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />

          <Select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="Card">Card</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
          </Select>

          <TextField
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenPaymentModal(false)}>Cancel</Button>
          <Button
  variant="contained"
  onClick={recordPayment}
  disabled={Number(totals?.totalBalance) <= 0}
>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerLedger;
