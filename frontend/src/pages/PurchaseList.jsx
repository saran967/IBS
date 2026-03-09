import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  useTheme,
  useMediaQuery,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
} from "@mui/material";
import { Delete, Refresh, Search } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../utils/customFetch";
import PurchaseForm from "../components/Admin/purchase/PurchaseForm";
import { useLanguage } from "../context/LanguageContext";
import getLocalizedText from "../utils/getLocalizedText";
import JsBarcode from "jsbarcode";

const translations = {
  en: {
    purchaseManagement: "Purchase Management",
    allPurchases: "All Purchases",
    refresh: "Refresh",
    noPurchasesFound: "No purchases found",
    product: "Product",
    vendor: "Vendor",
    purchaseSummary: "Purchase Summary",

    unitPrice: "Unit Price (₹)",
    totalAmount: "Total Amount (₹)",
    shop: "Shop",
    packs: "packs",
    date: "Date",
    // actions: "Actions",
    delete: "Delete",
    deleteConfirmation: "Are you sure you want to delete this purchase?",
    purchaseDeleted: "Purchase deleted",
    deleteFailed: "Delete failed",
    errorDeletingPurchase: "Error deleting purchase",
    errorFetchingPurchases: "Error fetching purchases",
    searchPlaceholder: "Search by product code, name, or vendor...",
    splits: "Splits",
    type: "Type",
    name: "Name",
    viewSplits: "View Splits",
    printBarcode: "Print Barcode",
    actions: "Actions",
    close: "Close",
  },
  ta: {
    purchaseManagement: "கொள்முதல் மேலாண்மை",
    allPurchases: "அனைத்து கொள்முதல்கள்",
    refresh: "புதுப்பிக்கவும்",
    noPurchasesFound: "கொள்முதல்கள் எதுவும் கிடைக்கவில்லை",
    product: "தயார்ப்பு",
    vendor: "விற்பனையாளர்",
    purchaseSummary: "கொள்முதல் சுருக்கம்",
    unitPrice: "ஒற்றை விலை (₹)",
    totalAmount: "மொத்த தொகை (₹)",
    shop: "கடை",
    packs: "பேக்கேஜ்கள்",
    date: "தேதி",
    // actions: "செயல்கள்",
    delete: "நீக்கு",
    deleteConfirmation: "இந்த கொள்முதலை நீக்க விரும்புகிறீர்களா?",
    purchaseDeleted: "கொள்முதல் நீக்கப்பட்டது",
    deleteFailed: "நீக்குவதில் தோல்வி",
    errorDeletingPurchase: "கொள்முதலை நீக்குவதில் பிழை",
    errorFetchingPurchases: "கொள்முதல்களைப் பெறுவதில் பிழை",
    searchPlaceholder:
      "தயாரிப்பு குறியீடு, பெயர் அல்லது விற்பனையாளரால் தேடுங்கள்...",
    splits: "பங்குகள்",
    type: "வகை",
    name: "பெயர்",
    viewSplits: "பங்குகள் காண்க",
    printBarcode: "பார்கோடு அச்சிடு",
    actions: "செயல்கள்",
    close: "மூடு",
  },
};

