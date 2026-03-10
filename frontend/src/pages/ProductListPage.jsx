import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  TextField,
  Autocomplete,
  Switch,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

import ProductForm from "../components/Admin/ProductionForm";
import ProductTable from "../components/Admin/ProductTable";

import { useProducts } from "../hooks/useProducts";
import { useCategories } from "../hooks/useCategories";
import customFetch from "../utils/customFetch";
import { toast } from "react-toastify";

export default function ProductList() {
  const lang = useLanguage();
  const navigate = useNavigate();

  const {
    products,
    setProducts,
    loading,
    page,
    totalPages,
    limit,
    fetchProducts,
    setPage,
    toggleProductDelivery,
    toggleProductInventory,
    deleteProduct,
    editProduct,
    setEditProduct,
  } = useProducts();

  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    toggleCategory,
    makeCategoryKey,
  } = useCategories();

  // ================================================
  // BULK UPLOAD MODAL STATE
  // ================================================
  const [openUpload, setOpenUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleBulkUpload = async () => {
    if (!file) return toast.error("Please choose a file");

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await customFetch.post("/product/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        `Uploaded: ${res.data.successCount}, Failed: ${res.data.failedCount}`,
      );

      if (res.data.failedCount > 0) {
        console.log("Failed Rows:", res.data.failed);
      }

      setOpenUpload(false);
      setFile(null);
      fetchProducts(); // Refresh UI
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload error");
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!selectedCategory) return true;
    return makeCategoryKey(p.category) === selectedCategory.key;
  });

  const handlePageChange = (val) => {
    setPage(val);
    fetchProducts(val);
  };
  const handleEditComplete = (productId) => {
    // 1️⃣ Reload SAME PAGE (no reset)
    fetchProducts(page);

    // 2️⃣ Scroll + highlight edited product
    setTimeout(() => {
      const row = document.getElementById(`product-row-${productId}`);

      if (row) {
        row.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // 🔥 HIGHLIGHT EFFECT
        row.style.background = "#e8f5e9";

        setTimeout(() => {
          row.style.background = "";
        }, 2000);
      }
    }, 300);
  };

  const getField = (x) => (lang === "ta" ? x?.ta || x?.en : x?.en);

  return (
    <Paper sx={{ m: 2, p: 3, borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
      {/* HEADER WITH BULK UPLOAD BUTTON */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 4,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" fontWeight={700} color="primary">
            Product Management
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            onClick={() => setOpenUpload(true)}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Bulk Upload
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={5}>
          <CircularProgress />
        </Box>
      )}

      <Box sx={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>

        {/* CATEGORY selector */}

        <ProductForm
          refreshList={fetchProducts}
          editProduct={editProduct}
          clearEdit={() => setEditProduct(null)}
        />

        <ProductTable
          lang={lang}
          products={filteredProducts}
          onToggleDelivery={toggleProductDelivery}
          onToggleInventory={toggleProductInventory}
          onEdit={setEditProduct}
          onDelete={deleteProduct}
          onPriceHistory={(id) =>
            navigate(`/en/admin/product/${id}/price-history`)
          }
          getField={getField}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={limit}
          /* 👇 CATEGORY PROPS */
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          toggleCategory={toggleCategory}
          onEditComplete={handleEditComplete}
        />

        {/* ================================
          BULK UPLOAD MODAL
      ================================== */}
        <Dialog open={openUpload} onClose={() => setOpenUpload(false)}>
          <DialogTitle>Bulk Upload Products (XLS/XLSX)</DialogTitle>

          <DialogContent sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />

            <Typography variant="body2" sx={{ mt: 2 }}>
              Allowed Columns:
              <br />
              name_en*, name_ta, category_en, category_ta, unit_en, unit_ta,
              productCode*, weight, purchasePrice, profitPercentage, sellingPrice,
              cgstPercentage, sgstPercentage, hsnCode, fssaiNumber, packedDate,
              useByDate, mrp, allowRetail
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpenUpload(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={uploading}
              onClick={handleBulkUpload}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Paper>
  );
}
