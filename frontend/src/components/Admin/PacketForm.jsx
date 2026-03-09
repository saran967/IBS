import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { useLanguage } from "../../context/LanguageContext";

const initialFormState = {
  productId: "",
  shopId: "",
  packSize: 0,
  packCount: 0,
  totalWeight: 0,
  unit_en: "",
  unit_ta: "",
  gst: 16,
  profitPercentage: 16,
  pricePerPack: 0,
  inventoryId: "",
  batchNo: "",
  packedDate: new Date().toISOString().split("T")[0],
  useByDate: "",
};

const ProductPackForm = ({ open, onClose, refreshList, pack }) => {
  const { lang } = useLanguage();
  const [formData, setFormData] = useState(initialFormState);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await customFetch.get(`/product?lang=${lang}`);
      setProducts(res.data.products || []);
    } catch (err) {
      toast.error("Failed to load products");
    }
  };

  // Fetch shops and normalize name as {en, ta}
  const fetchShops = async () => {
    try {
      const res = await customFetch.get("/shops");
      const normalizedShops = res.data.map((shop) => ({
        _id: shop._id,
        name:
          typeof shop.name === "string"
            ? { en: shop.name, ta: shop.name }
            : shop.name,
      }));
      setShops(normalizedShops);
    } catch (err) {
      toast.error("Failed to load shops");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchShops();
  }, [lang]);

  // Fetch Batches when Product or Shop changes
  useEffect(() => {
    const fetchBatches = async () => {
      if (!formData.productId || !formData.shopId) {
        setBatches([]);
        return;
      }
      setLoadingBatches(true);
      try {
        const res = await customFetch.get(
          `/inventory/batches?productId=${formData.productId}&shopId=${formData.shopId}`
        );
        setBatches(res.data.batches || []);
        // Reset inventoryId if previous selection is not in new batches
        setFormData(prev => ({ ...prev, inventoryId: "" }));
      } catch (err) {
        console.error("Failed to fetch batches", err);
        setBatches([]);
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [formData.productId, formData.shopId]);

  // Load pack for editing
  useEffect(() => {
    if (pack) {
      setFormData({
        productId: pack.productId?._id || "",
        shopId: pack.shopId?._id || "",
        packSize: pack.packSize || 0,
        packCount: pack.packCount || 0,
        totalWeight: pack.totalWeight || 0,
        unit_en: pack.unit?.en || "",
        unit_ta: pack.unit?.ta || "",
        gst: pack.gst || 16,
        profitPercentage: pack.profitPercentage || 16,
        pricePerPack: pack.pricePerPack || 0,
        inventoryId: "",
        batchNo: pack.batchNo || "",
        packedDate: pack.packedDate ? new Date(pack.packedDate).toISOString().split("T")[0] : "",
        useByDate: pack.useByDate ? new Date(pack.useByDate).toISOString().split("T")[0] : "",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [pack, open]);

  // Auto-calculate totalWeight
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      totalWeight: prev.packSize * prev.packCount,
    }));
  }, [formData.packSize, formData.packCount]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "packSize" || name === "packCount" || name === "pricePerPack"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        productId: formData.productId,
        shopId: formData.shopId,
        packSize: formData.packSize,
        packCount: formData.packCount,
        totalWeight: formData.totalWeight,
        unit: { en: formData.unit_en, ta: formData.unit_ta },
        gst: formData.gst,
        profitPercentage: formData.profitPercentage,
        pricePerPack: formData.pricePerPack,
        inventoryId: formData.inventoryId || undefined,
        batchNo: formData.batchNo,
        packedDate: formData.packedDate,
        useByDate: formData.useByDate,
      };

      if (pack) {
        await customFetch.patch(`/product-packs/${pack._id}`, payload);
        toast.success("Product pack updated successfully");
      } else {
        await customFetch.post("/product-packs", payload);
        toast.success("Product pack added successfully");
      }

      refreshList();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving product pack");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {pack ? "Edit Product Pack" : "Add Product Pack"}
      </DialogTitle>
      <DialogContent>
        {/* Product select */}
        <TextField
          select
          label="Product"
          name="productId"
          value={formData.productId}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          <MenuItem value="">-- Select Product --</MenuItem>
          {products.map(({ _id, name }) => (
            <MenuItem key={_id} value={_id}>
              {lang === "both"
                ? `${name.en} / ${name.ta}`
                : name[lang] || name.en}
            </MenuItem>
          ))}
        </TextField>

        {/* Shop select */}
        <TextField
          select
          label="Shop"
          name="shopId"
          value={formData.shopId}
          onChange={handleChange}
          fullWidth
          margin="normal"
        >
          <MenuItem value="">-- Select Shop --</MenuItem>
          {shops.map(({ _id, name }) => (
            <MenuItem key={_id} value={_id}>
              {lang === "both"
                ? `${name.en} / ${name.ta}`
                : name[lang] || name.en}
            </MenuItem>
          ))}
        </TextField>

        {/* Batch Select (Only for Add) */}
        {!pack && (
          <TextField
            select
            label="Source Batch (Optional - Auto/FIFO if empty)"
            name="inventoryId"
            value={formData.inventoryId}
            onChange={handleChange}
            fullWidth
            margin="normal"
            disabled={loadingBatches || !formData.productId || !formData.shopId}
          >
            <MenuItem value="">Auto / FIFO</MenuItem>
            {batches.map((b) => (
              <MenuItem key={b._id} value={b._id}>
                Batch: {b.batchNo || "N/A"} (Stock: {b.remainingWeight} {formData.unit_en})
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* New Pack Details */}
        <TextField
          label="Produced Batch No"
          name="batchNo"
          value={formData.batchNo}
          onChange={handleChange}
          fullWidth
          margin="normal"
          placeholder="Leave empty for auto-generation"
        />

        <Box display="flex" gap={2}>
          <TextField
            label="Packed Date"
            name="packedDate"
            type="date"
            value={formData.packedDate}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Use By Date"
            name="useByDate"
            type="date"
            value={formData.useByDate}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {/* Pack size, count, total weight */}
        <TextField
          label="Pack Size"
          name="packSize"
          value={formData.packSize}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="number"
        />
        <TextField
          label="Pack Count"
          name="packCount"
          value={formData.packCount}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="number"
        />
        <TextField
          label="Total Weight"
          name="totalWeight"
          value={formData.totalWeight}
          fullWidth
          margin="normal"
          type="number"
          InputProps={{ readOnly: true }}
        />

        {/* Unit */}
        <TextField
          label="Unit (EN)"
          name="unit_en"
          value={formData.unit_en}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Unit (TA)"
          name="unit_ta"
          value={formData.unit_ta}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />

        {/* Price, GST, Profit */}
        <TextField
          label="Price Per Pack"
          name="pricePerPack"
          value={formData.pricePerPack}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="number"
        />
        <TextField
          label="GST %"
          name="gst"
          value={formData.gst}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="number"
        />
        <TextField
          label="Profit %"
          name="profitPercentage"
          value={formData.profitPercentage}
          onChange={handleChange}
          fullWidth
          margin="normal"
          type="number"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {pack ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductPackForm;
