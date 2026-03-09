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
  Tooltip,
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
  Autocomplete,
} from "@mui/material";
import { Delete, Refresh, Search } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { useParams } from "react-router-dom";

export default function InventoryList() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [combinedLocations, setCombinedLocations] = useState([]);

  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");

  const [currentUser, setCurrentUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { lang } = useParams();
  const limit = 10;
  const API_PAGE_LIMIT = 1000; // fetch a larger chunk so client-side pagination can show all pages

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

  //  Easy to edit later
  const LOW_STOCK_LIMIT = {
    kg: 10,
    pack: 10,
    ltr: 10,
    bag: 10,
    cp: 10,
  };

  const isLowStock = (inv) => {
    // 1️⃣ Priority: Use minStockLevel from Product Model if set > 0
    const minLevel = Number(inv.productId?.minStockLevel || inv.minStockLevel || 0);

    // 2️⃣ Fallback: Unit-based defaults if minLevel is not defined
    const unit =
      inv.unit?.en?.toLowerCase() ||
      inv.productId?.unit?.en?.toLowerCase() ||
      "";
    const defaultLimit = LOW_STOCK_LIMIT[unit] ?? 10;

    const limit = minLevel > 0 ? minLevel : defaultLimit;

    // Check SKU Mode (Packs)
    if (
      Number(inv.totalPacks || 0) > 0 ||
      Number(inv.remainingPacks || 0) > 0
    ) {
      return Number(inv.remainingPacks || 0) < limit;
    }

    // Check LOOSE Mode (Weight/PCS)
    // If limit was from minLevel, it matches the baseUnit (G/ML/PCS or KG/LTR depending on how user saved it)
    // But Product Model `minStockLevel` usually mirrors user input. 
    // To match backend `getLowStockReport` logic perfectly:
    const baseType = getBaseType(inv);
    if (baseType === "G" || baseType === "ML") {
      // If using defaultLimit (10), it means 10 KG / 10 LTR => 10000 G / 10000 ML
      // If using minLevel, we assume it's in KG/LTR (as per UI input)
      const thresholdInBase = limit * 1000;
      return Number(inv.remainingWeight || 0) < thresholdInBase;
    }

    // PCS
    return Number(inv.remainingWeight || 0) < limit;
  };

  const isNegativeStock = (inv) => {
    return Number(inv.remainingPacks || 0) < 0 || Number(inv.remainingWeight || 0) < 0;
  };

  // helper: newest first by createdAt fallback to updatedAt
  const sortByNewest = (list) =>
    [...list].sort(
      (a, b) =>
        new Date(b.createdAt || b.updatedAt || 0) -
        new Date(a.createdAt || a.updatedAt || 0),
    );

  // ---------------- Fetch Current User ----------------
  const fetchCurrentUser = async () => {
    try {
      const res = await customFetch.get("/auth/current-user");
      setCurrentUser(res.data.user);
    } catch (err) {
      console.error("Error fetching current user", err);
    }
  };

  // ---------------- Fetch Shops + Godowns ----------------
  const fetchShops = async () => {
    try {
      const [shopRes, godownRes] = await Promise.all([
        customFetch.get("/shops"),
        customFetch.get("/godowns"),
      ]);

      const shopsData = shopRes.data || [];
      const godownsData =
        godownRes.data.data || godownRes.data.godowns || godownRes.data || [];

      const formattedShops = shopsData.map((s) => ({
        _id: s._id, // shopId
        name: s.name?.en || s.name,
        type: "Shop",
      }));

      const formattedGodowns = godownsData.map((g) => ({
        _id: g._id,
        name: getText(g.name), //  CONVERT TO STRING HERE
        type: "Godown",
        parentShopId: g.shopId?._id || g.shopId,
      }));

      const merged = [...formattedShops, ...formattedGodowns];

      if (currentUser?.role === "admin") {
        setCombinedLocations(merged);
      } else {
        const userShopId =
          typeof currentUser.shopId === "object"
            ? currentUser.shopId._id
            : currentUser.shopId;

        // For subadmin & employee → show their shop + all godowns under it
        const filtered = merged.filter((loc) => {
          // Shop match
          if (loc.type === "Shop" && String(loc._id) === String(userShopId)) {
            return true;
          }

          // Godown under this shop
          if (
            loc.type === "Godown" &&
            String(loc.parentShopId) === String(userShopId)
          ) {
            return true;
          }

          return false;
        });

        setCombinedLocations(filtered);
      }
    } catch (error) {
      console.log("Shop/Godown Load ERROR:", error);
      toast.error("Error loading shop/godown data");
    }
  };

  // ---------------- Fetch Inventory ----------------
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data } = await customFetch.get("/inventory", {
        params: {
          page: 1,
          limit: API_PAGE_LIMIT,
        },
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

  // ---------------- Initial Load ----------------
  useEffect(() => {
    fetchCurrentUser();
    fetchInventory();
  }, []);

  useEffect(() => {
    if (currentUser) fetchShops();
  }, [currentUser]);

  // ---------------- Filtering Logic ----------------
  useEffect(() => {
    if (!currentUser) return;

    let filtered = [...inventory];

    // User access limitation
    if (currentUser.role === "subadmin" || currentUser.role === "user") {
      const shopId = currentUser.shopId?._id || currentUser.shopId;

      filtered = filtered.filter((inv) => {
        // ✔ show items in user's shop
        if (String(inv.shopId?._id) === String(shopId)) {
          return true;
        }

        // ✔ show items in godowns under this shop
        if (
          inv.godownId?._id &&
          combinedLocations.some(
            (loc) =>
              loc.type === "Godown" &&
              String(loc._id) === String(inv.godownId._id) &&
              String(loc.parentShopId) === String(shopId),
          )
        ) {
          return true;
        }

        return false;
      });
    }

    // Filter by Shop or Godown
    if (selectedLocation) {
      filtered = filtered.filter(
        (inv) =>
          String(inv.shopId?._id) === String(selectedLocation) ||
          String(inv.godownId?._id) === String(selectedLocation),
      );
    }

    // Filter by Product Code / Name
    if (productFilter.trim()) {
      const lower = productFilter.toLowerCase();
      filtered = filtered.filter((inv) => {
        const code = inv.productCode?.toLowerCase() || "";
        const nameEn =
          inv.productName?.en?.toLowerCase() ||
          inv.productId?.name?.en?.toLowerCase() ||
          "";
        const nameTa =
          inv.productName?.ta?.toLowerCase() ||
          inv.productId?.name?.ta?.toLowerCase() ||
          "";
        return (
          code.includes(lower) ||
          nameEn.includes(lower) ||
          nameTa.includes(lower)
        );
      });
    }

    // Filter by Category
    if (selectedCategory) {
      filtered = filtered.filter((inv) => {
        const cat =
          inv.category?.en ||
          inv.category?.ta ||
          inv.productId?.category?.en ||
          inv.productId?.category?.ta;
        return cat?.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    // Filter by Stock Status
    if (stockStatusFilter === "LOW") {
      filtered = filtered.filter((inv) => isLowStock(inv) && !isNegativeStock(inv));
    } else if (stockStatusFilter === "NEGATIVE") {
      filtered = filtered.filter((inv) => isNegativeStock(inv));
    }

    setFilteredInventory(sortByNewest(filtered));
    setTotalPages(Math.ceil(filtered.length / limit));
    setPage(1);
  }, [
    productFilter,
    selectedLocation,
    selectedCategory,
    stockStatusFilter,
    inventory,
    currentUser,
  ]);

  // ---------------- Paginated Data ----------------
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
    if (inv.shopId?.name) {
      return getText(inv.shopId.name); // shop still multilingual
    }

    if (inv.godownId?._id) {
      const godown = combinedLocations.find(
        (g) => String(g._id) === String(inv.godownId._id),
      );

      return godown?.name || "—";
    }

    return "—";
  };

  // ---------------- Delete ----------------
  const handleDelete = async (id) => {
    try {
      await customFetch.delete(`/inventory/${id}`);
      toast.success("Deleted");
      fetchInventory();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Delete failed";
      toast.error(msg);
    }
  };

  // ---------------- Mobile Card ----------------
  const MobileCard = ({ inv }) => {
    const productName = getText(inv.productId?.name);
    const category = getText(inv.productId?.category);
    const unit = getText(inv.productId?.unit);

    const baseType = getBaseType(inv);
    const isSku =
      Number(inv.totalPacks || 0) > 0 || Number(inv.remainingPacks || 0) > 0;

    const lowStock = isLowStock(inv);

    return (
      <Card sx={{ mb: 2, p: 1, borderRadius: 2 }}>
        <CardContent sx={{ p: 1 }}>
          <Typography fontWeight={600}>{productName}</Typography>
          <Typography color="text.secondary">{inv.productCode}</Typography>

          <Divider sx={{ my: 1 }} />

          <Box display="flex" justifyContent="space-between">
            <Typography>Category:</Typography>
            <Typography>{category}</Typography>
          </Box>

          <Box display="flex" justifyContent="space-between">
            <Typography>Unit:</Typography>
            <Typography>{unit}</Typography>
          </Box>

          {/* <Box display="flex" justifyContent="space-between"> */}
          {/* <Typography>Vendor:</Typography> */}
          {/* <Typography>{getText(inv.vendorId?.name)}</Typography> */}
          {/* </Box> */}

          <Box display="flex" justifyContent="space-between">
            <Typography>{inv.shopId ? "Shop:" : "Godown:"}</Typography>
            <Typography>{getLocationName(inv)}</Typography>
          </Box>

          {/*  ADD THIS BLOCK */}
          <Divider sx={{ my: 1 }} />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography fontWeight={500}>Stock:</Typography>

            {isSku ? (
              <Chip
                size="small"
                label={`Packs: ${Number(inv.remainingPacks || 0)} / ${Number(inv.totalPacks || 0)}`}
                variant="outlined"
              />
            ) : (
              <Chip
                size="small"
                label={`Qty: ${toUiQty(inv.remainingWeight, baseType).toFixed(3)} / ${toUiQty(inv.totalWeight, baseType).toFixed(3)} ${getUiUnitLabel(baseType)}`}
                variant="outlined"
              />
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          {/*  Existing */}
          <Chip
            label={isNegativeStock(inv) ? "Negative Stock" : lowStock ? "Low Stock" : "OK"}
            color={isNegativeStock(inv) ? "error" : lowStock ? "warning" : "success"}
            size="small"
          />

          <Box display="flex" justifyContent="flex-end">
            <IconButton color="error" onClick={() => handleDelete(inv._id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // ---------------- Render ----------------
  return (
    <Box p={isMobile ? 1 : 2}>
      <Typography variant={isMobile ? "h6" : "h5"} fontWeight={600} mb={2}>
        {currentLang === "ta" ? "சரக்கு மேலாண்மை" : "Inventory Management"}
      </Typography>

      {/* ---------------- FILTERS ---------------- */}
      <Paper sx={{ p: 2, mb: 2, display: "flex", flexWrap: "wrap", gap: 2 }}>
        <TextField
          size="small"
          label="Product Code / Name"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {currentUser && (
          <Autocomplete
            size="small"
            sx={{ minWidth: 250 }}
            options={[
              { _id: "", name: "All Locations", type: "" },
              ...combinedLocations,
            ]}
            isOptionEqualToValue={(option, value) =>
              String(option._id) === String(value?._id)
            }
            getOptionLabel={(option) => {
              if (option._id === "") return "All";

              const name =
                typeof option.name === "string"
                  ? option.name
                  : getText(option.name);
              console.log(name);

              return `${name} (${option.type})`;
            }}
            value={
              [
                { _id: "", name: "All Locations", type: "" },
                ...combinedLocations,
              ].find((opt) => String(opt._id) === String(selectedLocation)) || {
                _id: "",
                name: "All Locations",
                type: "",
              }
            }
            onChange={(e, value) => {
              setSelectedLocation(value?._id || "");
            }}
            renderInput={(params) => (
              <TextField {...params} label="Filter Shop/Godown" />
            )}
          />
        )}

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((cat, i) => (
              <MenuItem key={i} value={cat.en}>
                {getText(cat)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Stock Status</InputLabel>
          <Select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
          >
            <MenuItem value="ALL">All Stock</MenuItem>
            <MenuItem value="LOW">Low Stock</MenuItem>
            <MenuItem value="NEGATIVE">Negative Stock</MenuItem>
          </Select>
        </FormControl>

        <Button
          startIcon={<Refresh />}
          variant="outlined"
          onClick={fetchInventory}
        >
          Refresh
        </Button>
      </Paper>

      {/* ---------------- LIST TABLE ---------------- */}
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box textAlign="center" py={5}>
            <CircularProgress />
          </Box>
        ) : filteredInventory.length === 0 ? (
          <Typography align="center">No inventory records</Typography>
        ) : (
          <>
            {!isMobile ? (
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table sx={{ minWidth: 1100 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#424242" }}>
                      {[
                        "Product Code",
                        "Product Name",
                        "Batch No",
                        "Category",
                        "Unit",
                        "Location",
                        "Stock Summary",
                        "Date",
                        "Stock",
                        // "Actions",
                      ].map((head) => (
                        <TableCell key={head} sx={{ color: "white" }}>
                          {head}
                        </TableCell>
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
                          <TableCell>
                            {inv.batchNo ? (
                              <Chip size="small" label={inv.batchNo} color="info" variant="outlined" />
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell>
                            {getText(inv.productId?.category)}
                          </TableCell>

                          <TableCell>{getText(inv.productId?.unit)}</TableCell>

                          {/* <TableCell>{getText(inv.vendorId?.name)}</TableCell> */}
                          <TableCell>
                            {inv.shopId
                              ? `${getLocationName(inv)} (Shop)`
                              : `${getLocationName(inv)} (Godown)`}
                          </TableCell>
                          {/* <TableCell>
                            <Box>
                           
                              {Number(inv.totalPacks || 0) > 0 ||
                              Number(inv.remainingPacks || 0) > 0 ? (
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    Packs: {Number(inv.remainingPacks || 0)} /{" "}
                                    {Number(inv.totalPacks || 0)}
                                  </Typography>
                                </Box>
                              ) : (
                                //  LOOSE MODE → show Qty
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    Qty:{" "}
                                    {toUiQty(
                                      inv.remainingWeight,
                                      baseType,
                                    ).toFixed(3)}{" "}
                                    {getUiUnitLabel(baseType)}
                                    {" / "}
                                    {toUiQty(inv.totalWeight, baseType).toFixed(
                                      2,
                                    )}{" "}
                                    {getUiUnitLabel(baseType)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell> */}

                          <TableCell>
                            <Box
                              sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
                            >
                              {/*  PACKS */}
                              {(Number(inv.totalPacks || 0) > 0 ||
                                Number(inv.remainingPacks || 0) > 0) && (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Packs: ${Number(inv.remainingPacks || 0)} / ${Number(inv.totalPacks || 0)}`}
                                  />
                                )}

                              {/*  PCS / KG / LTR */}
                              {(Number(inv.totalWeight || 0) > 0 ||
                                Number(inv.remainingWeight || 0) > 0) && (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Qty: ${toUiQty(inv.remainingWeight, baseType).toFixed(3)} ${getUiUnitLabel(baseType)} / ${toUiQty(inv.totalWeight, baseType).toFixed(3)} ${getUiUnitLabel(baseType)}`}
                                  />
                                )}

                              {/*  If empty */}
                              {Number(inv.totalPacks || 0) === 0 &&
                                Number(inv.remainingPacks || 0) === 0 &&
                                Number(inv.totalWeight || 0) === 0 &&
                                Number(inv.remainingWeight || 0) === 0 && (
                                  <Chip size="small" label="No Stock" />
                                )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {new Date(inv.createdAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={isNegativeStock(inv) ? "Negative Stock" : isLowStock(inv) ? "Low Stock" : "OK"}
                              color={isNegativeStock(inv) ? "error" : isLowStock(inv) ? "warning" : "success"}
                              size="small"
                            />
                          </TableCell>
                          {/* <TableCell>
                            <Tooltip title="Delete">
                              <IconButton
                                color="error"
                                onClick={() => handleDelete(inv._id)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell> */}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              currentPageData.map((inv) => (
                <MobileCard key={inv._id} inv={inv} />
              ))
            )}

            <Box textAlign="center" mt={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, val) => setPage(val)}
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

