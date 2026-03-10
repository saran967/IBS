import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Typography,
  Grid,
  Paper,
  Dialog,
  DialogContent,
  DialogTitle,
  Autocomplete,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../../utils/customFetch";

import VendorForm from "../../VendorForm";
import getLocalizedText from "../../../utils/getLocalizedText";
import { useParams } from "react-router-dom";

export default function PurchaseForm({ onSuccess }) {
  const { lang = "en" } = useParams();

  const [vendors, setVendors] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openVendorModal, setOpenVendorModal] = useState(false);

  const [productOptions, setProductOptions] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [product, setProduct] = useState(null);

  const [godownsByShop, setGodownsByShop] = useState({});

  //  Purchase Type + SKU
  const [purchaseType, setPurchaseType] = useState("SKU"); // SKU / LOOSE
  const [skuId, setSkuId] = useState("");
  const [skuOptions, setSkuOptions] = useState([]);

  const [formData, setFormData] = useState({
    vendor: "",
    totalPacks: "", //  only for SKU
    baseQty: "", //  only for Loose
    unitPrice: "",
    totalAmount: "",
  });

  const [showTransport, setShowTransport] = useState(false);

  const [transport, setTransport] = useState({
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    transportAgency: "",
    remarks: "",
    destination: "",
  });

  const refs = useRef({
    vendor: React.createRef(),
    totalPacks: React.createRef(),
    baseQty: React.createRef(),
    unitPrice: React.createRef(),
    saveBtn: React.createRef(),
  });

  //  Product Search API
  const searchProductAPI = async (text) => {
    if (!text || text.length < 2) {
      setProductOptions([]);
      return;
    }

    setProductLoading(true);
    try {
      const res = await customFetch.get(
        `/product/search?q=${encodeURIComponent(text)}`,
      );
      setProductOptions(res.data.products || []);
    } finally {
      setProductLoading(false);
    }
  };

  //  Load Vendors + Shops + Godowns
  useEffect(() => {
    const fetchList = async () => {
      try {
        const [vendorRes, shopRes] = await Promise.all([
          customFetch.get("/vendors"),
          customFetch.get("/shops"),
        ]);

        const fetchedVendors = vendorRes.data?.vendors || [];
        const fetchedShops = shopRes.data?.shops || shopRes.data || [];

        setVendors(fetchedVendors);
        setShops(fetchedShops);

        const godownData = {};
        await Promise.all(
          fetchedShops.map(async (shop) => {
            const g = await customFetch.get(`/godowns/shop/${shop._id}`);
            godownData[shop._id] = g.data?.godowns || [];
          }),
        );

        setGodownsByShop(godownData);

        // refs for navigation
        fetchedShops.forEach((shop, shopIndex) => {
          refs.current[`shop_${shopIndex}`] = React.createRef();
          godownData[shop._id].forEach((g, gi) => {
            refs.current[`gd_${shop._id}_${gi}`] = React.createRef();
          });
        });
      } catch (err) {
        toast.error("Failed to load vendors, shops, or godowns");
      }
    };

    fetchList();
  }, []);

  //  Fetch SKU list when product selected
  useEffect(() => {
    const fetchSkus = async () => {
      try {
        if (!product?._id) {
          setSkuOptions([]);
          setSkuId("");
          return;
        }

        const res = await customFetch.get(
          `/retail-skus/product/${product._id}`,
        );
        setSkuOptions(res.data?.data || []);
        setSkuId(""); // reset when product changes
      } catch (err) {
        setSkuOptions([]);
        setSkuId("");
      }
    };

    fetchSkus();
  }, [product]);

  //  Enter navigation handling
  const handleKeyDown = async (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  };

  //  Global Shortcut for Last Purchase Price
  useEffect(() => {
    const handleGlobalShortcut = (e) => {
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (product) {
          toast.info(`Last Purchase Price for ${product.name?.en || product.productCode}: ₹${product.purchasePrice || 0}`, { autoClose: 3000 });
        } else {
          toast.info("Select a product to view its last purchase price.");
        }
      }
    };
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [product]);

  //  convert baseQty for loose calculation
  const getLooseEffectiveQty = (baseQty, baseUnitType) => {
    const qty = Number(baseQty || 0);

    // Price will be entered as ₹ per KG / LTR
    if (String(baseUnitType).toUpperCase() === "G") return qty / 1000; // grams → kg
    if (String(baseUnitType).toUpperCase() === "ML") return qty / 1000; // ml → ltr

    // PCS no change
    return qty;
  };
  //  Convert UI qty (KG/LTR/PCS) -> BASE qty (G/ML/PCS)
  const toBaseQty = (uiQty, baseUnitType) => {
    const qty = Number(uiQty || 0);

    if (String(baseUnitType).toUpperCase() === "G") return qty * 1000; // KG -> G
    if (String(baseUnitType).toUpperCase() === "ML") return qty * 1000; // LTR -> ML
    return qty; // PCS
  };

  //  Convert BASE qty (G/ML/PCS) -> UI qty (KG/LTR/PCS)
  const toUiQty = (baseQty, baseUnitType) => {
    const qty = Number(baseQty || 0);

    if (String(baseUnitType).toUpperCase() === "G") return qty / 1000; // G -> KG
    if (String(baseUnitType).toUpperCase() === "ML") return qty / 1000; // ML -> LTR
    return qty; // PCS
  };
  //  Auto calculate amount (SKU uses packs, Loose uses baseQty)
  const recalcTotalAmount = (data) => {
    const price = Number(data.unitPrice || 0);

    if (purchaseType === "SKU") {
      const packs = Number(data.totalPacks || 0);
      return (packs * price).toFixed(2);
    } else {
      const uiQty = Number(data.baseQty || 0);
      const baseType = product?.baseUnitType || "G";

      //  for loose ui input is KG/LTR, price is also per KG/LTR
      return (uiQty * price).toFixed(2);
    }
  };

  //  Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    const up = { ...formData, [name]: value };
    up.totalAmount = recalcTotalAmount(up);

    setFormData(up);
  };
  const getUiUnitLabel = (p) => {
    const base = String(p?.baseUnitType || "G").toUpperCase();
    if (base === "G") return "KG";
    if (base === "ML") return "LTR";
    return "PCS";
  };
  //  Submit Purchase
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor) return toast.error("Select vendor");
    if (!product) return toast.error("Select product");
    if (!formData.unitPrice || Number(formData.unitPrice) <= 0)
      return toast.error("Unit price must be > 0");

    //  SKU validations
    if (purchaseType === "SKU") {
      if (!skuId) return toast.error("Select SKU");
      if (!formData.totalPacks || Number(formData.totalPacks) <= 0)
        return toast.error("Total packs must be > 0");
    }

    //  Loose validations
    if (purchaseType === "LOOSE") {
      if (!formData.baseQty || Number(formData.baseQty) <= 0)
        return toast.error("Base Qty must be > 0");
    }

    //  Build splits
    let splits = [];
    let sumSplits = 0;

    shops.forEach((shop, shopIndex) => {
      const value = Number(formData[`shop_${shopIndex}`]) || 0;

      if (value > 0) {
        sumSplits += value;
        splits.push({
          type: "shop",
          id: shop._id,
          ...(purchaseType === "SKU"
            ? { packs: value }
            : {
              baseQty: toBaseQty(value, product?.baseUnitType || "G"),
            }),
        });
      }

      godownsByShop[shop._id]?.forEach((g, gi) => {
        const gValue = Number(formData[`gd_${shop._id}_${gi}`]) || 0;

        if (gValue > 0) {
          sumSplits += gValue;
          splits.push({
            type: "godown",
            id: g._id,
            ...(purchaseType === "SKU"
              ? { packs: gValue }
              : { baseQty: toBaseQty(gValue, product?.baseUnitType || "G") }),
          });
        }
      });
    });

    //  Split validation
    if (product?.maintainInventory !== false) {
      if (purchaseType === "SKU") {
        const totalEntered = Number(formData.totalPacks) || 0;
        if (sumSplits !== totalEntered) {
          return toast.error(
            `Total Packs (${totalEntered}) must equal split packs (${sumSplits})`,
          );
        }
      } else {
        const baseType = product?.baseUnitType || "G";

        //  total entered in BASE
        const enteredBaseQty = toBaseQty(formData.baseQty, baseType);

        //  sum split also convert each field to BASE
        const splitBaseQty = splits.reduce((sum, s) => {
          if (s.type === "shop" || s.type === "godown") {
            return sum + Number(s.baseQty || 0);
          }
          return sum;
        }, 0);

        if (
          Number(splitBaseQty.toFixed(2)) !== Number(enteredBaseQty.toFixed(2))
        ) {
          return toast.error(
            `Base Qty mismatch: Entered ${toUiQty(enteredBaseQty, baseType)} ${baseType === "G" ? "KG" : baseType === "ML" ? "LTR" : "PCS"
            } must equal split total ${toUiQty(splitBaseQty, baseType)}`,
          );
        }
      }
    }

    //  Payload (Backend handles SKU baseQty using skuId)
    const payload = {
      vendorId: formData.vendor,
      productCode: product.productCode,

      purchaseType, // optional (backend can detect using skuId)

      skuId: purchaseType === "SKU" ? skuId : null,

      totalPacks: purchaseType === "SKU" ? Number(formData.totalPacks) : 0,
      baseQty:
        purchaseType === "LOOSE"
          ? toBaseQty(formData.baseQty, product?.baseUnitType || "G")
          : 0,

      unitPrice: Number(formData.unitPrice),
      splits,
      transport: showTransport ? transport : {},
    };

    try {
      setLoading(true);
      await customFetch.post("/purchase", payload);

      toast.success("Purchase added successfully");

      setProduct(null);
      setSkuId("");
      setSkuOptions([]);

      setPurchaseType("SKU");

      setFormData({
        vendor: "",
        totalPacks: "",
        baseQty: "",
        unitPrice: "",
        totalAmount: "",
      });

      setTransport({
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        transportAgency: "",
        remarks: "",
        destination: "",
      });

      setShowTransport(false);
      refs.current.vendor?.current?.focus();

      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Error saving purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        Add Purchase
      </Typography>

      {/* ---------------------- PRODUCT + VENDOR ---------------------- */}
      <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* PRODUCT */}
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              options={productOptions}
              loading={productLoading}
              value={product}
              isOptionEqualToValue={(o, v) => String(o?._id) === String(v?._id)}
              getOptionLabel={(p) => {
                const code = p.productCode || "";
                const en = p.name?.en || "";
                const ta = p.name?.ta || "";
                return `${code} - ${en}${ta ? " / " + ta : ""}`;
              }}
              filterOptions={(x) => x}
              onInputChange={(_, value) => searchProductAPI(value)}
              onChange={(_, value) => setProduct(value || null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product *"
                  size="small"
                  placeholder="Search by code / name"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {productLoading && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* VENDOR */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Vendor *"
              name="vendor"
              value={formData.vendor}
              onChange={(e) => {
                if (e.target.value === "new") setOpenVendorModal(true);
                else handleChange(e);
              }}
              onKeyDown={(e) =>
                handleKeyDown(
                  e,
                  purchaseType === "SKU"
                    ? refs.current.totalPacks
                    : refs.current.baseQty,
                )
              }
              inputRef={refs.current.vendor}
              size="small"
            >
              <MenuItem value="new" sx={{ fontWeight: 600, color: "green" }}>
                + Add Vendor
              </MenuItem>

              {vendors.map((v) => (
                <MenuItem key={v._id} value={v._id}>
                  {getLocalizedText(v.name, lang)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/*  Purchase Type */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Purchase Type"
              value={purchaseType}
              onChange={(e) => {
                const val = e.target.value;
                setPurchaseType(val);
                setSkuId("");
                setFormData((prev) => ({
                  ...prev,
                  totalPacks: "",
                  baseQty: "",
                  totalAmount: "",
                }));
              }}
              disabled={!product}
            >
              <MenuItem value="SKU">SKU / PACK</MenuItem>
              <MenuItem value="LOOSE">LOOSE</MenuItem>
            </TextField>
          </Grid>

          {/*  SKU dropdown */}
          {purchaseType === "SKU" && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select SKU *"
                value={skuId}
                onChange={(e) => setSkuId(e.target.value)}
                disabled={!product}
              >
                <MenuItem value="">Select</MenuItem>
                {skuOptions.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.sellQty} {s.sellUnit} (Base: {s.baseQty})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {/*  Total Packs (SKU) */}
          {purchaseType === "SKU" && (
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Total Packs *"
                name="totalPacks"
                type="number"
                value={formData.totalPacks}
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleKeyDown(
                    e,
                    refs.current.unitPrice || refs.current.saveBtn,
                  )
                }
                inputRef={refs.current.totalPacks}
                fullWidth
                size="small"
              />
            </Grid>
          )}

          {/*  Base Qty (LOOSE) */}
          {purchaseType === "LOOSE" && (
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label={`Quantity (${getUiUnitLabel(product)}) *`}
                helperText={`Enter in ${getUiUnitLabel(product)} (eg: 1, 2.5)`}
                name="baseQty"
                type="number"
                value={formData.baseQty}
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleKeyDown(
                    e,
                    refs.current.unitPrice || refs.current.saveBtn,
                  )
                }
                inputRef={refs.current.baseQty}
                fullWidth
                size="small"
              />
            </Grid>
          )}

          {/* UNIT PRICE */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label={
                purchaseType === "SKU"
                  ? "Unit Price (₹ per pack) *"
                  : `Unit Price (₹ per ${getUiUnitLabel(product)}) *`
              }
              name="unitPrice"
              type="number"
              value={formData.unitPrice}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, refs.current.saveBtn)}
              inputRef={refs.current.unitPrice}
              fullWidth
              size="small"
            />
          </Grid>

          {/* TOTAL AMOUNT */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Total Amount (₹)"
              name="totalAmount"
              value={formData.totalAmount}
              disabled
              fullWidth
              size="small"
            />
          </Grid>

          {/* Transport button */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              fullWidth
              size="medium"
              onClick={() => setShowTransport(!showTransport)}
            >
              {showTransport
                ? "Hide Transport Details"
                : "Add Transport Details"}
            </Button>
          </Grid>

          {/* Transport fields */}
          {showTransport && (
            <Box
              sx={{ mt: 2, p: 2, border: "1px solid #ccc", borderRadius: 2 }}
            >
              <Typography variant="subtitle1" mb={1}>
                Transport Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Vehicle Number"
                    fullWidth
                    size="small"
                    value={transport.vehicleNumber}
                    onChange={(e) =>
                      setTransport({
                        ...transport,
                        vehicleNumber: e.target.value,
                      })
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Driver Name"
                    fullWidth
                    size="small"
                    value={transport.driverName}
                    onChange={(e) =>
                      setTransport({ ...transport, driverName: e.target.value })
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Driver Phone"
                    fullWidth
                    size="small"
                    value={transport.driverPhone}
                    onChange={(e) =>
                      setTransport({
                        ...transport,
                        driverPhone: e.target.value,
                      })
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Transport Agency"
                    fullWidth
                    size="small"
                    value={transport.transportAgency}
                    onChange={(e) =>
                      setTransport({
                        ...transport,
                        transportAgency: e.target.value,
                      })
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Destination"
                    fullWidth
                    size="small"
                    value={transport.destination}
                    onChange={(e) =>
                      setTransport({
                        ...transport,
                        destination: e.target.value,
                      })
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Remarks"
                    fullWidth
                    size="small"
                    value={transport.remarks}
                    multiline
                    rows={2}
                    onChange={(e) =>
                      setTransport({ ...transport, remarks: e.target.value })
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* SAVE BUTTON */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              ref={refs.current.saveBtn}
            >
              {loading ? <CircularProgress size={22} /> : "Save Purchase"}
            </Button>
          </Grid>
        </Grid>

        {product && (
          <Box sx={{ mt: 2, p: 1.5, background: "#fafafa", borderRadius: 2 }}>
            <Typography fontWeight={600}>
              {product.name?.en || product.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Base Unit: {product.baseUnitType || "G"}
            </Typography>
          </Box>
        )}
      </Box>

      {/* ---------------------- SHOP & GODOWN GRID UI ---------------------- */}
      {product?.maintainInventory !== false && (
        <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 3 }}>
          <Typography variant="subtitle2" mb={1}>
            Split Quantity to Shops / Godowns
          </Typography>

          <Grid container spacing={2}>
            {shops.map((shop, shopIndex) => (
              <Grid item xs={12} sm={6} md={3} key={shop._id}>
                <TextField
                  fullWidth
                  label={`${shop.name?.en || shop.name} (Shop) ${purchaseType === "SKU"
                    ? "Packs"
                    : `Qty (${getUiUnitLabel(product)})`
                    }`}
                  name={`shop_${shopIndex}`}
                  value={formData[`shop_${shopIndex}`] || ""}
                  onChange={handleChange}
                  size="small"
                  inputRef={refs.current[`shop_${shopIndex}`]}
                />
              </Grid>
            ))}
          </Grid>

          {(() => {
            const maxGodowns = Math.max(
              ...shops.map((s) => godownsByShop[s._id]?.length || 0),
            );

            return Array.from({ length: maxGodowns }).map((_, rowIndex) => (
              <Grid container spacing={2} sx={{ mt: 1 }} key={rowIndex}>
                {shops.map((shop) => {
                  const gList = godownsByShop[shop._id] || [];
                  const godown = gList[rowIndex];

                  if (!godown)
                    return (
                      <Grid
                        item
                        xs={6}
                        sm={3}
                        md={3}
                        key={shop._id + "_" + rowIndex}
                      />
                    );

                  return (
                    <Grid item xs={12} sm={6} md={3} key={godown._id}>
                      <TextField
                        fullWidth
                        label={`${godown.name?.en || godown.name} (Godown) ${purchaseType === "SKU"
                          ? "Packs"
                          : `Qty (${getUiUnitLabel(product)})`
                          }`}
                        name={`gd_${shop._id}_${rowIndex}`}
                        value={formData[`gd_${shop._id}_${rowIndex}`] || ""}
                        onChange={handleChange}
                        size="small"
                        inputRef={refs.current[`gd_${shop._id}_${rowIndex}`]}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            ));
          })()}
        </Box>
      )}

      {/* ---------------------- ADD VENDOR POPUP ---------------------- */}
      <Dialog
        open={openVendorModal}
        onClose={() => setOpenVendorModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Vendor</DialogTitle>
        <DialogContent dividers>
          <VendorForm
            onSuccess={async (vendor) => {
              setOpenVendorModal(false);

              const res = await customFetch.get("/vendors");
              setVendors(res.data?.vendors || []);

              setFormData((prev) => ({ ...prev, vendor: vendor._id }));
            }}
          />
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
