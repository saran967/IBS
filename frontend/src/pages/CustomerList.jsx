import React, { useEffect, useState } from "react";
import {
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Card,
  CardContent,
  TableContainer,
  TablePagination,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Button,
} from "@mui/material";
import {
  Edit,
  Delete,
  ExpandMore,
  Search,
  AccountBalanceWallet,
  Person,
  Close,
  LocationOn,
  Phone,
  Email,
  Payments,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import {
  deleteCustomer,
  getCustomers,
  getCustomerById,
  getCustomerLedger,
} from "../api/adminApi";
import CustomerForm from "../components/Admin/CustomerForm";
import PaymentForm from "../components/Admin/PaymentForm";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const CustomerList = () => {
  const lang = useLanguage(); //  SAME AS SHOP & VENDOR
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

 const [editingCustomer, setEditingCustomer] = useState(null);
const [paymentCustomer, setPaymentCustomer] = useState(null);
const [viewCustomer, setViewCustomer] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 🔤 SAME helper used in ShopList
  const getLocalizedText = (value, l = "en") => {
    if (!value) return "-";
    if (typeof value === "object") {
      if (l === "both") return `${value.en || "-"} / ${value.ta || "-"}`;
      return value[l] || value.en || value.ta || "-";
    }
    return value;
  };

  // ================= FETCH =================
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await getCustomers(filterType, lang);
      setCustomers(res.data.customers || []);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line
  }, [filterType, lang]);

  // ================= SEARCH =================
  const filteredCustomers = customers.filter((c) =>
    getLocalizedText(c.customerName, lang)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // ================= HANDLERS =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete customer?")) return;
    try {
      await deleteCustomer(id);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleView = async (customer) => {
    try {
      const res = await getCustomerById(customer._id, lang);
      setViewCustomer(res.data.customer);
setViewDialogOpen(true);
    } catch {
      toast.error("Failed to load customer");
    }
  };

  const handleEdit = async (customer) => {
    try {
      const res = await getCustomerById(customer._id, lang);
      setEditingCustomer(res.data.customer);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Failed to load customer");
    }
  };

  const emptyRows =
    page > 0
      ? Math.max(0, (1 + page) * rowsPerPage - filteredCustomers.length)
      : 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" fontWeight="bold" textAlign="center" mb={3}>
        Customer Management ({lang.toUpperCase()})
      </Typography>

      {/* ========== FORM ========== */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
         <CustomerForm
  existingCustomer={editingCustomer}
  onSuccess={() => {
    setEditingCustomer(null);
    fetchCustomers();
  }}
/>
        </CardContent>
      </Card>

      {/* ========== FILTER ========== */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />

           <TextField
  select
  label="Sale Type"
  value={filterType}
  onChange={(e) => setFilterType(e.target.value)}
  size="small"
  sx={{ width: 150 }}
>
  <MenuItem value="">All</MenuItem>
  <MenuItem value="B2C">B2C</MenuItem>
  <MenuItem value="B2B">B2B</MenuItem>
</TextField>
          </Box>
        </CardContent>
      </Card>

      {/* ========== TABLE ========== */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box textAlign="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>View</TableCell>
                      <TableCell>Customer ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Credit Limit</TableCell>
    <TableCell>Opening Balance</TableCell>
    <TableCell>Due Days</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(rowsPerPage > 0
                      ? filteredCustomers.slice(
                          page * rowsPerPage,
                          page * rowsPerPage + rowsPerPage,
                        )
                      : filteredCustomers
                    ).map((c) => (
                      <TableRow hover key={c._id}>
                        <TableCell>
                          <IconButton onClick={() => handleView(c)}>
                            <ExpandMore />
                          </IconButton>
                        </TableCell>
<TableCell>{c.customerCode}</TableCell>
                        <TableCell>
                          {getLocalizedText(c.customerName, lang)}
                        </TableCell>

                        <TableCell>{c.customerType}</TableCell>
                          <TableCell>
    ₹ {c.creditLimit?.toLocaleString() || 0}
  </TableCell>

  <TableCell>
    ₹ {c.openingBalance?.toLocaleString() || 0}
  </TableCell>

  <TableCell>
    {c.dueDays || 0} Days
  </TableCell>
                        <TableCell>{c.mobileNumber || "-"}</TableCell>
                        <TableCell>{c.email || "-"}</TableCell>

                        <TableCell align="center">
                          <Tooltip title="Ledger">
                            <IconButton
                              onClick={() =>
                                navigate(
                                  `/${lang}/admin/customer/${c._id}/ledger`,
                                )
                              }
                            >
                              <AccountBalanceWallet />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Receive Payment">
                            <IconButton
                              color="success"
                              onClick={async () => {
                                const res = await getCustomerLedger(c._id);
                                const balance =
                                  res.data?.totals?.totalBalance || 0;

                                if (balance <= 0) {
                                  toast.info("No due amount");
                                  return;
                                }

                                setPaymentCustomer({
  ...c,
  remainingBalance: balance,
});
setPaymentDialogOpen(true);
                              }}
                            >
                              <Payments />
                            </IconButton>
                          </Tooltip>

                          <IconButton
                            color="info"
                            onClick={() => handleEdit(c)}
                          >
                            <Edit />
                          </IconButton>

                          <IconButton
                            color="error"
                            onClick={() => handleDelete(c._id)}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {emptyRows > 0 && (
                      <TableRow style={{ height: 53 * emptyRows }}>
                        <TableCell colSpan={10} />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

            <TablePagination
  component="div"
  rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
  count={filteredCustomers.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={(e, p) => setPage(p)}
  onRowsPerPageChange={(e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }}
/>

            </>
          )}
        </CardContent>
      </Card>

      {/* ========== PAYMENT ========== */}
      {paymentCustomer && (
  <PaymentForm
    open={paymentDialogOpen}
    handleClose={() => setPaymentDialogOpen(false)}
    customer={paymentCustomer}
    onSuccess={fetchCustomers}
  />
)}

      {/* ========== VIEW ========== */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between">
            <Typography fontWeight="bold">Customer Details</Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {viewCustomer && (
            <>
              <Typography fontWeight="bold">
                <Person sx={{ mr: 1 }} />
                {getLocalizedText(viewCustomer.customerName, lang)}
              </Typography>

              <Typography>
                <Phone sx={{ mr: 1 }} />
                {viewCustomer.mobileNumber || "-"}
              </Typography>

              <Typography>
                <Email sx={{ mr: 1 }} />
                {viewCustomer.email || "-"}
              </Typography>

              <Typography>
                <LocationOn sx={{ mr: 1 }} />
                {getLocalizedText(viewCustomer.address, lang)}
              </Typography>
              <Box mt={2}>
  <Typography>
    💳 Credit Limit: ₹ {viewCustomer.creditLimit?.toLocaleString() || 0}
  </Typography>

  <Typography>
    📅 Due Days: {viewCustomer.dueDays || 0} Days
  </Typography>

  <Typography>
    💰 Opening Balance: ₹ {viewCustomer.openingBalance?.toLocaleString() || 0}
  </Typography>
</Box>

              {/* ================= B2B COMPANY DETAILS ================= */}
              {viewCustomer.customerType === "B2B" &&
  Array.isArray(viewCustomer.companies) &&
  viewCustomer.companies.length > 0 && (
                  <Box mt={3}>
                    <Typography fontWeight="bold" mb={1}>
                      Company Details
                    </Typography>

                    {viewCustomer.companies.map((company, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                          p: 1.5,
                          mb: 1.5,
                        }}
                      >
                        <Typography fontWeight="bold">
                          {company.companyName || "—"}
                        </Typography>

                        <Typography variant="body2">
                          📍 {company.companyLocation || "—"}
                        </Typography>

                        <Typography variant="body2">
                          📞 {company.companyPhoneNumber || "—"}
                        </Typography>

                        <Typography variant="body2">
                          ✉️ {company.companyEmail || "—"}
                        </Typography>

                        <Typography variant="body2">
                          🧾 GST: {company.gstNumber || "—"}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerList;
