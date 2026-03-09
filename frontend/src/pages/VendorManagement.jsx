import React, { useEffect, useState, useRef } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Box,
  CircularProgress,
  Modal,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Edit, Delete, Visibility, Payment } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../utils/customFetch";
import { useLanguage } from "../context/LanguageContext";
import { useParams, useNavigate } from "react-router-dom";

const VendorManagement = () => {
  const lang = useLanguage();
  const navigate = useNavigate();
  const { lang: urlLang } = useParams();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination + search
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(1);

  // Form (add/edit)
  const [editingVendor, setEditingVendor] = useState(null);
  const [form, setForm] = useState({
    name_en: "",
    name_ta: "",
    address_en: "",
    address_ta: "",
    email: "",
    mobile: "",
    companyName: "",
    gstNumber: "",
    status: "Active",
    creditLimit: 100000,
  openingBalance: 0,
  dueDays: 15,
  });
  const inputRefs = useRef([]);

  // Repayment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [remainingBalance, setRemainingBalance] = useState(0);
  const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Localize text function
  const getLocalizedText = (value) => {
    if (!value) return "-";
    if (typeof value === "object") {
      if (lang === "both") return `${value.en || "-"} / ${value.ta || "-"}`;
      return value[lang] || value.en || value.ta || "-";
    }
    return value;
  };

  const fetchVendors = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await customFetch.get(
        `/vendors?page=${pageNum}&limit=${limit}&q=${query}&lang=${lang}`,
      );
      setVendors(res.data.vendors || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.currentPage || 1);
    } catch (err) {
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const next = inputRefs.current[index + 1];
      if (next) {
        next.focus();
      } else {
        handleSubmit(); // last field → submit form
      }
    }
  };

  useEffect(() => {
    fetchVendors(1);
    // eslint-disable-next-line
  }, [lang, query]);

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({
      name_en: "",
      name_ta: "",
      address_en: "",
      address_ta: "",
      email: "",
      mobile: "",
      companyName: "",
      gstNumber: "",
      status: "Active",
      creditLimit: 100000,
    openingBalance: 0,
     dueDays: 15,
    });
    setEditingVendor(null);
  };

  const handleSubmit = async () => {
    const payload = {
      name: { en: form.name_en, ta: form.name_ta },
      address: { en: form.address_en, ta: form.address_ta },
      email: form.email,
      mobile: form.mobile,
      companyName: form.companyName,
      gstNumber: form.gstNumber,
      status: form.status,
       creditLimit: Number(form.creditLimit || 100000),
  openingBalance: Number(form.openingBalance || 0),
    dueDays: Number(form.dueDays || 15), 
    };

    try {
      if (editingVendor) {
        await customFetch.put(`/vendors/${editingVendor}`, payload);
        toast.success("Vendor updated");
      } else {
        await customFetch.post(`/vendors`, payload);
        toast.success("Vendor added");
      }
      resetForm();
      fetchVendors(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    }
  };

  const handleEdit = async (vendor) => {
    try {
      const res = await customFetch.get(`/vendors/${vendor._id}?lang=both`);
      const v = res.data;

      setEditingVendor(v._id);
     setForm({
  name_en: v.name?.en || "",
  name_ta: v.name?.ta || "",
  address_en: v.address?.en || "",
  address_ta: v.address?.ta || "",
  email: v.email || "",
  mobile: v.mobile || "",
  companyName: v.companyName || "",
  gstNumber: v.gstNumber || "",
  status: v.status || "Active",
  creditLimit: v.creditLimit || 100000,
  openingBalance: v.openingBalance || 0,
  dueDays: v.dueDays || 15,
});

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Failed to load vendor");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete vendor?")) return;
    try {
      await customFetch.delete(`/vendors/${id}`);
      toast.success("Vendor deleted");
      fetchVendors(page);
    } catch {
      toast.error("Delete failed");
    }
  };

  const submitPayment = async () => {
    const paying = Number(amount || 0);
    const balance = Number(remainingBalance || 0);

    if (!amount) return toast.warn("Amount required");

    if (paying > balance) {
      toast.error(`Amount exceeds remaining balance (Max: ₹${balance})`);
      return;
    }

    try {
    await customFetch.post(`/vendorsLedger/vendor-payments`, {
  vendorId: selectedVendorId,
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

// 🔥 Refresh vendor table immediately
fetchVendors(page);
    } catch {
      toast.error("Failed to add payment");
    }
  };

const thStyle = {
  padding: "12px 10px",
  fontWeight: 600,
  fontSize: "14px",
  textAlign: "left",
};

const tdStyle = {
  padding: "12px 10px",
  fontSize: "14px",
  verticalAlign: "middle",
};
  return (
    <div className="p-4">
      {/* ====== FORM ====== */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>
          {editingVendor ? "Edit Vendor" : "Add Vendor"}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Name (EN)"
              name="name_en"
              value={form.name_en}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[0] = el)}
              onKeyDown={(e) => handleKeyDown(e, 0)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Name (TA)"
              name="name_ta"
              value={form.name_ta}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[1] = el)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Company"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[2] = el)}
              onKeyDown={(e) => handleKeyDown(e, 2)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Address (EN)"
              name="address_en"
              value={form.address_en}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[3] = el)}
              onKeyDown={(e) => handleKeyDown(e, 3)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Address (TA)"
              name="address_ta"
              value={form.address_ta}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[4] = el)}
              onKeyDown={(e) => handleKeyDown(e, 4)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={form.email}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[5] = el)}
              onKeyDown={(e) => handleKeyDown(e, 5)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Mobile"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[6] = el)}
              onKeyDown={(e) => handleKeyDown(e, 6)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="GST"
              name="gstNumber"
              value={form.gstNumber}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[7] = el)}
              onKeyDown={(e) => handleKeyDown(e, 7)}
            />
          </Grid>