export default function PurchaseList() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [page, setPage] = useState(1);
  const limit = 10;

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [batchQuery, setBatchQuery] = useState("");
  const language = useLanguage();

  // shops & godowns maps
  const [shops, setShops] = useState([]); // array of shops
  const [godownsByShop, setGodownsByShop] = useState({}); // shopId -> [godowns]
  const [shopIndexMap, setShopIndexMap] = useState({}); // shopId -> index
  const [godownMap, setGodownMap] = useState({}); // godownId -> { shopId, name, index }

  // Modal state for splits
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedSplits, setSelectedSplits] = useState([]);
  const [selectedProductLabel, setSelectedProductLabel] = useState("");

  const [selectedBaseUnitType, setSelectedBaseUnitType] = useState("G");
  const [selectedPurchaseMode, setSelectedPurchaseMode] = useState("SKU");

  const [transportModalOpen, setTransportModalOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [selectedPurchaseInfo, setSelectedPurchaseInfo] = useState({});

  const openTransportModal = (purchase) => {
    setSelectedTransport(purchase.transport || null);

    setSelectedPurchaseInfo({
      product: getLocalizedText(purchase.productId?.name, language),
      productCode: purchase.productId?.productCode || "",
      vendor: getLocalizedText(purchase.vendorId?.name, language) || "—",
    });

    setTransportModalOpen(true);
  };

  const t = (key) => {
    if (language === "both") {
      return `${translations.en[key]} (${translations.ta[key]})`;
    }
    return translations[language][key];
  };

  // fetch purchases
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data } = await customFetch.get("/purchase");
      const arr = data.purchases || [];
      arr.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
      setPurchases(arr);
    } catch (err) {
      console.error("fetchPurchases err", err);
      toast.error(t("errorFetchingPurchases"));
    } finally {
      setLoading(false);
    }
  };

  // fetch shops and godowns
  const fetchShopsAndGodowns = async () => {
    try {
      const shopRes = await customFetch.get("/shops");
      const fetchedShops = shopRes.data?.shops || shopRes.data || [];
      setShops(fetchedShops);

      const sMap = {};
      fetchedShops.forEach((s, i) => (sMap[s._id] = i));
      setShopIndexMap(sMap);

      const gByShop = {};
      const gMap = {};
      await Promise.all(
        fetchedShops.map(async (s) => {
          try {
            const res = await customFetch.get(`/godowns/shop/${s._id}`);
            const arr = res.data?.godowns || [];
            gByShop[s._id] = arr;
            arr.forEach((g, gi) => {
              gMap[g._id] = {
                shopId: s._id,
                name: g.name?.en || g.name,
                index: gi,
              };
            });
          } catch (err) {
            gByShop[s._id] = [];
          }
        }),
      );

      setGodownsByShop(gByShop);
      setGodownMap(gMap);
    } catch (err) {
      console.error("fetchShopsAndGodowns err", err);
    }
  };
  const getUiUnitLabel = (baseUnitType) => {
    const base = String(baseUnitType || "G").toUpperCase();
    if (base === "G") return "KG";
    if (base === "ML") return "LTR";
    return "PCS";
  };

  const toUiQty = (baseQty, baseUnitType) => {
    const qty = Number(baseQty || 0);
    const base = String(baseUnitType || "G").toUpperCase();

    if (base === "G") return qty / 1000; // G -> KG
    if (base === "ML") return qty / 1000; // ML -> LTR
    return qty; // PCS
  };
  const getSearchText = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val.toLowerCase();
    if (typeof val === "object")
      return `${val.en || ""} ${val.ta || ""}`.toLowerCase();
    return "";
  };

  useEffect(() => {
    fetchShopsAndGodowns();
    fetchPurchases();
  }, []);

  // filter purchases by search query + separate batch filter
  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase();
    const bq = batchQuery.toLowerCase();

    const matchesGeneralSearch =
      !q ||
      p.productId?.productCode?.toLowerCase().includes(q) ||
      p.productId?.name?.en?.toLowerCase().includes(q) ||
      p.productId?.name?.ta?.toLowerCase().includes(q) ||
      getSearchText(p.vendorId?.name).includes(q);

    const matchesBatchSearch =
      !bq || String(p.batchNo || "").toLowerCase().includes(bq);

    return matchesGeneralSearch && matchesBatchSearch;
  });

  const totalPages = Math.ceil(filteredPurchases.length / limit);

  const paginatedPurchases = filteredPurchases.slice(
    (page - 1) * limit,
    page * limit,
  );

  // delete purchase
  const handleDelete = async (id) => {
    if (!window.confirm(t("deleteConfirmation"))) return;
    try {
      const { data } = await customFetch.delete(`/purchase/${id}`);
      if (data.success) {
        toast.success(t("purchaseDeleted"));
        fetchPurchases();
      } else {
        toast.error(data.message || t("deleteFailed"));
      }
    } catch (err) {
      console.error("delete err", err);
      toast.error(err.response?.data?.message || t("errorDeletingPurchase"));
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, batchQuery]);

  // format split label using real names
  const handlePrintBarcode = (p) => {
    if (!p?.productId?.productCode) {
      toast.error("Product code missing");
      return;
    }
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, p.productId.productCode, {
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
          @page { size: 48mm auto; margin: 2mm; }
          body { width: 48mm; margin: 0; padding: 0; font-family: Arial; text-align: center; }
          .label { width: 100%; }
          .name { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
          .barcode img { width: 100%; height: 48px; }
          .row { font-size: 10px; text-align: center; padding-left: 2px; margin-top: 5px; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="name">${getLocalizedText(p.productId?.name, "en")}</div>
          <div class="barcode" style="margin-top: 5px;"><img src="${svgDataUrl}" /></div>
          <div class="row">Batch No: ${p.batchNo || "N/A"}</div>
          <div class="row">MRP: ₹${p.productId?.mrp || "N/A"}</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const formatSplitLabel = (split) => {
    if (!split) return "—";
    if (split.type === "shop") {
      const shop = shops.find(
        (s) => String(s._id || s.id) === String(split.id),
      );

      return getLocalizedText(shop?.name, language) || `Shop (${split.id})`;
    } else {
      const gd = godownMap[String(split.id)];
      if (gd) {
        const shop = shops.find(
          (s) => String(s._id || s.id) === String(gd.shopId),
        );
        const shopName =
          getLocalizedText(shop?.name, language) || `Shop (${gd.shopId})`;

        return `${gd.name} (${shopName})`;
      }

      const shopId = Object.keys(godownsByShop).find((sid) =>
        (godownsByShop[sid] || []).some((g) => g._id === split.id),
      );
      if (shopId) {
        const g = (godownsByShop[shopId] || []).find((x) => x._id === split.id);
        const shop = shops.find((s) => s._id === shopId);
        return `${g?.name?.en || g?.name} (${shop?.name?.en || shop?.name})`;
      }
      return `Godown (${split.id})`;
    }
  };

  // open splits modal helper
  const openSplitsModal = (splits, productId, purchaseMode, baseUnitType) => {
    setSelectedSplits(splits || []);
    setSelectedPurchaseMode(purchaseMode || "SKU");
    setSelectedBaseUnitType(baseUnitType || "G");

    const label = productId?.productCode
      ? `${productId.productCode} - ${getLocalizedText(productId?.name, language)}`
      : productId?.name?.en || "Splits";

    setSelectedProductLabel(label);
    setSplitModalOpen(true);
  };

  // render splits for mobile compact view (kept for inline view fallback)
  const renderSplitsMobileInline = (splits) => {
    if (!splits || splits.length === 0)
      return <Typography variant="body2">—</Typography>;

    return (
      <Box>
        {splits.map((s, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              py: 0.5,
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                {s.type === "shop" ? "Shop" : "Godown"}
              </Typography>
              <Typography variant="body2">{formatSplitLabel(s)}</Typography>
            </Box>

            <Typography variant="body2">{s.packs ?? 0}</Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // mobile card view
  const renderMobileCard = (p) => {
    const { productId, vendorId, splits = [] } = p;
    const productLabel = productId?.productCode
      ? `${productId.productCode} - `
      : "";
    const productName = productId?.name?.en || "—";

    return (
      <Card
        key={p._id}
        sx={{
          mb: 2,
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (e.target.closest(".no-row-click")) return; // Prevent split/delete click
          openTransportModal(p);
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {productLabel}
                {productName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {t("vendor")}:{" "}
                {getLocalizedText(vendorId?.name, language) || "—"}
              </Typography>
            </Box>
            <Chip
              label={`₹${Number(p.totalAmount || 0).toFixed(2)}`}
              size="small"
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                {t("unitPrice")}
              </Typography>
              <Typography variant="body2">
                ₹{Number(p.unitPrice || 0).toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                {t("purchaseSummary")}
              </Typography>

              {p.purchaseMode === "SKU" ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Packs: ${Number(p.totalPacks || 0)}`}
                />
              ) : (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Qty: ${toUiQty(p.baseQty, p.baseUnitType).toFixed(3)} ${getUiUnitLabel(p.baseUnitType)}`}
                />
              )}
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                {t("date")}
              </Typography>
              <Typography variant="body2">
                {new Date(p.purchaseDate).toLocaleDateString(
                  language === "ta" ? "ta-IN" : "en-IN",
                )}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              {t("splits")}
            </Typography>

            <Button
              className="no-row-click"
              variant="outlined"
              size="small"
              onClick={() =>
                openSplitsModal(
                  splits,
                  productId,
                  p.purchaseMode,
                  p.baseUnitType,
                )
              }
            >
              {t("viewSplits")}
            </Button>
          </Box>

          {/* optional inline small preview */}
          {/* {renderSplitsMobileInline(p.splits)} */}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box
      p={isMobile ? 1 : 2}
      sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}
    >
      <Typography
        variant={isMobile ? "h6" : "h5"}
        gutterBottom
        fontWeight={600}
        textAlign={isMobile ? "center" : "left"}
        sx={{ color: "#1976d2", mb: 2 }}
      >
        {t("purchaseManagement")}
      </Typography>

      <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2, borderRadius: 2 }}>
        <PurchaseForm onSuccess={fetchPurchases} />
      </Paper>

      <Paper sx={{ p: isMobile ? 1.5 : 2, borderRadius: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          flexDirection={isMobile ? "column" : "row"}
          gap={isMobile ? 1 : 0}
        >
          <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight={500}>
            {t("allPurchases")}
          </Typography>
          <Button
            startIcon={<Refresh />}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            onClick={fetchPurchases}
            fullWidth={isMobile}
            sx={{ borderRadius: 2 }}
          >
            {t("refresh")}
          </Button>
        </Box>

        <Box
          mb={2}
          display="flex"
          flexDirection={isMobile ? "column" : "row"}
          gap={1.5}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size={isMobile ? "small" : "medium"}
          />
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by batch no..."
            value={batchQuery}
            onChange={(e) => setBatchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size={isMobile ? "small" : "medium"}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : filteredPurchases.length === 0 ? (
          <Typography align="center" color="text.secondary" py={5}>
            {t("noPurchasesFound")}
          </Typography>
        ) : isMobile ? (
          <Box>{paginatedPurchases.map(renderMobileCard)}</Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#424242" }}>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("product")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("vendor")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("unitPrice")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("totalAmount")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    Batch No
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("purchaseSummary")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("splits")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("date")}
                  </TableCell>
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    {t("actions")}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedPurchases.map((p) => {
                  const {
                    productId,
                    vendorId,
                    shopSplits = [],
                    godownSplits = [],
                  } = p;

                  const splits = [
                    ...shopSplits.map((x) => ({
                      ...x,
                      type: "shop",
                      id: x.shop?._id || x.shop,
                    })),
                    ...godownSplits.map((x) => ({
                      ...x,
                      type: "godown",
                      id: x.godown?._id || x.godown,
                    })),
                  ];

                  return (
                    <TableRow
                      key={p._id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={(e) => {
                        // prevent delete button click from triggering row click
                        if (e.target.closest(".no-row-click")) return;
                        openTransportModal(p);
                      }}
                    >
                      <TableCell>
                        {productId?.productCode
                          ? `${productId.productCode} - `
                          : ""}
                        {getLocalizedText(productId?.name, language) || "—"}
                      </TableCell>
                      <TableCell>
                        {getLocalizedText(vendorId?.name, language) || "—"}
                      </TableCell>

                      <TableCell>
                        ₹ {Number(p.unitPrice || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        ₹ {Number(p.totalAmount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={p.batchNo || "—"} />
                      </TableCell>
                      <TableCell>
                        {p.purchaseMode === "SKU" ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`Packs: ${Number(p.totalPacks || 0)}`}
                          />
                        ) : (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`Qty: ${toUiQty(p.baseQty, p.baseUnitType).toFixed(2)} ${getUiUnitLabel(p.baseUnitType)}`}
                          />
                        )}
                      </TableCell>

                      {/* Splits column: View Splits button */}
                      <TableCell>
                        <Button
                          className="no-row-click"
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            openSplitsModal(
                              splits,
                              productId,
                              p.purchaseMode,
                              p.baseUnitType,
                            )
                          }
                        >
                          {t("viewSplits")}
                        </Button>
                      </TableCell>

                      <TableCell>
                        {new Date(p.purchaseDate).toLocaleDateString(
                          language === "ta" ? "ta-IN" : "en-IN",
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          className="no-row-click"
                          onClick={() => handlePrintBarcode(p)}
                          variant="contained"
                          color="secondary"
                          size="small"
                        >
                          Print Labels
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ---------------- Splits Modal ---------------- */}
      <Dialog
        open={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t("splits")} - {selectedProductLabel}
        </DialogTitle>

        <DialogContent dividers>
          {selectedSplits.length === 0 ? (
            <Typography>No splits available</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t("type")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("name")}</TableCell>

                  {/*  Dynamic Qty Column */}
                  <TableCell sx={{ fontWeight: 600 }}>
                    {selectedPurchaseMode === "LOOSE"
                      ? `Qty (${getUiUnitLabel(selectedBaseUnitType)})`
                      : "Packs"}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {selectedSplits.map((s, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {s.type === "shop" ? "Shop" : "Godown"}
                    </TableCell>

                    <TableCell>{formatSplitLabel(s)}</TableCell>

                    {/*  Show Qty in KG/LTR for Loose, Packs for SKU */}
                    <TableCell>
                      {selectedPurchaseMode === "LOOSE"
                        ? `${toUiQty(
                          s.baseQty || 0,
                          selectedBaseUnitType,
                        ).toFixed(2)} ${getUiUnitLabel(selectedBaseUnitType)}`
                        : (s.packs ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSplitModalOpen(false)} variant="contained">
            {t("close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={transportModalOpen}
        onClose={() => setTransportModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transport Details</DialogTitle>

        <DialogContent dividers>
          {!selectedTransport ? (
            <Typography>No transport details available</Typography>
          ) : (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Product: {selectedPurchaseInfo.productCode} - Product:{" "}
                {getLocalizedText(selectedPurchaseInfo.product, language)}
              </Typography>

              <Typography variant="subtitle2" mb={2}>
                Vendor: {selectedPurchaseInfo.vendor || "—"}
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption">Vehicle Number</Typography>
                  <Typography variant="body1">
                    {selectedTransport.vehicleNumber || "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption">Driver Name</Typography>
                  <Typography variant="body1">
                    {selectedTransport.driverName || "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption">Driver Phone</Typography>
                  <Typography variant="body1">
                    {selectedTransport.driverPhone || "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="caption">Transport Agency</Typography>
                  <Typography variant="body1">
                    {selectedTransport.transportAgency || "—"}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption">Remarks</Typography>
                  <Typography variant="body1">
                    {selectedTransport.remarks || "—"}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setTransportModalOpen(false)}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, val) => setPage(val)}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );
}
