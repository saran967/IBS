import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Grid,
  MenuItem,
  Autocomplete,
  Typography,
  Divider,
  Paper,
} from "@mui/material";
import { toast } from "react-toastify";
import JsBarcode from "jsbarcode";
import customFetch from "../../utils/customFetch";

const ProductForm = ({ refreshList, editProduct, clearEdit }) => {
  const [formData, setFormData] = useState({
    name_en: "",
    name_ta: "",
    category_en: "",
    category_ta: "",
    unit_en: "",
    unit_ta: "",
    productCode: "",
    weight: "",
    purchasePrice: "",
    profitPercentage: "",
    sellingPrice: "",
    cgstPercentage: "",
    sgstPercentage: "",
    hsnCode: "",
    allowRetail: false,
    baseUnitType: "G",
    fssaiNumber: "",
    packedDate: "",
    useByDate: "",
    sellingPriceforB2B: "",
    sellingPriceforAgent: "",
    minStockLevel: "",
    mrp: [""],
    maintainInventory: true,
  });

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const svgRef = useRef(null);

  useEffect(() => {
    if (editProduct) {
      setFormData({
        name_en: editProduct.name?.en || "",
        name_ta: editProduct.name?.ta || "",
        category_en: editProduct.category?.en || "",
        category_ta: editProduct.category?.ta || "",
        unit_en: editProduct.unit?.en || "",
        unit_ta: editProduct.unit?.ta || "",
        productCode: editProduct.productCode || "",
        weight: editProduct.baseUnitType === "G" || editProduct.baseUnitType === "ML"
          ? (editProduct.weight / 1000)
          : editProduct.weight,
        purchasePrice: editProduct.purchasePrice || "",
        profitPercentage: editProduct.profitPercentage || "",
        sellingPrice: editProduct.sellingPrice || "",
        cgstPercentage: editProduct.cgstPercentage || "",
        sgstPercentage: editProduct.sgstPercentage || "",
        allowRetail: editProduct.allowRetail ?? false,
        hsnCode: editProduct.hsnCode || "",
        baseUnitType: editProduct.baseUnitType || "G",
        fssaiNumber: editProduct.fssaiNumber || "",
        packedDate: editProduct.packedDate ? editProduct.packedDate.split("T")[0] : "",
        useByDate: editProduct.useByDate ? editProduct.useByDate.split("T")[0] : "",
        mrp: Array.isArray(editProduct.mrp) && editProduct.mrp.length > 0 ? editProduct.mrp : (editProduct.mrp ? [editProduct.mrp] : [""]),
        sellingPriceforB2B: editProduct.sellingPriceforB2B || "",
        sellingPriceforAgent: editProduct.sellingPriceforAgent || "",
        minStockLevel: editProduct.minStockLevel || "",
        maintainInventory: editProduct.maintainInventory ?? true,
      });
    } else {
      setFormData({
        name_en: "", name_ta: "", category_en: "", category_ta: "",
        unit_en: "", unit_ta: "", productCode: "", weight: "",
        purchasePrice: "", profitPercentage: "", sellingPrice: "",
        cgstPercentage: "", sgstPercentage: "", hsnCode: "",
        allowRetail: false, baseUnitType: "G", fssaiNumber: "",
        packedDate: "", useByDate: "", mrp: [""],
        sellingPriceforB2B: "", sellingPriceforAgent: "", minStockLevel: "",
        maintainInventory: true,
      });
    }
  }, [editProduct]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [catRes, unitRes] = await Promise.all([
          customFetch.get("/product/categories"),
          customFetch.get("/product/units"),
        ]);
        setCategories(catRes.data.categories || []);
        setUnits(unitRes.data.units || []);
      } catch (err) {
        console.error("Dropdown fetch error", err);
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numberFields = [
      "weight", "purchasePrice", "profitPercentage", "sellingPrice",
      "cgstPercentage", "sgstPercentage", "fssaiNumber",
      "sellingPriceforB2B", "sellingPriceforAgent", "minStockLevel"
    ];

    if (numberFields.includes(name)) {
      if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    }

    setFormData((prev) => {
      let updated = { ...prev, [name]: value };
      const purchase = parseFloat(updated.purchasePrice || 0);

      if (name === "profitPercentage") {
        const profit = parseFloat(value || 0);
        if (purchase > 0) {
          updated.sellingPrice = (purchase + (purchase * profit) / 100).toFixed(2);
        }
      }

      if (name === "sellingPrice") {
        const selling = parseFloat(value || 0);
        if (purchase > 0) {
          updated.profitPercentage = (((selling - purchase) / purchase) * 100).toFixed(2);
        }
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name_en.trim()) return toast.error("English name required");
      if (!formData.productCode.trim()) return toast.error("Product code required");

      let weight = parseFloat(formData.weight || 0);
      if (formData.baseUnitType === "G" || formData.baseUnitType === "ML") {
        weight = weight * 1000;
      }

      const payload = {
        name: { en: formData.name_en, ta: formData.name_ta },
        category: { en: formData.category_en, ta: formData.category_ta },
        unit: { en: formData.unit_en, ta: formData.unit_ta },
        productCode: formData.productCode,
        weight: weight,
        purchasePrice: Number(formData.purchasePrice || 0),
        profitPercentage: Number(formData.profitPercentage || 0),
        sellingPrice: Number(formData.sellingPrice || 0),
        cgstPercentage: Number(formData.cgstPercentage || 0),
        sgstPercentage: Number(formData.sgstPercentage || 0),
        hsnCode: formData.hsnCode,
        allowRetail: formData.allowRetail,
        baseUnitType: formData.baseUnitType,
        fssaiNumber: formData.fssaiNumber,
        packedDate: formData.packedDate,
        useByDate: formData.useByDate,
        mrp: formData.mrp.map(m => Number(m)).filter(m => m > 0),
        sellingPriceforB2B: Number(formData.sellingPriceforB2B || 0),
        sellingPriceforB2C: Number(formData.sellingPrice || 0),
        sellingPriceforAgent: Number(formData.sellingPriceforAgent || 0),
        minStockLevel: Number(formData.minStockLevel || 0),
        maintainInventory: formData.maintainInventory,
      };

      if (editProduct) {
        await customFetch.patch(`/product/${editProduct._id}`, payload);
        toast.success("Product updated successfully");
        clearEdit();
      } else {
        await customFetch.post("/product", payload);
        toast.success("Product added successfully");
      }

      refreshList();
      if (!editProduct) {
        setFormData({
          name_en: "", name_ta: "", category_en: "", category_ta: "",
          unit_en: "", unit_ta: "", productCode: "", weight: "",
          purchasePrice: "", profitPercentage: "", sellingPrice: "",
          cgstPercentage: "", sgstPercentage: "", hsnCode: "",
          allowRetail: false, baseUnitType: "G", fssaiNumber: "",
          packedDate: "", useByDate: "", mrp: [""],
          sellingPriceforB2B: "",
          sellingPriceforAgent: "", minStockLevel: "",
          maintainInventory: true,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving product");
    }
  };

  useEffect(() => {
    if (formData.productCode && svgRef.current) {
      svgRef.current.innerHTML = "";
      try {
        JsBarcode(svgRef.current, formData.productCode, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
        });
      } catch (e) {
        console.error("Barcode generation error", e);
      }
    }
  }, [formData.productCode]);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        p: 3,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        background: "#ffffff",
        transition: "all 0.3s",
        "&:hover": { boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" fontWeight={700} sx={{ color: "primary.main" }}>
          {editProduct ? "📦 Edit Product Details" : "📦 Add New Product"}
        </Typography>
        {editProduct && (
          <Button variant="outlined" color="error" size="small" onClick={clearEdit} sx={{ borderRadius: 2 }}>
            Cancel Edit
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
            GENERAL INFORMATION
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Name (EN) *" name="name_en" value={formData.name_en} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Name (TA)" name="name_ta" value={formData.name_ta} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            freeSolo size="small"
            options={categories.map(c => c.en)}
            value={formData.category_en}
            onChange={(e, v) => setFormData(prev => ({ ...prev, category_en: v || "" }))}
            onInputChange={(e, v) => setFormData(prev => ({ ...prev, category_en: v || "" }))}
            renderInput={(params) => <TextField {...params} label="Category (EN)" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            freeSolo size="small"
            options={categories.map(c => c.ta)}
            value={formData.category_ta}
            onChange={(e, v) => setFormData(prev => ({ ...prev, category_ta: v || "" }))}
            onInputChange={(e, v) => setFormData(prev => ({ ...prev, category_ta: v || "" }))}
            renderInput={(params) => <TextField {...params} label="Category (TA)" />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            freeSolo size="small"
            options={units.map(u => u.en)}
            value={formData.unit_en}
            onChange={(e, v) => setFormData(prev => ({ ...prev, unit_en: v || "" }))}
            onInputChange={(e, v) => setFormData(prev => ({ ...prev, unit_en: v || "" }))}
            renderInput={(params) => <TextField {...params} label="Unit (EN)" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            freeSolo size="small"
            options={units.map(u => u.ta)}
            value={formData.unit_ta}
            onChange={(e, v) => setFormData(prev => ({ ...prev, unit_ta: v || "" }))}
            onInputChange={(e, v) => setFormData(prev => ({ ...prev, unit_ta: v || "" }))}
            renderInput={(params) => <TextField {...params} label="Unit (TA)" />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth select size="small" label="Base Unit" name="baseUnitType" value={formData.baseUnitType} onChange={handleChange}>
            <MenuItem value="G">Grams (G)</MenuItem>
            <MenuItem value="ML">Milliliters (ML)</MenuItem>
            <MenuItem value="PCS">Pieces (PCS)</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Weight/Qty" name="weight" value={formData.weight} onChange={handleChange} />
        </Grid>

        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
            PRICING & TAXATION
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Purchase Price" name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} InputProps={{ startAdornment: "₹" }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Profit %" name="profitPercentage" value={formData.profitPercentage} onChange={handleChange} InputProps={{ endAdornment: "%" }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Selling Price (Retail / B2C)" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} InputProps={{ startAdornment: "₹" }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box display="flex" flexDirection="column" gap={1}>
            {formData.mrp.map((mrpValue, index) => (
              <Box key={index} display="flex" alignItems="center" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  label={formData.mrp.length > 1 ? `MRP ${index + 1}` : "MRP"}
                  value={mrpValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                    const newMrp = [...formData.mrp];
                    newMrp[index] = val;
                    setFormData(prev => ({ ...prev, mrp: newMrp }));
                  }}
                  InputProps={{ startAdornment: "₹" }}
                />
                {index === formData.mrp.length - 1 ? (
                  <Button variant="outlined" sx={{ minWidth: "40px", p: "6px" }} onClick={() => setFormData(prev => ({ ...prev, mrp: [...prev.mrp, ""] }))}>+</Button>
                ) : (
                  <Button variant="outlined" color="error" sx={{ minWidth: "40px", p: "6px" }} onClick={() => {
                    const newMrp = formData.mrp.filter((_, i) => i !== index);
                    setFormData(prev => ({ ...prev, mrp: newMrp }));
                  }}>-</Button>
                )}
              </Box>
            ))}
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Wholesale (B2B)" name="sellingPriceforB2B" value={formData.sellingPriceforB2B} onChange={handleChange} InputProps={{ startAdornment: "₹" }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Semi-Wholesale (Agent)" name="sellingPriceforAgent" value={formData.sellingPriceforAgent} onChange={handleChange} InputProps={{ startAdornment: "₹" }} />
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField fullWidth size="small" label="CGST %" name="cgstPercentage" value={formData.cgstPercentage} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField fullWidth size="small" label="SGST %" name="sgstPercentage" value={formData.sgstPercentage} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField fullWidth size="small" label="HSN Code" name="hsnCode" value={formData.hsnCode} onChange={handleChange} />
        </Grid>

        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} gutterBottom>
            MANUFACTURING & INVENTORY
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Product Code *" name="productCode" value={formData.productCode} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Min Stock Alert" name="minStockLevel" value={formData.minStockLevel} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="FSSAI Number" name="fssaiNumber" value={formData.fssaiNumber} onChange={handleChange} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Packed Date" name="packedDate" type="date" value={formData.packedDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth size="small" label="Use By Date" name="useByDate" type="date" value={formData.useByDate} onChange={handleChange} InputLabelProps={{ shrink: true }} />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2, display: "inline-block", mr: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={formData.allowRetail} onChange={e => setFormData(prev => ({ ...prev, allowRetail: e.target.checked }))} />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>Enable Retail Variants (SKU)</Typography>
                  <Typography variant="caption" color="text.secondary">Allows multi-pack sizes</Typography>
                </Box>
              }
            />
          </Box>
          <Box sx={{ p: 2, bgcolor: "info.light", borderRadius: 2, display: "inline-block", color: "info.contrastText" }}>
            <FormControlLabel
              control={<Checkbox checked={formData.maintainInventory} onChange={e => setFormData(prev => ({ ...prev, maintainInventory: e.target.checked }))} color="default" />}
              label={
                <Box>
                  <Typography variant="body1" fontWeight={600}>Maintain Inventory</Typography>
                  <Typography variant="caption" color="inherit">Track product stock level</Typography>
                </Box>
              }
            />
          </Box>
        </Grid>

        <Grid item xs={12} sx={{ pt: 3, display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleSubmit} size="large" sx={{ borderRadius: 3, px: 6, fontWeight: 600 }}>
            {editProduct ? "Update Product" : "Save Product"}
          </Button>
          {editProduct && (
            <Button variant="outlined" color="warning" onClick={clearEdit} size="large" sx={{ borderRadius: 3, px: 4 }}>
              Discard Changes
            </Button>
          )}
        </Grid>
      </Grid>

      {formData.productCode && (
        <Box sx={{ mt: 4, pt: 3, borderTop: "1px dashed #ddd", textAlign: "center" }}>
          <svg ref={svgRef} />
        </Box>
      )}
    </Paper>
  );
};

export default ProductForm;
