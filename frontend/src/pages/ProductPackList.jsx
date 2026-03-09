import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  Typography,
  Paper,
  Box,
  TextField,
  TableContainer,
  Tooltip,
  Chip,
} from "@mui/material";
import { Edit, Delete, Print, Search, History } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useLanguage } from "../context/LanguageContext";
import customFetch from "../utils/customFetch";
import ProductPackForm from "../components/Admin/PacketForm";

const ProductPackList = () => {
  const lang = useLanguage();

  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getLocalizedText = (value) => {
    if (!value) return "-";
    if (typeof value === "object") {
      if (lang === "both") return `${value.en || "-"} / ${value.ta || "-"}`;
      return value[lang] || value.en || value.ta || "-";
    }
    return value;
  };

  const fetchPacks = async () => {
    setLoading(true);
    try {
      const res = await customFetch.get(`/product-packs?lang=${lang}`);
      setPacks(res.data.packs || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch product packs");
      setPacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, [lang]);

  const filteredPacks = useMemo(() => {
    if (!searchTerm) return packs;
    const lowerSearch = searchTerm.toLowerCase();
    return packs.filter((p) => {
      const name = getLocalizedText(p.productId?.name).toLowerCase();
      const shop = getLocalizedText(p.shopId?.name).toLowerCase();
      const batch = (p.batchNo || "").toLowerCase();
      return name.includes(lowerSearch) || shop.includes(lowerSearch) || batch.includes(lowerSearch);
    });
  }, [packs, searchTerm, lang]);

  const handleEdit = (pack) => {
    setSelectedPack(pack);
    setOpenForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pack?")) return;
    try {
      await customFetch.delete(`/product-packs/${id}`);
      toast.success("Product pack deleted successfully");
      fetchPacks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete pack");
    }
  };

  const handlePrintLabel = (pack) => {
    const win = window.open("", "_blank");
    const productName = getLocalizedText(pack.productId?.name);
    const unit = getLocalizedText(pack.unit);
    const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-GB") : "-";

    win.document.write(`
      <html>
        <head>
          <style>
            @page { size: 48mm auto; margin: 2mm; }
            body { 
              width: 48mm; margin: 0; padding: 0; 
              font-family: 'Arial', sans-serif; text-align: center;
              font-size: 10px;
            }
            .label-card { border-bottom: 1px dashed #ccc; padding: 5px 0; margin-bottom: 5px; }
            .title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .price { font-size: 12px; font-weight: bold; color: #d32f2f; margin: 2px 0; }
            .details { margin-top: 2px; text-align: left; padding: 0 5px; }
            .batch { background: #eee; padding: 2px; font-size: 9px; margin-top: 3px; }
            .footer { font-size: 8px; margin-top: 5px; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="title">${productName}</div>
            <div class="price">MRP: ₹${pack.pricePerPack}</div>
            <div class="details">
              <div>Weight: ${pack.packSize} ${unit}</div>
              <div>Packed: ${formatDate(pack.packedDate)}</div>
              ${pack.useByDate ? `<div>Use By: ${formatDate(pack.useByDate)}</div>` : ""}
            </div>
            <div class="batch">Batch: ${pack.batchNo || "N/A"}</div>
            <div class="footer">ISMATH PROJECT PRODUCTS</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold", color: "primary.main" }}>
        <History sx={{ verticalAlign: "bottom", mr: 1 }} />
        Production History
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Search by Product, Shop or Batch..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ color: "gray", mr: 1 }} /> }}
          sx={{ flexGrow: 1, minWidth: "300px" }}
        />
        <Button
          variant="contained"
          onClick={() => setOpenForm(true)}
          startIcon={<Edit />}
          sx={{ px: 4, height: "40px" }}
        >
          New Production
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading production logs...</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Date</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Product</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Batch No</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Shop</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Pack Size</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Weight</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5" }}>Price</TableCell>
                <TableCell sx={{ fontWeight: "bold", bgcolor: "#f5f5f5", textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    No matching production records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPacks.map((pack) => (
                  <TableRow key={pack._id} hover>
                    <TableCell>{new Date(pack.createdAt).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{getLocalizedText(pack.productId?.name)}</TableCell>
                    <TableCell>
                      <Chip label={pack.batchNo || "N/A"} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{getLocalizedText(pack.shopId?.name)}</TableCell>
                    <TableCell>{pack.packSize} {getLocalizedText(pack.unit)}</TableCell>
                    <TableCell sx={{ color: "primary.main", fontWeight: "bold" }}>{pack.packCount}</TableCell>
                    <TableCell>{pack.totalWeight} {getLocalizedText(pack.unit)}</TableCell>
                    <TableCell>₹{pack.pricePerPack}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Print Label">
                        <IconButton onClick={() => handlePrintLabel(pack)} color="success" size="small">
                          <Print fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Record">
                        <IconButton onClick={() => handleEdit(pack)} color="primary" size="small">
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(pack._id)} color="error" size="small">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {openForm && (
        <ProductPackForm
          open={openForm}
          onClose={() => { setSelectedPack(null); setOpenForm(false); }}
          refreshList={fetchPacks}
          pack={selectedPack}
        />
      )}
    </Box>
  );
};

export default ProductPackList;
