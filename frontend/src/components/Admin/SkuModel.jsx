import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  IconButton,
  MenuItem,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";
import JsBarcode from "jsbarcode";

/**
 *  RULES:
 * - DB expects baseQty always in base unit type: G / ML / PCS
 * - UI should allow user to type in KG/LTR (converted internally to G/ML)
 */

export default function SKUModal({ open, onClose, product }) {
  const [skuList, setSkuList] = useState([]);

  const baseUnitType = String(product?.baseUnitType || "G").toUpperCase(); // G / ML / PCS

  //  UI base label (what user sees)
  const uiBaseLabel = useMemo(() => {
    if (baseUnitType === "G") return "KG";
    if (baseUnitType === "ML") return "LTR";
    return "PCS";
  }, [baseUnitType]);

  //  Convert UI qty → Base qty (for backend)
  const uiToBaseQty = (uiQty) => {
    const n = Number(uiQty || 0);
    if (baseUnitType === "G") return Math.round(n * 1000); // KG → G
    if (baseUnitType === "ML") return Math.round(n * 1000); // LTR → ML
    return n; // PCS stays
  };

  //  Convert Base qty → UI qty (for table display)
  const baseToUiQty = (baseQty) => {
    const n = Number(baseQty || 0);
    if (baseUnitType === "G") return (n / 1000).toFixed(2); // G → KG
    if (baseUnitType === "ML") return (n / 1000).toFixed(2); // ML → LTR
    return n.toFixed(0);
  };

  //  default sell units list
  const UNIT_OPTIONS = [
    "BOX",
    "PACKET",
    "BAG",
    "BOTTLE",
    "TIN",
    "CAN",
    "JAR",
    "PIECE",
    "PCS",
    "CUSTOM",
  ];

  const [form, setForm] = useState({
    sellUnit: "",
    customUnit: "",
    sellQty: 1,
    uiBaseQty: "",
    retailPrice: "",
    wholesalePrice: "",
    agentPrice: "",
  });

  // Fetch SKUs for selected product
  const fetchSKUs = async () => {
    try {
      const res = await customFetch.get(`/retail-skus/product/${product._id}`);
      setSkuList(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load SKUs");
    }
  };

  useEffect(() => {
    if (open && product?._id) fetchSKUs();
  }, [open, product?._id]);

  // Input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  //  Build final sell unit
  const finalSellUnit = useMemo(() => {
    if (form.sellUnit === "CUSTOM") {
      return (form.customUnit || "").trim().toUpperCase();
    }
    return (form.sellUnit || "").trim().toUpperCase();
  }, [form.sellUnit, form.customUnit]);

  // Create SKU
  const handleCreateSKU = async () => {
    if (!product?._id) return toast.error("Product not selected");

    if (!finalSellUnit) return toast.error("Sell Unit is required");
    if (!form.sellQty || Number(form.sellQty) <= 0)
      return toast.error("Sell Qty must be greater than 0");
    if (!form.uiBaseQty || Number(form.uiBaseQty) <= 0)
      return toast.error(`Base Qty (${uiBaseLabel}) must be greater than 0`);

    const baseQtyForBackend = uiToBaseQty(form.uiBaseQty);

    try {
      await customFetch.post("/retail-skus", {
        productId: product._id,
        sellUnit: finalSellUnit, // BOX / PACKET / PIECE / custom
        sellQty: Number(form.sellQty || 1),
        baseQty: Number(baseQtyForBackend), //  always in G/ML/PCS
        retailPrice: Number(form.retailPrice || 0),
        wholesalePrice: Number(form.wholesalePrice || 0),
        agentPrice: Number(form.agentPrice || 0),
      });

      toast.success("SKU added");
      fetchSKUs();

      setForm({
        sellUnit: "",
        customUnit: "",
        sellQty: 1,
        uiBaseQty: "",
        retailPrice: "",
        wholesalePrice: "",
        agentPrice: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding SKU");
    }
  };

  // Delete SKU
  const deleteSKU = async (id) => {
    try {
      await customFetch.delete(`/retail-skus/${id}`);
      toast.success("SKU removed");
      fetchSKUs();
    } catch (err) {
      toast.error("Failed to delete SKU");
    }
  };

  // Print Barcode Label (Custom Quantities)
  const handlePrintSku = (sku) => {
    const copies = parseInt(window.prompt("How many labels do you want to print for this SKU?", "1"), 10);
    if (!copies || isNaN(copies) || copies <= 0) return;

    if (!product?.productCode) {
      toast.error("Product code missing");
      return;
    }

    const canvas = document.createElement("canvas");
    JsBarcode(canvas, product.productCode, {
      format: "CODE128",
      width: 2.2,
      height: 35,
      displayValue: true,
      fontSize: 10,
      margin: 2,
    });
    const svgDataUrl = canvas.toDataURL("image/png");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
      <head>
       <style>
          @page { size: 48mm auto; margin: 0; }
          body { width: 48mm; margin: 0; padding: 0; font-family: Arial; text-align: center; }
          .page-break { page-break-after: always; padding: 2mm; }
          .name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
          .barcode img { width: 100%; height: 48px; }
          .row { font-size: 10px; text-align: center; margin-top: 5px; }
        </style>
      </head>
      <body>
    `);

    for (let i = 0; i < copies; i++) {
      win.document.write(`
            <div class="page-break">
                <div class="name">${product?.name?.en || ""}</div>
                <div class="barcode" style="margin-top: 5px;"><img src="${svgDataUrl}" /></div>
                <div class="row">Packed: ${sku.sellQty} ${sku.sellUnit}</div>
                <div class="row">MRP: ₹${sku.retailPrice || 0}</div>
            </div>
        `);
    }

    win.document.write(`</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Manage Retail Units for: {product?.name?.en}
        <Typography variant="body2" sx={{ mt: 0.2 }}>
          HSN Code: <b>{product?.hsnCode || "-"}</b>
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
          Base Unit Type Stored: <b>{baseUnitType}</b>
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/*  SKU FORM */}
        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
          {/*  Sell Unit Dropdown */}
          <TextField
            select
            label="Sell Unit"
            name="sellUnit"
            value={form.sellUnit}
            onChange={handleChange}
            size="small"
            sx={{ minWidth: 220 }}
          >
            {UNIT_OPTIONS.map((u) => (
              <MenuItem key={u} value={u}>
                {u === "CUSTOM" ? "Custom..." : u}
              </MenuItem>
            ))}
          </TextField>

          {/*  Custom unit input */}
          {form.sellUnit === "CUSTOM" && (
            <TextField
              label="Custom Unit Name"
              name="customUnit"
              value={form.customUnit}
              onChange={handleChange}
              size="small"
              sx={{ minWidth: 220 }}
              placeholder="ex: TRAY / DOZEN / ROLL"
            />
          )}

          {/*  Sell Qty */}
          <TextField
            label="Sell Qty (count)"
            name="sellQty"
            type="number"
            value={form.sellQty}
            onChange={handleChange}
            size="small"
            sx={{ width: 160 }}
            helperText="How many units in 1 entry (Mostly 1)"
          />

          {/*  UI Base Qty */}
          <TextField
            label={`Base Qty (${uiBaseLabel})`}
            name="uiBaseQty"
            type="number"
            value={form.uiBaseQty}
            onChange={handleChange}
            size="small"
            sx={{ width: 200 }}
            helperText={
              baseUnitType === "G"
                ? "Example: 5 KG = 5000 G internally"
                : baseUnitType === "ML"
                  ? "Example: 12 LTR = 12000 ML internally"
                  : "Example: 1 PCS"
            }
          />

          <TextField
            label="Retail Price"
            name="retailPrice"
            type="number"
            value={form.retailPrice}
            onChange={handleChange}
            size="small"
            sx={{ width: 160 }}
          />

          <TextField
            label="Wholesale Price"
            name="wholesalePrice"
            type="number"
            value={form.wholesalePrice}
            onChange={handleChange}
            size="small"
            sx={{ width: 160 }}
          />

          <TextField
            label="Semi-Wholesale Price / Agent"
            name="agentPrice"
            type="number"
            value={form.agentPrice}
            onChange={handleChange}
            size="small"
            sx={{ width: 220 }}
          />
        </Box>

        <Button variant="contained" onClick={handleCreateSKU}>
          Add SKU
        </Button>

        {/*  SKU LIST */}
        <Typography variant="h6" mt={3}>
          Existing SKUs
        </Typography>

        <Table sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Sell Unit</TableCell>
              <TableCell>{`Base Qty (${uiBaseLabel})`}</TableCell>
              <TableCell>Retail</TableCell>
              <TableCell>Wholesale</TableCell>
              <TableCell>Agent</TableCell>
              <TableCell>HSN Code</TableCell>
              <TableCell>Barcode</TableCell>
              <TableCell>Sell Qty</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {skuList.map((sku) => (
              <TableRow key={sku._id}>
                <TableCell>{sku.sellUnit}</TableCell>

                {/*  show converted qty */}
                <TableCell>
                  {baseToUiQty(sku.baseQty)} {uiBaseLabel}
                </TableCell>

                <TableCell>{sku.retailPrice}</TableCell>
                <TableCell>{sku.wholesalePrice}</TableCell>
                <TableCell>{sku.agentPrice ?? 0}</TableCell>
                <TableCell>{product?.hsnCode || "-"}</TableCell>

                {/*  Same barcode for all SKUs */}
                <TableCell>{product?.barcode}</TableCell>
                <TableCell>{sku.sellQty}</TableCell>

                <TableCell>
                  <IconButton color="secondary" onClick={() => handlePrintSku(sku)} title="Print Custom Labels">
                    <Typography component="span" fontSize="14px">Print</Typography>
                  </IconButton>
                  <IconButton color="error" onClick={() => deleteSKU(sku._id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {skuList.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    No SKUs added yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