<Grid item xs={12} sm={6} md={4}>
  <TextField
    fullWidth
    type="number"
    label="Credit Limit"
    name="creditLimit"
    value={form.creditLimit}
    onChange={handleChange}
  />
</Grid>

<Grid item xs={12} sm={6} md={4}>
  <TextField
    fullWidth
    type="number"
    label="Opening Balance"
    name="openingBalance"
    value={form.openingBalance}
    onChange={handleChange}
  />
</Grid>

<Grid item xs={12} sm={6} md={4}>
  <TextField
    fullWidth
    type="number"
    label="Due Days"
    name="dueDays"
    value={form.dueDays}
    onChange={handleChange}
  />
</Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              select
              name="status"
              label="Status"
              value={form.status}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[8] = el)}
              onKeyDown={(e) => handleKeyDown(e, 8)}
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Box mt={2} display="flex" gap={2}>
          <Button variant="contained" onClick={handleSubmit}>
            {editingVendor ? "Update" : "Add Vendor"}
          </Button>

          {editingVendor && (
            <Button variant="outlined" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </Box>
      </Paper>

      {/* ====== LIST ====== */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Vendors</Typography>

          <Box display="flex" gap={1}>
            <TextField
              size="small"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button variant="outlined" onClick={() => fetchVendors(1)}>
              Search
            </Button>
          </Box>
        </Box>

        {/* Table */}
<Box
  sx={{
    width: "100%",
    overflowX: isMobile ? "auto" : "visible",
  }}
>
  <table
    style={{
      width: isMobile ? "900px" : "100%",
      borderCollapse: "collapse",
      minWidth: isMobile ? "900px" : "auto",
    }}
  >
    <thead>
      <tr
        style={{
          background: "#0ea5e9",
          color: "#fff",
        }}
      >
        <th style={thStyle}>#</th>
        <th style={thStyle}>Vendor ID</th>
        <th style={thStyle}>Name</th>
        <th style={thStyle}>Company</th>
        <th style={thStyle}>Mobile</th>
        <th style={{ ...thStyle, textAlign: "right" }}>Credit</th>
        <th style={{ ...thStyle, textAlign: "right" }}>Opening</th>
        
        <th style={thStyle}>GST</th>
        <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
      </tr>
    </thead>

    <tbody>
      {vendors.map((v, i) => {
        const name = getLocalizedText(v.localizedName);

        return (
          <tr key={v._id} style={{ borderBottom: "1px solid #eee" }}>
            <td style={tdStyle}>
              {(page - 1) * limit + i + 1}
            </td>
            <td style={tdStyle}>{v.vendorCode}</td>
            <td style={tdStyle}>{name}</td>
            <td style={tdStyle}>{v.companyName}</td>
            <td style={tdStyle}>{v.mobile}</td>
            <td style={{ ...tdStyle, textAlign: "right" }}>
              ₹{v.creditLimit}
            </td>
            <td style={{ ...tdStyle, textAlign: "right" }}>
              ₹{v.openingBalance}
            </td>
            <td style={tdStyle}>{v.gstNumber}</td>

            <td style={{ ...tdStyle, textAlign: "center" }}>
              <Box display="flex" justifyContent="center" gap={1}>
                <IconButton
                  size="small"
                  onClick={() =>
                    navigate(
                      `/${urlLang}/admin/vendors-ledger?vendor=${v._id}`
                    )
                  }
                >
                  <Visibility />
                </IconButton>

<IconButton
  size="small"
  onClick={async () => {
    try {
      const res = await customFetch.get(
        `/vendoranalytics/vendor-payments?vendorId=${v._id}`
      );

     const ledger = res?.data?.ledger || [];

// If no ledger but vendor has opening balance
if (ledger.length === 0) {

  const opening = Number(v.openingBalance || 0);

  if (opening <= 0) {
    toast.info("No outstanding balance.");
    return;
  }

  // allow payment for opening balance
  setSelectedVendorId(v._id);
  setRemainingBalance(opening);
  setPaymentModalOpen(true);
  return;
}

      // Get latest balance
let purchaseTotal = 0;

ledger.forEach((row) => {
  if (row.type === "PURCHASE") {
    purchaseTotal += Number(row.debit || 0);
  }
});

const opening = Number(v.openingBalance || 0);

const balance = purchaseTotal + opening;

      // If nothing to repay
      if (balance <= 0) {
        toast.info(`No outstanding payable (Remaining: ₹${balance})`);
        return;
      }

      // Open repayment modal
      setSelectedVendorId(v._id);
      setRemainingBalance(balance);
      setPaymentModalOpen(true);

    } catch {
      toast.error("Failed to check vendor ledger");
    }
  }}
>
  <Payment />
</IconButton>

                <IconButton
                  size="small"
                  onClick={() => handleEdit(v)}
                >
                  <Edit />
                </IconButton>

                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(v._id)}
                >
                  <Delete />
                </IconButton>
              </Box>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</Box>
      </Paper>

      {/* PAYMENT MODAL */}
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
          {/* <Typography variant="h6">Vendor Repayment</Typography> */}
          <Typography variant="h6">Vendor Repayment</Typography>

          <Typography sx={{ color: "red", fontWeight: "bold", mt: 1 }}>
            Remaining Balance: ₹{remainingBalance}
          </Typography>

          <TextField
            fullWidth
            sx={{ mt: 2 }}
            label="Amount"
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
    </div>
  );
};

export default VendorManagement;
