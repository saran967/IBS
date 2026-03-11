import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Switch,
  IconButton,
  Box,
  Tooltip,
  Checkbox,
  TextField,
  Button,
  MenuItem,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  Autocomplete,
  Card,
  CardContent,
} from "@mui/material";

import { Delete, Edit, History, Print } from "@mui/icons-material";
import JsBarcode from "jsbarcode";
import SKUModal from "./SkuModel";
import customFetch from "../../utils/customFetch.js";
import React, { useRef, useEffect, useState, useMemo } from "react";

// --------------------------------------------------
// BARCODE COMPONENT
// --------------------------------------------------
const BarcodeRenderer = ({ code, id }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!code || !ref.current) return;

    ref.current.innerHTML = "";
    JsBarcode(ref.current, code, {
      format: "CODE128",
      width: 2.2,
      height: 35,
      displayValue: true,
      fontSize: 10,
      margin: 2,
    });
  }, [code, id]);

  return <svg ref={ref} />;
};

// --------------------------------------------------
// MAIN PRODUCT TABLE
// --------------------------------------------------
const ProductTable = ({
  lang,
  products,
  onToggleDelivery,
  onToggleInventory,
  onEdit,
  onDelete,
  onPriceHistory,
  getField,
  page: externalPage,
  totalPages: externalTotalPages,
  onPageChange,
  pageSize,
  onEditComplete,
  categories,
  selectedCategory,
  setSelectedCategory,
  toggleCategory,
}) => {
  const PAGE_LIMIT = pageSize || 10;
  const [selected, setSelected] = useState({});
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // SKU Modal
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);

  const [lastEditedProductId, setLastEditedProductId] = useState(null);

  const openDetails = (product) => {
    setDetailsProduct(product);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsProduct(null);
  };

  const openSKUModal = (product) => {
    setLastEditedProductId(product._id);
    setSelectedProduct(product);
    setSkuModalOpen(true);
  };

  const stop = (e) => e.stopPropagation();

  const toggleSelect = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ----------------------------------------
  // FILTER PRODUCTS
  // --------------------------------------------------

  const selectedCategoryEn = (selectedCategory?.en || "").trim();

  const baseProducts = isSearching ? searchResults : products;
  const filteredProducts = baseProducts.filter((p) => {
    const text = searchText.toLowerCase();

    const matchesSearch =
      getField(p.name).toLowerCase().includes(text) ||
      (p.productCode || "").toLowerCase().includes(text);

    const matchesCategory =
      !selectedCategoryEn ||
      String(p.category?.en || "")
        .trim()
        .toLowerCase() === selectedCategoryEn.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // newest first

  const sortByNewest = (list) =>
    [...list].sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) -
        new Date(a.createdAt || a.updatedAt || 0),
    );

  const sortedProducts = useMemo(
    () => sortByNewest(filteredProducts),
    [filteredProducts],
  );

  const searchProductsAPI = async (text, categoryEn) => {
    if (!text && !categoryEn) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    const params = new URLSearchParams();

    if (text) {
      params.append("q", text.trim());
    }

    if (categoryEn) {
      params.append("category", categoryEn);
    }

    console.log("Search Params:", params.toString());

    const res = await customFetch.get(
      `/product/searchByCategory?${params.toString()}`,
    );

    setSearchResults(res.data.products || []);
  };

  const usingExternalPagination = Boolean(onPageChange) && !isSearching;

  const currentPage = usingExternalPagination ? externalPage || 1 : page;
  const totalPages =
    usingExternalPagination && externalTotalPages
      ? externalTotalPages
      : Math.max(1, Math.ceil(sortedProducts.length / PAGE_LIMIT));

  const currentPageData = useMemo(() => {
    if (usingExternalPagination) return sortedProducts;
    const start = (currentPage - 1) * PAGE_LIMIT;
    return sortedProducts.slice(start, start + PAGE_LIMIT);
  }, [sortedProducts, usingExternalPagination, currentPage]);

  useEffect(() => {
    searchProductsAPI(searchText, selectedCategoryEn);
  }, [searchText, selectedCategoryEn]);

  // --------------------------------------------------
  // SELECT ALL
  // --------------------------------------------------
  const allSelected =
    currentPageData.length > 0 && currentPageData.every((p) => selected[p._id]);

  const someSelected =
    currentPageData.some((p) => selected[p._id]) && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      const newState = { ...selected };
      currentPageData.forEach((p) => delete newState[p._id]);
      setSelected(newState);
    } else {
      const newState = { ...selected };
      currentPageData.forEach((p) => (newState[p._id] = true));
      setSelected(newState);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB");
  };

  const cellSx = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  // --------------------------------------------------
  // PRINT SINGLE
  // --------------------------------------------------
  const handlePrint = (p) => {
    const svg = document.getElementById(`barcode-${p._id}`)?.outerHTML;

    const win = window.open("", "_blank");

    win.document.write(`
      <html>
      <head>
       <style>
  @page { size: 48mm auto; margin: 2mm; }

  body {
    width: 48mm;
    margin: 0;
    padding: 0;
    font-family: Arial;
    text-align: center;
  }

  .label {
    width: 100%;
  }

  .name {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 2px;
  }

  .barcode svg {
    width: 100%;
    height: 48px;
  }

  .code {
    font-size: 10px;
    margin: 2px 0;
  }

  .row {
    font-size: 10px;
    text-align: center;
    padding-left: 2px;
    margin-top: 5px;
  }

  .divider {
    border-top: 1px dashed #000;
    margin: 4px 0;
  }

  .fssai {
    font-size: 10px;
    text-align: center;
  }
</style>

      </head>
    <body>
  <div class="label">
    <div class="name">${getField(p.name)}</div>

    <div class="barcode">
      ${svg || ""}
    </div>

    <div class="row">Packed date : ${formatDate(p.packedDate)}</div>
    <div class="row">Use by date : ${formatDate(p.useByDate)}</div>
    <div class="row">MRP : ${Array.isArray(p.mrp) && p.mrp.length > 0 ? p.mrp.map(m => '₹'+m).join(', ') : '₹'+(p.mrp || 0)}</div>

    ${p.fssaiNumber
        ? `
      <div class="divider"></div>
      <div class="fssai">FSSAI No : ${p.fssaiNumber}</div>
    `
        : ""
      }
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>


      </html>
    `);

    win.document.close();
  };

  // --------------------------------------------------
  // PRINT ALL SELECTED
  // --------------------------------------------------
  const handlePrintAll = () => {
    const items = products.filter((p) => selected[p._id]);

    if (items.length === 0) {
      alert("Select at least one product to print!");
      return;
    }

    const win = window.open("", "_blank");

    win.document.write(`
    <html>
    <head>
      <style>
        @page { size: 48mm auto; margin: 2mm; }

        body {
          width: 48mm;
          margin: 0;
          padding: 0;
          font-family: Arial;
          text-align: center;
        }

        .label {
          width: 100%;
          page-break-inside: avoid;
          margin-bottom: 6px;
        }

        .name {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
        }

        .barcode svg {
          width: 100%;
          height: 48px;
        }

        .row {
          font-size: 10px;
          margin-top: 2px;
        }

        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }

        .fssai {
          font-size: 10px;
        }
      </style>
    </head>
    <body>
  `);

    items.forEach((p) => {
      const svg = document.getElementById(`barcode-${p._id}`)?.outerHTML || "";

      win.document.write(`
      <div class="label">
        <div class="name">${getField(p.name)}</div>

        <div class="barcode">
          ${svg}
        </div>

        <div class="row">Packed date : ${formatDate(p.packedDate)}</div>
        <div class="row">Use by date : ${formatDate(p.useByDate)}</div>
        <div class="row">MRP : ${Array.isArray(p.mrp) && p.mrp.length > 0 ? p.mrp.map(m => '₹'+m).join(', ') : '₹'+(p.mrp || 0)}</div>

        ${p.fssaiNumber
          ? `
          <div class="divider"></div>
          <div class="fssai">FSSAI No : ${p.fssaiNumber}</div>
        `
          : ""
        }
      </div>
    `);
    });

    // --------------------------------------------------
    // PRICE HISTORY FOR SELECTED PRODUCTS
    // --------------------------------------------------
    // --------------------------------------------------
    // PRICE HISTORY FOR SELECTED PRODUCTS
    // --------------------------------------------------

    win.document.write(`
      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `);

    win.document.close();
  };

  // --------------------------------------------------
  // PRICE HISTORY FOR SELECTED PRODUCTS (CORRECT PLACE)
  // --------------------------------------------------
  const handlePriceHistorySelected = async () => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);

    if (selectedIds.length === 0) {
      alert("Select at least one product to download price history!");
      return;
    }

    try {
      const res = await customFetch.post("/product/price-history/selected", {
        productIds: selectedIds,
      });

      if (!res.data?.history || res.data.history.length === 0) {
        alert("No price history found for selected products");
        return;
      }

      import("../../pages/exportAllHistoryPDF.js").then(
        ({ default: exportAllHistoryPDF }) => {
          exportAllHistoryPDF(res.data.history);
        },
      );
    } catch (err) {
      console.error(err);
      alert("Failed to download price history");
    }
  };

  // --------------------------------------------------
  // HEADERS
  // --------------------------------------------------
  const finalHeaders = {
    name: lang === "ta" ? "பெயர்" : "Name",
    category: lang === "ta" ? "வகை" : "Category",
    unit: lang === "ta" ? "அளவு" : "Unit",
    weight: lang === "ta" ? "எடை" : "Weight",
    purchase: lang === "ta" ? "கொள்முதல் விலை" : "Purchase",
    wPrice: lang === "ta" ? "மொத்த விற்பனை" : "W Price",
    rPrice: lang === "ta" ? "சில்லறை விற்பனை" : "Retail (B2C)",
    swPrice: lang === "ta" ? "அரை மொத்த விற்பனை" : "SW Price",
    minStock: lang === "ta" ? "குறைந்த அளவு" : "Min Stock",
    code: lang === "ta" ? "குறியீடு" : "Code",
    barcode: lang === "ta" ? "பார்க்கோடு" : "Barcode",
    sku: "SKU",
    details: lang === "ta" ? "விவரம்" : "Details",
    inventory: lang === "ta" ? "இருப்பு" : "Inventory",
    delivery: lang === "ta" ? "டெலிவரி" : "Delivery",
    action: lang === "ta" ? "செயல்" : "Action",
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <Box sx={{ width: "100%", p: 1 }}>
      {/* FILTER BAR */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
          mb: 2,
        }}
        className="no-print"
      >
        <Autocomplete
          options={categories}
          getOptionLabel={(o) => o?.en || ""}
          isOptionEqualToValue={(option, value) =>
            (option?.en || "") === (value?.en || "") &&
            (option?.ta || "") === (value?.ta || "")
          }
          value={selectedCategory}
          onChange={(e, val) => setSelectedCategory(val)}
          renderInput={(params) => (
            <TextField {...params} label="Category" size="small" />
          )}
          sx={{ width: { xs: "100%", sm: 220 } }}
        />

        <TextField
          size="small"
          label="Search by Name / Code"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ width: { xs: "100%", sm: 250 } }}
        />

        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<Print />}
            onClick={handlePrintAll}
            disabled={!someSelected && !allSelected}
          >
            Print Labels
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<History />}
            onClick={handlePriceHistorySelected}
            disabled={!someSelected && !allSelected}
          >
            Price History
          </Button>
        </Box>
      </Box>

      {/* TABLE */}
      <Box sx={{ width: "100%" }}>
        <TableContainer
          component={Paper}
          elevation={0}
          className="glass-effect"
          sx={{
            borderRadius: 2,
            overflowX: "auto",
            maxHeight: "70vh"
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ background: "#f8f9fa" }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                    size="small"
                  />
                </TableCell>
                {Object.values(finalHeaders).map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: "bold",
                      background: "#f8f9fa",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={100} align="center">
                    {lang === "ta" ? "பொருட்கள் இல்லை" : "No products found"}
                  </TableCell>
                </TableRow>
              ) : (
                currentPageData.map((p) => (
                  <TableRow
                    id={`product-row-${p._id}`}
                    key={p._id}
                    hover
                    className={p._id === lastEditedProductId ? "row-highlight" : ""}
                    onClick={() => toggleSelect(p._id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell onClick={stop} padding="checkbox">
                      <Checkbox
                        checked={selected[p._id] || false}
                        onChange={() => toggleSelect(p._id)}
                        size="small"
                      />
                    </TableCell>

                    <TableCell sx={cellSx}>
                      {getField(p.name)}
                      {p.freeItems?.length > 0 && (
                        <Tooltip title="Has Free Items">
                          <span style={{ marginLeft: 8, cursor: "help" }}>🎁</span>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={cellSx}>{getField(p.category)}</TableCell>
                    <TableCell>{getField(p.unit)}</TableCell>
                    <TableCell>
                      {p.weight != null
                        ? p.baseUnitType === "G" || p.baseUnitType === "ML"
                          ? (p.weight / 1000).toFixed(3)
                          : p.weight
                        : "-"}
                    </TableCell>

                    <TableCell>₹{p.purchasePrice?.toFixed(2) ?? "0.00"}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>
                      ₹{p.sellingPriceforB2B?.toFixed(2) ?? "0.00"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "secondary.main" }}>
                      ₹{p.sellingPrice?.toFixed(2) ?? "0.00"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "success.main" }}>
                      ₹{p.sellingPriceforAgent?.toFixed(2) ?? "0.00"}
                    </TableCell>

                    <TableCell>{p.minStockLevel || 0}</TableCell>
                    <TableCell>{p.productCode}</TableCell>

                    <TableCell onClick={stop}>
                      {p.productCode ? (
                        <div id={`barcode-${p._id}`} title="Click to Print" onClick={() => handlePrint(p)}>
                          <BarcodeRenderer code={p.productCode} id={p._id} />
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        color={p.allowRetail ? "primary" : "inherit"}
                        disabled={!p.allowRetail}
                        onClick={(e) => { stop(e); openSKUModal(p); }}
                        sx={{ fontSize: "0.75rem", py: 0 }}
                      >
                        {p.allowRetail ? "Manage" : "Off"}
                      </Button>
                    </TableCell>

                    <TableCell>
                      <IconButton size="small" onClick={(e) => { stop(e); openDetails(p); }}>
                        <Typography variant="caption" color="primary">View</Typography>
                      </IconButton>
                    </TableCell>

                    <TableCell align="center" onClick={stop}>
                      <Switch
                        checked={p.maintainInventory !== false}
                        onChange={() => onToggleInventory?.(p._id, p.maintainInventory !== false)}
                        size="small"
                        color="primary"
                      />
                    </TableCell>

                    <TableCell align="center" onClick={stop}>
                      <Switch
                        checked={p.enableDelivery ?? true}
                        onChange={() => onToggleDelivery(p._id, p.enableDelivery)}
                        size="small"
                        color="success"
                      />
                    </TableCell>

                    <TableCell
                      onClick={stop}
                      sx={{
                        width: 120,
                        position: "sticky",
                        right: 0,
                        background: "inherit",
                        zIndex: 2,
                        display: "flex",
                        gap: 0.5
                      }}
                    >
                      <IconButton size="small" onClick={() => onEdit(p)} color="primary">
                        <Edit fontSize="small" />
                      </IconButton>

                      <IconButton size="small" onClick={() => onPriceHistory(p._id)} color="secondary">
                        <History fontSize="small" />
                      </IconButton>

                      <IconButton size="small" onClick={() => handlePrint(p)} color="success">
                        <Print fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      {skuModalOpen && (
        <SKUModal
          open={skuModalOpen}
          onClose={() => {
            setSkuModalOpen(false);

            if (lastEditedProductId) {
              onEditComplete?.(lastEditedProductId);
            }
          }}
          product={selectedProduct}
        />
      )}

      <Dialog open={detailsOpen} onClose={closeDetails} maxWidth="xs" fullWidth>
        <DialogTitle>
          {lang === "ta" ? "பொருள் விவரம்" : "Product Details"}
        </DialogTitle>

        <DialogContent dividers>
          {detailsProduct && (
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography>
                <b>Profit %:</b> {detailsProduct.profitPercentage ?? 0}%
              </Typography>

              <Typography>
                <b>CGST %:</b> {detailsProduct.cgstPercentage ?? 0}%
              </Typography>

              <Typography>
                <b>SGST %:</b> {detailsProduct.sgstPercentage ?? 0}%
              </Typography>

              <Typography>
                <b>HSN Code:</b> {detailsProduct.hsnCode || "—"}
              </Typography>

              <Typography>
                <b>Wholesale (W):</b> ₹{detailsProduct.sellingPriceforB2B || 0}
              </Typography>
              <Typography>
                <b>Retail / B2C (R):</b> ₹{detailsProduct.sellingPrice || 0}
              </Typography>
              <Typography>
                <b>Semi-Wholesale (SW):</b> ₹{detailsProduct.sellingPriceforAgent || 0}
              </Typography>
              <Typography>
                <b>Min Stock Level:</b> {detailsProduct.minStockLevel || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(e, value) =>
            usingExternalPagination ? onPageChange?.(value) : setPage(value)
          }
          color="primary"
        />
      </Box>
    </Box>
  );
};

export default ProductTable;
