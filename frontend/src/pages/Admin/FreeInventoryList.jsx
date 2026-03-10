import React, { useEffect, useState, useMemo } from "react";
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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  TextField,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from "@mui/material";
import { Delete, Refresh, Search } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function FreeInventoryList() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [shopsList, setShopsList] = useState([]);
  const [godownsList, setGodownsList] = useState([]);

  const [selectedShop, setSelectedShop] = useState("");
  const [selectedGodown, setSelectedGodown] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");

  const [currentUser, setCurrentUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { lang } = useParams();
  const limit = 10;
  const API_PAGE_LIMIT = 1000;

  const [openAddModal, setOpenAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    productId: null,
    quantity: "",
    locationId: "",
    locationType: "shop",
    linkedProductId: null
  });
  const [productSearchOptions, setProductSearchOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearchProducts = async (q) => {
    if (!q || q.length < 2) return;
    setSearchLoading(true);
    try {
      const { data } = await customFetch.get(`/product/search?q=${q}`);
      setProductSearchOptions(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFreeStock = async () => {
    if (!addFormData.productId || !addFormData.quantity || !addFormData.locationId) {
      return toast.warn("Please fill all required fields");
    }
    try {
      setLoading(true);
      await customFetch.post("/inventory/add-free-stock", {
        productId: addFormData.productId._id,
        quantity: addFormData.quantity,
        locationId: addFormData.locationId,
        locationType: addFormData.locationType,
        linkedProductId: addFormData.linkedProductId?._id,
      });
      toast.success("Free stock added and linked!");
      setOpenAddModal(false);
      setAddFormData({
        productId: null,
        quantity: "",
        locationId: "",
        locationType: "shop",
        linkedProductId: null
      });
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error adding free stock");
    } finally {
      setLoading(false);
    }
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const validLangs = ["en", "ta", "both"];
  const currentLang = validLangs.includes(lang) ? lang : "en";

  const getUiUnitLabel = (baseUnitType) => {
    const base = String(baseUnitType || "G").toUpperCase();
    if (base === "G") return "KG";
    if (base === "ML") return "LTR";
    return "PCS";
  };

  const getBaseType = (inv) =>
    String(
      inv.productId?.baseUnitType || inv.baseUnitType || "G",
    ).toUpperCase();

  const toUiQty = (baseQty, baseUnitType) => {
    const qty = Number(baseQty || 0);
    const base = String(baseUnitType || "G").toUpperCase();

    if (base === "G") return qty / 1000;
    if (base === "ML") return qty / 1000;
    return qty;
  };

  const isLowStock = (inv) => {
    const minLevel = Number(inv.productId?.minStockLevel || inv.minStockLevel || 0);
    const defaultLimit = 10;
    const limit = minLevel > 0 ? minLevel : defaultLimit;

    if (Number(inv.totalPacks || 0) > 0 || Number(inv.remainingPacks || 0) > 0) {
      return Number(inv.remainingPacks || 0) < limit;
    }
    const baseType = getBaseType(inv);
    if (baseType === "G" || baseType === "ML") {
      const thresholdInBase = limit * 1000;
      return Number(inv.remainingWeight || 0) < thresholdInBase;
    }
    return Number(inv.remainingWeight || 0) < limit;
  };

  const isNegativeStock = (inv) => {
    return Number(inv.remainingPacks || 0) < 0 || Number(inv.remainingWeight || 0) < 0;
  };

  const sortByNewest = (list) =>
    [...list].sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) -
        new Date(a.createdAt || a.updatedAt || 0),
    );

  const fetchCurrentUser = async () => {
    try {
      const res = await customFetch.get("/auth/current-user");
      setCurrentUser(res.data.user);
    } catch (err) {
      console.error("Error fetching current user", err);
    }
  };

  const fetchShops = async () => {
    try {
      const [shopRes, godownRes] = await Promise.all([
        customFetch.get("/shops"),
        customFetch.get("/godowns"),
      ]);

      const shopsData = shopRes.data || [];
      const godownsData = godownRes.data.data || godownRes.data.godowns || godownRes.data || [];

      const formattedShops = shopsData.map((s) => ({
        _id: s._id,
        name: s.name?.en || s.name,
        type: "Shop",
      }));

      const formattedGodowns = godownsData.map((g) => ({
        _id: g._id,
        name: g.name?.en || g.name || "",
        type: "Godown",
        parentShopId: g.shopId?._id || g.shopId,
      }));

      if (currentUser?.role === "admin") {
        setShopsList(formattedShops);
        setGodownsList(formattedGodowns);
      } else {
        const userShopId = currentUser.shopId?._id || currentUser.shopId;
        const filteredShops = formattedShops.filter((s) => String(s._id) === String(userShopId));
        const filteredGodowns = formattedGodowns.filter((g) => String(g.parentShopId) === String(userShopId));
        setShopsList(filteredShops);
        setGodownsList(filteredGodowns);
      }
    } catch (error) {
      toast.error("Error loading shop/godown data");
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data } = await customFetch.get("/inventory", {
        params: { page: 1, limit: API_PAGE_LIMIT, isFree: true },
      });
      const invData = data.data || [];
      const sorted = sortByNewest(invData);

      setInventory(sorted);
      setFilteredInventory(sorted);
      setTotalPages(Math.max(1, Math.ceil(invData.length / limit)));

      const cats = [
        ...new Map(
          invData
            .map((inv) => inv.category || inv.productId?.category)
            .filter(Boolean)
            .map((cat) => [cat.en, cat]),
        ).values(),
      ];
      setCategories(cats);
    } catch {
      toast.error("Error fetching inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchInventory();
  }, []);

  useEffect(() => {
    if (currentUser) fetchShops();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    let filtered = [...inventory];

    if (currentUser.role === "subadmin" || currentUser.role === "user") {
      const shopId = currentUser.shopId?._id || currentUser.shopId;
      filtered = filtered.filter((inv) => {
        if (String(inv.shopId?._id) === String(shopId)) return true;
        if (inv.godownId?._id && godownsList.some((g) => String(g._id) === String(inv.godownId._id))) return true;
        return false;
      });
    }

    if (selectedShop) filtered = filtered.filter((inv) => String(inv.shopId?._id) === String(selectedShop));
    if (selectedGodown) filtered = filtered.filter((inv) => String(inv.godownId?._id) === String(selectedGodown));
    
    if (productFilter.trim()) {
      const lower = productFilter.toLowerCase();
      filtered = filtered.filter((inv) => {
        const code = inv.productCode?.toLowerCase() || "";
        const nameEn = inv.productName?.en?.toLowerCase() || inv.productId?.name?.en?.toLowerCase() || "";
        const nameTa = inv.productName?.ta?.toLowerCase() || inv.productId?.name?.ta?.toLowerCase() || "";
        return code.includes(lower) || nameEn.includes(lower) || nameTa.includes(lower);
      });
    }

    if (selectedCategory) {
      filtered = filtered.filter((inv) => {
        const cat = inv.category?.en || inv.category?.ta || inv.productId?.category?.en || inv.productId?.category?.ta;
        return cat?.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    if (stockStatusFilter === "LOW") {
      filtered = filtered.filter((inv) => isLowStock(inv) && !isNegativeStock(inv));
    } else if (stockStatusFilter === "NEGATIVE") {
      filtered = filtered.filter((inv) => isNegativeStock(inv));
    }

    setFilteredInventory(sortByNewest(filtered));
    setTotalPages(Math.ceil(filtered.length / limit));
    setPage(1);
  }, [productFilter, selectedShop, selectedGodown, selectedCategory, stockStatusFilter, inventory, currentUser, godownsList]);

  const currentPageData = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredInventory.slice(start, start + limit);
  }, [filteredInventory, page]);

  const getText = (obj) => {
    if (!obj) return "—";
    if (currentLang === "en") return obj.en || "—";
    if (currentLang === "ta") return obj.ta || obj.en || "—";
    return `${obj.en || "—"} / ${obj.ta || "—"}`;
  };

  const getLocationName = (inv) => {
    if (inv.shopId?.name) return getText(inv.shopId.name);
    if (inv.godownId?._id) {
      const godown = godownsList.find((g) => String(g._id) === String(inv.godownId._id));
      return godown?.name || "—";
    }
    return "—";
  };

  const getStockSummary = (inv) => {
    const baseType = getBaseType(inv);
    const parts = [];
    if (Number(inv.totalPacks || 0) > 0 || Number(inv.remainingPacks || 0) > 0) {
      parts.push(`Packs: ${Number(inv.remainingPacks || 0)} / ${Number(inv.totalPacks || 0)}`);
    }
    if (Number(inv.totalWeight || 0) > 0 || Number(inv.remainingWeight || 0) > 0) {
      parts.push(`Qty: ${toUiQty(inv.remainingWeight, baseType).toFixed(3)} ${getUiUnitLabel(baseType)}`);
    }
    return parts.length ? parts.join(" | ") : "No Stock";
  };

  const exportInventoryExcel = () => {
    const rows = filteredInventory.map(inv => ({
      "Product Code": inv.productCode,
      "Product Name": getText(inv.productId?.name),
      "Category": getText(inv.productId?.category),
      "Location": getLocationName(inv),
      "Stock": getStockSummary(inv)
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Free Inventory");
    XLSX.writeFile(workbook, "Free_Inventory.xlsx");
  };

  const exportInventoryPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("Free Item Inventory Report", 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Code", "Name", "Category", "Location", "Stock"]],
      body: filteredInventory.map(inv => [
        inv.productCode,
        getText(inv.productId?.name),
        getText(inv.productId?.category),
        getLocationName(inv),
        getStockSummary(inv)
      ]),
    });
    doc.save("Free_Inventory.pdf");
  };

  const MobileCard = ({ inv }) => {
    const baseType = getBaseType(inv);
    const lowStock = isLowStock(inv);
    return (
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Typography fontWeight={600}>{getText(inv.productId?.name)}</Typography>
          <Typography color="text.secondary" variant="body2">{inv.productCode}</Typography>
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">Location:</Typography>
            <Typography variant="body2">{getLocationName(inv)}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="body2">Stock:</Typography>
            <Typography variant="body2">{getStockSummary(inv)}</Typography>
          </Box>
          <Box mt={1}>
            <Chip 
              label={isNegativeStock(inv) ? "Negative" : lowStock ? "Low Stock" : "OK"} 
              color={isNegativeStock(inv) ? "error" : lowStock ? "warning" : "success"}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box p={isMobile ? 1 : 2}>
      <Typography variant={isMobile ? "h6" : "h5"} fontWeight={600} mb={2}>
        {currentLang === "ta" ? "இலவசப் பொருட்கள் இருப்பு" : "Free Item Inventory"}
      </Typography>

      <Paper sx={{ p: 2, mb: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
        <TextField
          size="small"
          label="Search Product"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} label="Category">
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat, i) => <MenuItem key={i} value={cat.en}>{getText(cat)}</MenuItem>)}
          </Select>
        </FormControl>
        <Button startIcon={<Refresh />} variant="outlined" onClick={fetchInventory}>Refresh</Button>
        <Button variant="contained" color="success" onClick={() => setOpenAddModal(true)}>+ Add Free Stock</Button>
        <Button variant="outlined" onClick={exportInventoryExcel}>Excel</Button>
        <Button variant="outlined" color="error" onClick={exportInventoryPDF}>PDF</Button>
      </Paper>

      {/* ADD FREE STOCK MODAL */}
      <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Free Item Stock</DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
            
            <Autocomplete
              options={productSearchOptions}
              loading={searchLoading}
              getOptionLabel={(p) => p.name?.en ? `${p.productCode} - ${p.name.en}` : ""}
              onInputChange={(e, v) => handleSearchProducts(v)}
              onChange={(e, v) => setAddFormData(prev => ({ ...prev, productId: v }))}
              renderInput={(params) => <TextField {...params} label="Search Free Product *" size="small" />}
            />

            <TextField
              label="Quantity *"
              type="number"
              size="small"
              value={addFormData.quantity}
              onChange={(e) => setAddFormData(prev => ({ ...prev, quantity: e.target.value }))}
              helperText={addFormData.productId?.baseUnitType === "G" || addFormData.productId?.baseUnitType === "ML" ? "In Packs / KG / LTR" : "In Pieces"}
            />

            <Box sx={{ display: "flex", gap: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Location Type</InputLabel>
                <Select
                  value={addFormData.locationType}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, locationType: e.target.value, locationId: "" }))}
                  label="Location Type"
                >
                  <MenuItem value="shop">Shop</MenuItem>
                  <MenuItem value="godown">Godown</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Select {addFormData.locationType === "shop" ? "Shop" : "Godown"}</InputLabel>
                <Select
                  value={addFormData.locationId}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, locationId: e.target.value }))}
                  label={`Select ${addFormData.locationType === "shop" ? "Shop" : "Godown"}`}
                >
                  {addFormData.locationType === "shop" 
                    ? shopsList.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)
                    : godownsList.map(g => <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>)
                  }
                </Select>
              </FormControl>
            </Box>

            <Divider />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              LINK TO MAIN PRODUCT (AUTO-ADD TRIGGER)
            </Typography>

            <Autocomplete
              options={productSearchOptions}
              loading={searchLoading}
              getOptionLabel={(p) => p.name?.en ? `${p.productCode} - ${p.name.en}` : ""}
              onInputChange={(e, v) => handleSearchProducts(v)}
              onChange={(e, v) => setAddFormData(prev => ({ ...prev, linkedProductId: v }))}
              renderInput={(params) => <TextField {...params} label="Triggers when selling..." size="small" placeholder="Optional" />}
            />

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddFreeStock} disabled={loading}>
            {loading ? "Adding..." : "Confirm & Add Stock"}
          </Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box textAlign="center" py={5}><CircularProgress /></Box>
        ) : filteredInventory.length === 0 ? (
          <Typography align="center">No free items in stock</Typography>
        ) : (
          <>
            {!isMobile ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#2e7d32" }}>
                      {["Code", "Product Name", "Category", "Location", "Stock Summary", "Status"].map((h) => (
                        <TableCell key={h} sx={{ color: "white", fontWeight: "bold" }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentPageData.map((inv) => {
                      const baseType = getBaseType(inv);
                      return (
                        <TableRow key={inv._id}>
                          <TableCell>{inv.productCode}</TableCell>
                          <TableCell>{getText(inv.productId?.name)}</TableCell>
                          <TableCell>{getText(inv.productId?.category)}</TableCell>
                          <TableCell>{getLocationName(inv)}</TableCell>
                          <TableCell>{getStockSummary(inv)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={isNegativeStock(inv) ? "Negative" : isLowStock(inv) ? "Low Stock" : "OK"} 
                              color={isNegativeStock(inv) ? "error" : isLowStock(inv) ? "warning" : "success"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              currentPageData.map((inv) => <MobileCard key={inv._id} inv={inv} />)
            )}
            <Box textAlign="center" mt={2}>
              <Pagination count={totalPages} page={page} onChange={(e, val) => setPage(val)} />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
