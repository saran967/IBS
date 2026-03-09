import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Autocomplete,
} from "@mui/material";
import { AddCircle, RemoveCircle, Inventory } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";

const StockTransfer = ({ onTransferComplete }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.down("md"));

  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [productSearchText, setProductSearchText] = useState("");

  const [toShops, setToShops] = useState([]);

  const [formData, setFormData] = useState({
    transfers: [{ fromShopId: "", toShopId: "", productId: "", quantity: "" }],
  });

  const [currentUser, setCurrentUser] = useState(null);

  // 🕒 Live date/time updater
  useEffect(() => {
    const updateDateTime = () =>
      setCurrentDateTime(new Date().toLocaleString());
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, shopRes, godownRes, productRes, invRes] =
        await Promise.all([
          customFetch.get("/auth/current-user"),
          customFetch.get("/shops"),
          customFetch.get("/godowns"),
          customFetch.get("/product"),
          customFetch.get("/inventory"),
        ]);

      // CURRENT USER
      const user = userRes.data?.user || {};
      setCurrentUser(user);

      // SHOPS
      const shopsData = shopRes.data || [];

      // GODOWNS
      const godownsData =
        godownRes.data?.data || godownRes.data?.godowns || godownRes.data || [];

      // FORMAT SHOPS
      const formattedShops = shopsData.map((s) => ({
        _id: s._id,
        name: s.name?.en || s.name,
        type: "Shop",
      }));

      // FORMAT GODOWNS
      const formattedGodowns = godownsData.map((g) => ({
        _id: g._id,
        name: g.name?.en || g.name,
        type: "Godown",
        parentShopId: g.shopId?._id || g.shopId,
      }));

      const allLocations = [...formattedShops, ...formattedGodowns];

      // =================================================================================
      // ROLE LOGIC
      // =================================================================================

      if (user.role === "admin") {
        // ADMIN → from = all, to = all
        setShops(allLocations); // FROM
        setToShops(allLocations); // TO
      } else {
        // SUBADMIN / EMPLOYEE
        const userShopId = user?.shopId?._id || user?.shopId || null;

        const userGodownId = user.godownId?._id || user.godownId || null;
        if (!userShopId) {
          console.warn("⚠ No shop assigned to this user:", user);
          setShops([]);
          setToShops([]);
          return;
        }

        // FROM → Only user shop + its godowns
        const fromAllowed = allLocations.filter((loc) => {
          if (loc.type === "Shop") return loc._id === String(userShopId);
          if (loc.type === "Godown")
            return loc.parentShopId === String(userShopId);
          return false;
        });

        // TO → ALL shops & ALL godowns
        const toAllowed = allLocations;

        setShops(fromAllowed); // FROM dropdown
        setToShops(toAllowed); // TO dropdown
      }

      // PRODUCTS
      setProducts(productRes.data?.products || productRes.data || []);

      // INVENTORY
      setInventory(invRes.data?.data || invRes.data?.inventory || []);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      if (!productSearchText || productSearchText.length < 2) {
        setProductOptions([]);
        return;
      }

      try {
        const res = await customFetch.get(
          `/product/search?q=${productSearchText}`,
        );
        setProductOptions(res.data.products || []);
      } catch (err) {
        console.error("Product search failed");
      }
    };

    fetchProducts();
  }, [productSearchText]);

  useEffect(() => {
    fetchData();
  }, []);

  // 📊 Get available stock (remainingPacks) for a product in a shop
  const getAvailableStock = (locationId, productId) => {
    if (!locationId || !productId || !Array.isArray(inventory)) return 0;

    const found = inventory.find((item) => {
      const invShop = String(item?.shopId?._id || item?.shopId || "");
      const invGodown = String(item?.godownId?._id || item?.godownId || "");
      const product = String(item?.productId?._id || item?.productId || "");

      return (
        product === String(productId) &&
        (invShop === String(locationId) || invGodown === String(locationId))
      );
    });

    return found ? Number(found.remainingPacks || 0) : 0;
  };

  // ✏ Handle input changes
  const handleFieldChange = (index, e) => {
    const { name, value } = e.target;
    const updatedTransfers = [...formData.transfers];
    updatedTransfers[index][name] = value;
    setFormData({ ...formData, transfers: updatedTransfers });

    // Show available stock instantly when product is chosen
    if (name === "productId" && value && updatedTransfers[index].fromShopId) {
      const availableStock = getAvailableStock(
        updatedTransfers[index].fromShopId,
        value,
      );
      const product = products.find((p) => p._id === value);
      const productName =
        typeof product?.name === "object"
          ? product.name.en
          : product?.name || "Product";
      toast.info(
        `${productName} available (remaining packs): ${availableStock}`,
      );
    }
  };

  // ➕ Add row
  const addTransferRow = () => {
    setFormData((prev) => ({
      ...prev,
      transfers: [
        ...prev.transfers,
        { fromShopId: "", toShopId: "", productId: "", quantity: "" },
      ],
    }));
    toast.success("Added new transfer row");
  };

  // ➖ Remove row
  const removeTransferRow = (index) => {
    const updatedTransfers = formData.transfers.filter((_, i) => i !== index);
    setFormData({ ...formData, transfers: updatedTransfers });
    toast.info("Removed transfer row");
  };

  // 🚀 Submit transfer
  const handleSubmit = async (e) => {
    // console.log("function")
    e.preventDefault();

    for (let i = 0; i < formData.transfers.length; i++) {
      const t = formData.transfers[i];
      if (!t.fromShopId || !t.toShopId || !t.productId || !t.quantity) {
        toast.warn(`Please fill all details in row ${i + 1}`);
        return;
      }
      if (t.fromShopId === t.toShopId) {
        toast.warn(`From and To shops cannot be the same (row ${i + 1})`);
        return;
      }

      const availableStock = getAvailableStock(t.fromShopId, t.productId);
      if (parseInt(t.quantity, 10) > availableStock) {
        toast.error(
          `Insufficient stock in row ${
            i + 1
          }. Available (remaining packs): ${availableStock}`,
        );
        return;
      }
    }

    setLoading(true);
    try {
      for (const transfer of formData.transfers) {
        if (currentUser?.role === "admin") {
          // ADMIN → Direct Transfer
          await customFetch.post("/stock-transfer/transfer", {
            fromLocationId: transfer.fromShopId, // shop or godown
            toLocationId: transfer.toShopId, // shop or godown
            products: [
              {
                productId: transfer.productId,
                quantity: parseInt(transfer.quantity, 10),
              },
            ],
            transferDate: new Date().toISOString(),
          });

          // Update inventory UI (admin only)
          setInventory((prev) =>
            prev.map((item) => {
              if (
                String(item.shopId?._id || item.shopId) ===
                  String(transfer.fromShopId) &&
                String(item.productId?._id || item.productId) ===
                  String(transfer.productId)
              ) {
                return {
                  ...item,
                  remainingPacks: Math.max(
                    0,
                    Number(item.remainingPacks ?? 0) -
                      Number(transfer.quantity ?? 0),
                  ),
                };
              }
              return item;
            }),
          );
        } else {
          // SUBADMIN / EMPLOYEE → Send REQUEST (no deduction)
          await customFetch.post("/stock-transfer/transfer", {
            fromLocationId: transfer.fromShopId, // shop or godown
            toLocationId: transfer.toShopId, // shop or godown
            products: [
              {
                productId: transfer.productId,
                quantity: parseInt(transfer.quantity, 10),
              },
            ],
            transferDate: new Date().toISOString(),
          });

          toast.info("Request sent to admin for approval");
        }

        //  Update remaining packs locally (no re-fetch needed)
        setInventory((prev) =>
          prev.map((item) => {
            if (
              String(item.shopId?._id || item.shopId) ===
                String(transfer.fromShopId) &&
              String(item.productId?._id || item.productId) ===
                String(transfer.productId)
            ) {
              return {
                ...item,
                remainingPacks: Math.max(
                  0,
                  Number(item.remainingPacks ?? 0) -
                    Number(transfer.quantity ?? 0),
                ),
              };
            }
            return item;
          }),
        );
      }

      toast.success(`Stock transferred successfully at ${currentDateTime}`);

      // Reset form
      setFormData({
        transfers: [
          { fromShopId: "", toShopId: "", productId: "", quantity: "" },
        ],
      });

      // Notify parent if needed
      if (onTransferComplete) onTransferComplete();
    } catch (err) {
      toast.error(err?.response?.data?.msg || "Stock transfer failed");
    } finally {
      setLoading(false);
    }
  };

  // Mobile card component for transfer rows
  const TransferCard = ({ transfer, index }) => {
    const availableStock =
      transfer.fromShopId && transfer.productId
        ? getAvailableStock(transfer.fromShopId, transfer.productId)
        : 0;

    const product = products.find((p) => p._id === transfer.productId);
    const productName = product
      ? typeof product.name === "object"
        ? product.name.en
        : product.name
      : "Select Product";

    const fromShop = shops.find((s) => s._id === transfer.fromShopId);
    const fromShopName = fromShop
      ? typeof fromShop.name === "object"
        ? fromShop.name.en
        : fromShop.name
      : "Select Shop";

    const toShop = shops.find((s) => s._id === transfer.toShopId);
    const toShopName = toShop
      ? typeof toShop.name === "object"
        ? toShop.name.en
        : toShop.name
      : "Select Shop";

    return (
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">
                Transfer #{index + 1}
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={shops}
                getOptionLabel={(loc) => `${loc.name} (${loc.type})`}
                value={shops.find((s) => s._id === transfer.fromShopId) || null}
                onChange={(e, newValue) => {
                  handleFieldChange(index, {
                    target: { name: "fromShopId", value: newValue?._id || "" },
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="From Shop / Godown"
                    size="small"
                    sx={{ width: 200 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={toShops}
                getOptionLabel={(loc) => `${loc.name} (${loc.type})`}
                value={toShops.find((s) => s._id === transfer.toShopId) || null}
                onChange={(e, newValue) => {
                  handleFieldChange(index, {
                    target: { name: "toShopId", value: newValue?._id || "" },
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="To Shop / Godown"
                    size="small"
                    sx={{ width: 200 }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                options={productOptions}
                value={
                  products.find((p) => p._id === transfer.productId) || null
                }
                isOptionEqualToValue={(option, value) =>
                  String(option._id) === String(value?._id)
                }
                getOptionLabel={(p) => {
                  const code = p.productCode || "";
                  const en = p.name?.en || "";
                  const ta = p.name?.ta || "";
                  return `${code} - ${en}${ta ? " / " + ta : ""}`;
                }}
                onInputChange={(e, value) => setProductSearchText(value)}
                onChange={(e, newValue) => {
                  handleFieldChange(index, {
                    target: { name: "productId", value: newValue?._id || "" },
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    sx={{ width: 200 }}
                    {...params}
                    label="Product"
                    size="small"
                    placeholder="Search by code / name"
                    fullWidth
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Quantity"
                name="quantity"
                type="number"
                value={transfer.quantity}
                onChange={(e) => handleFieldChange(index, e)}
                size="small"
                fullWidth
              />
            </Grid>

            {transfer.fromShopId && transfer.productId && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    ...(availableStock > 0
                      ? {
                          backgroundColor: "success.light",
                          color: "success.dark",
                        }
                      : {
                          backgroundColor: "error.light",
                          color: "error.dark",
                        }),
                  }}
                >
                  <Inventory fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    Available: {availableStock} packs
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" color="text.secondary">
                  {fromShopName} → {toShopName} | {productName}
                </Typography>
                <Box>
                  {formData.transfers.length > 1 && (
                    <IconButton
                      color="error"
                      onClick={() => removeTransferRow(index)}
                      title="Remove Row"
                      size="small"
                    >
                      <RemoveCircle />
                    </IconButton>
                  )}
                  {index === formData.transfers.length - 1 && (
                    <IconButton
                      color="primary"
                      onClick={addTransferRow}
                      title="Add Row"
                      size="small"
                    >
                      <AddCircle />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Paper
      elevation={3}
      sx={{ p: { xs: 2, sm: 3 }, mb: 3, position: "relative" }}
    >
      <Typography
        variant="caption"
        sx={{
          position: "absolute",
          top: { xs: 8, sm: 12 },
          right: { xs: 12, sm: 20 },
          color: "text.secondary",
        }}
      >
        {currentDateTime}
      </Typography>

      <Typography variant="h6" gutterBottom>
        🏷 New Stock Transfer
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ width: "100%" }}>
          {isSm ? (
            // Mobile view - Cards
            <Box>
              {formData.transfers.map((transfer, index) => (
                <TransferCard key={index} transfer={transfer} index={index} />
              ))}
            </Box>
          ) : (
            // Desktop view - Table-like layout
            <Box>
              {formData.transfers.map((transfer, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 3,
                    p: 1,
                  }}
                >
                  {/* From Shop */}
                  <Autocomplete
                    options={shops}
                    getOptionLabel={(loc) => `${loc.name} (${loc.type})`}
                    value={
                      shops.find((s) => s._id === transfer.fromShopId) || null
                    }
                    onChange={(e, newValue) => {
                      handleFieldChange(index, {
                        target: {
                          name: "fromShopId",
                          value: newValue?._id || "",
                        },
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="From Shop / Godown"
                        size="small"
                        sx={{ width: 200 }}
                      />
                    )}
                  />

                  {/* To Shop */}
                  <Autocomplete
                    options={toShops}
                    getOptionLabel={(loc) => `${loc.name} (${loc.type})`}
                    value={
                      toShops.find((s) => s._id === transfer.toShopId) || null
                    }
                    onChange={(e, newValue) => {
                      handleFieldChange(index, {
                        target: {
                          name: "toShopId",
                          value: newValue?._id || "",
                        },
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="To Shop / Godown"
                        size="small"
                        sx={{ width: 200 }}
                      />
                    )}
                  />

                  {/* Product */}
                  <Box sx={{ width: 220 }}>
                    <Autocomplete
                      options={productOptions}
                      value={
                        products.find((p) => p._id === transfer.productId) ||
                        null
                      }
                      isOptionEqualToValue={(option, value) =>
                        String(option._id) === String(value?._id)
                      }
                      getOptionLabel={(p) => {
                        const code = p.productCode || "";
                        const en = p.name?.en || "";
                        const ta = p.name?.ta || "";
                        return `${code} - ${en}${ta ? " / " + ta : ""}`;
                      }}
                      onInputChange={(e, value) => setProductSearchText(value)}
                      onChange={(e, newValue) => {
                        handleFieldChange(index, {
                          target: {
                            name: "productId",
                            value: newValue?._id || "",
                          },
                        });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Product"
                          size="small"
                          placeholder="Search by code / name"
                          fullWidth
                        />
                      )}
                    />

                    {/* Availability Info */}
                    {transfer.fromShopId && transfer.productId && (
                      <Box
                        sx={{
                          mt: 1,
                          px: 2,
                          py: 1,
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          ...(getAvailableStock(
                            transfer.fromShopId,
                            transfer.productId,
                          ) > 0
                            ? {
                                backgroundColor: "success.light",
                                color: "success.dark",
                              }
                            : {
                                backgroundColor: "error.light",
                                color: "error.dark",
                              }),
                        }}
                      >
                        <Inventory fontSize="small" />
                        <Typography variant="caption" fontWeight="medium">
                          Available (remaining packs):{" "}
                          {getAvailableStock(
                            transfer.fromShopId,
                            transfer.productId,
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Quantity */}
                  <TextField
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={transfer.quantity}
                    onChange={(e) => handleFieldChange(index, e)}
                    size="small"
                    sx={{ width: 120 }}
                  />

                  {/* Row Actions */}
                  <Box>
                    {formData.transfers.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => removeTransferRow(index)}
                        title="Remove Row"
                        sx={{ mr: 1 }}
                      >
                        <RemoveCircle />
                      </IconButton>
                    )}

                    {index === formData.transfers.length - 1 && (
                      <IconButton
                        color="primary"
                        onClick={addTransferRow}
                        title="Add Row"
                      >
                        <AddCircle />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Submit */}
          <Box
            sx={{
              display: "flex",
              justifyContent: { xs: "stretch", sm: "flex-end" },
              mt: 2,
            }}
          >
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={
                loading ||
                formData.transfers.some(
                  (t) =>
                    !t.fromShopId || !t.toShopId || !t.productId || !t.quantity,
                )
              }
              fullWidth={isXs}
              sx={{
                minWidth: { xs: "100%", sm: 160 },
                height: 55,
                maxWidth: { sm: 240 },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : currentUser?.role === "admin" ? (
                "Transfer Now"
              ) : (
                "Request Transfer"
              )}
            </Button>
          </Box>
        </Box>
      </form>
    </Paper>
  );
};

export default StockTransfer;
