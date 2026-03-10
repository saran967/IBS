import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Autocomplete,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale";
import { format } from "date-fns";
import { toast } from "react-toastify";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import customFetch from "../../utils/customFetch.js";
import CustomerForm from "../Admin/CustomerForm.jsx";
import { useParams } from "react-router-dom";
import getLocalizedText from "../../utils/getLocalizedText.js";

const rowsPerPage = 5;

const OrderForm = ({
  onOrderSubmit,
  orders = [],
  onConfirm,
  onCancel,
  onApprove,
  onPickupEdit,
  activeTab,
  setActiveTab,
}) => {
  const { lang = "en" } = useParams();

  const [customers, setCustomers] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [productOptions, setProductOptions] = useState([]);
  const [productSearchText, setProductSearchText] = useState("");
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

  const [orderRows, setOrderRows] = useState([
    {
      customer: null,
      shopId: "",
      locationObj: null,
      // product: "",
      product: null, // store object
      productId: "", // store id separately

      quantity: "",
      pickupDate: null,
      availablePacks: null,
      availableWeight: null,
      unit: "",
    },
  ]);

  const [localOrders, setLocalOrders] = useState(orders);
  const [tabIndex, setTabIndex] = useState(activeTab || 0);
  const [requestedPage, setRequestedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [confirmedPage, setConfirmedPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);

  const [godowns, setGodowns] = useState([]);
  const [combinedLocations, setCombinedLocations] = useState([]); // shop + godown list

  const [openCustomerModal, setOpenCustomerModal] = useState(false);

  useEffect(() => setLocalOrders(orders), [orders]);
  useEffect(() => {
    if (typeof activeTab === "number" && activeTab !== tabIndex)
      setTabIndex(activeTab);
  }, [activeTab]);

  // 🔄 Fetch dropdowns + current user
  const fetchAllDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const me = await customFetch.get("/auth/current-user");
      const userData = me.data.user || me.data || null;
      setCurrentUser(userData);

      const [custRes, shopRes, prodRes, invRes, godownRes] = await Promise.all([
        customFetch.get("/customer"),
        customFetch.get("/shops").catch(() => customFetch.get("/shop")),
        customFetch.get("/product"),
        customFetch.get("/inventory"),
        customFetch.get("/godowns"), //  NEW
      ]);

      const customersData =
        custRes.data.data || custRes.data.customers || custRes.data || [];
      const shopsData =
        shopRes.data.data || shopRes.data.shops || shopRes.data || [];
      const productsData =
        prodRes.data.data || prodRes.data.products || prodRes.data || [];
      const inventoryData =
        invRes.data.inventory || invRes.data.data || invRes.data || [];

      const godownsData =
        godownRes.data.data || godownRes.data.godowns || godownRes.data || [];

      setGodowns(
        godownsData.map((g) => ({
          _id: g._id,
          name: g.name?.en || g.name?.ta || g.name || g.godownName,
          shopId: g.shopId?._id || g.shopId, // needed for filtering
        })),
      );

      setCustomers(customersData);
      setProducts(productsData);
      setInventory(inventoryData);

      //  For employee/subadmin - auto select shop
      if (userData && userData.role !== "admin") {
        let shopInfo = userData.shopId;
        if (typeof shopInfo === "string") {
          try {
            const res = await customFetch.get(`/shop/${shopInfo}`);
            shopInfo = res.data || res.data.data || res.data.shop || null;
          } catch {
            shopInfo = null;
          }
        }

        if (shopInfo) {
          const shopObj = {
            _id: shopInfo._id,
            name:
              shopInfo.name?.en ||
              shopInfo.name?.ta ||
              shopInfo.name ||
              shopInfo.shopName ||
              "Unnamed Shop",
          };
          setShops([shopObj]);
          const shopLocation = {
            _id: shopObj._id,
            name: shopObj.name,
            type: "Shop",
          };

          setOrderRows((prev) =>
            prev.map((row) => ({
              ...row,
              shopId: shopObj._id,
              locationObj: shopLocation,
            })),
          );
        } else setShops([]);
      } else {
        const formattedShops = shopsData.map((s) => ({
          _id: s._id,
          name: s.name?.en || s.name?.ta || s.name || s.shopName,
        }));
        setShops(formattedShops);
      }
      const formattedShops = shopsData.map((s) => ({
        _id: s._id,
        name: s.name?.en || s.name?.ta || s.name || s.shopName,
        type: "Shop",
        shopId: s._id,
      }));

      const formattedGodowns = godownsData.map((g) => ({
        _id: g._id,
        name: g.name?.en || g.name?.ta || g.name || g.godownName,
        type: "Godown",
        shopId: g.shopId?._id || g.shopId,
      }));

      let merged = [...formattedShops, ...formattedGodowns];

      // Admin → all
      if (userData?.role === "admin") {
        setCombinedLocations(merged);
      } else {
        // Employee/subadmin → only their shop + their godowns
        const userShopId =
          typeof userData.shopId === "object"
            ? userData.shopId._id
            : userData.shopId;

        const filtered = merged.filter(
          (item) => String(item.shopId) === String(userShopId),
        );

        setCombinedLocations(filtered);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch data");
    } finally {
      setLoadingDropdowns(false);
    }
  };

  useEffect(() => {
    fetchAllDropdownData();
  }, []);

  //* Update availability whenever shop/product changes
  useEffect(() => {
    const updated = orderRows.map((row) => {
      if (row.shopId && row.product && inventory.length) {
        // const found = inventory.find(
        //   (item) =>
        //     String(item?.shopId?._id || item?.shopId) === String(row.shop) &&
        //     String(item?.productId?._id || item?.productId) ===
        //       String(row.product)
        // );

        const found = inventory.find((item) => {
          const productMatch =
            String(item?.productId?._id || item?.productId) ===
            String(row.product);

          if (!productMatch) return false;

          // Shop inventory
          if (
            item.shopId &&
            String(item.shopId?._id || item.shopId) === String(row.shopId)
          ) {
            return true;
          }

          // Godown inventory
          if (
            item.godownId &&
            String(item.godownId?._id || item.godownId) === String(row.shopId)
          ) {
            return true;
          }

          return false;
        });

        const selectedProd = products.find((p) => p._id === row.product);
        return {
          ...row,
          availablePacks: found ? (found.remainingPacks ?? 0) : 0,
          availableWeight: found ? (found.remainingWeight ?? 0) : 0,
          unit: selectedProd?.unit?.en || selectedProd?.unit || "",
        };
      } else {
        return {
          ...row,
          availablePacks: null,
          availableWeight: null,
          unit: "",
        };
      }
    });
    setOrderRows(updated);
  }, [
    inventory,
    products,
    orderRows.map((r) => r.shopId + r.product).join(","),
  ]);

  //* Add & Remove rows
  const addOrderRow = () =>
    setOrderRows([
      ...orderRows,
      {
        customer: orderRows[0]?.customer || null,
        shopId:
          currentUser?.role !== "admin" && combinedLocations.length
            ? combinedLocations[0]._id
            : "",
        locationObj:
          currentUser?.role !== "admin" && combinedLocations.length
            ? combinedLocations[0]
            : null,

        product: null,
        productId: "",
        quantity: "",
        pickupDate: orderRows[0]?.pickupDate || null,
        availablePacks: null,
        availableWeight: null,
        unit: "",
      },
    ]);

  const removeOrderRow = (index) =>
    setOrderRows((prev) => prev.filter((_, i) => i !== index));

  // 🧾 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const invalid = orderRows.some(
      (r) => !r.customer || !r.shopId || !r.product || !r.quantity,
    );

    if (invalid) return toast.error("Please fill all fields!");

    const groupedOrders = {};
    for (const r of orderRows) {
      const key = `${r.customer._id}`;
      if (!groupedOrders[key]) {
        groupedOrders[key] = {
          customerId: r.customer._id,
          pickupDate: r.pickupDate
            ? new Date(r.pickupDate).toISOString()
            : undefined,
          orderItems: [],
        };
      }

      // groupedOrders[key].orderItems.push({
      //   shopId: r.shop,
      //   productId: r.product,
      //   quantity: Number(r.quantity),
      // });
      const loc = combinedLocations.find(
        (l) => String(l._id) === String(r.shopId),
      );

      if (!loc) {
        toast.error("Invalid shop / godown selected");
        return;
      }

      groupedOrders[key].orderItems.push({
        shopId: loc.type === "Shop" ? loc._id : loc.shopId, //  parent shopId of godown
        godownId: loc.type === "Godown" ? loc._id : null,
        productId: r.productId || r.product?._id, // fallback to product._id
        quantity: Number(r.quantity),
      });
    }

    const groupedArray = Object.values(groupedOrders);
    try {
      const isSaved = await onOrderSubmit(groupedArray);
      if (isSaved === false) return;
    } catch {
      return;
    }

    setOrderRows([
      {
        customer: null,
        shopId:
          currentUser?.role !== "admin" && combinedLocations.length
            ? combinedLocations[0]._id
            : "",
        locationObj:
          currentUser?.role !== "admin" && combinedLocations.length
            ? combinedLocations[0]
            : null,

        product: null,
        productId: "",
        quantity: "",
        pickupDate: null,
        availablePacks: null,
        availableWeight: null,
        unit: "",
      },
    ]);
  };

  // ✏ Edit Pickup
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const openEditDialog = (order) => {
    setEditingOrder(order);
    setEditingDate(order.pickupDate ? new Date(order.pickupDate) : null);
    setEditDialogOpen(true);
  };
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingOrder(null);
    setEditingDate(null);
  };
  const saveEditedPickupDate = async () => {
    try {
      const newDate = editingDate ? new Date(editingDate).toISOString() : null;
      await customFetch.patch(`/orders/${editingOrder._id}/pickup-date`, {
        pickupDate: newDate,
      });
      setLocalOrders((prev) =>
        prev.map((o) =>
          o._id === editingOrder._id ? { ...o, pickupDate: newDate } : o,
        ),
      );
      toast.success("Pickup date updated!");
      closeEditDialog();
      onPickupEdit?.(editingOrder);
    } catch {
      toast.error("Failed to update pickup date");
    }
  };

  const sliceForPage = (list, page) =>
    list.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const syncCommonFields = (updatedRows) => {
    const firstCustomer = updatedRows[0]?.customer || null;
    const firstPickup = updatedRows[0]?.pickupDate || null;

    return updatedRows.map((r, i) => {
      if (i === 0) return r;

      return {
        ...r,
        customer: firstCustomer,
        pickupDate: firstPickup,
      };
    });
  };

  // 🧮 Render Orders Table
  const renderOrders = (data, label, page, setPage) => {
    const isAdmin = currentUser?.role === "admin";
    const grouped = {};
    for (const order of data) {
      const key = `${order.customerId?._id || order.customerId}_${order.orderNumber
        }`;
      if (!grouped[key]) {
        grouped[key] = {
          ...order,
          shops: new Set(),
          allProducts: [],
        };
      }
      order.orderItems?.forEach((item) => {
        if (item.godownId || item.shopId) {
          grouped[key].shops.add(
            item.godownId?.name?.en ||
            item.godownId?.name ||
            item.shopId?.name?.en ||
            item.shopId?.name ||
            "Unknown Location",
          );
        }

        grouped[key].allProducts.push(
          item.productId?.name?.en || item.productId?.name || "Unnamed",
        );
      });
    }
    const mergedOrders = Object.values(grouped);

    return (
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {label} Orders
        </Typography>
        {mergedOrders.length === 0 ? (
          <Typography align="center">
            No {label.toLowerCase()} orders.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Shops</TableCell>
                  <TableCell>Products</TableCell>
                  <TableCell>Pickup Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sliceForPage(mergedOrders, page).map((order, idx) => (
                  <TableRow key={order._id}>
                    <TableCell>{(page - 1) * rowsPerPage + idx + 1}</TableCell>
                    <TableCell>
                      {getLocalizedText(order.customerId?.customerName, lang) ||
                        "—"}
                    </TableCell>

                    <TableCell>{[...order.shops].join(", ")}</TableCell>
                    <TableCell>
                      {order.allProducts.length > 1
                        ? `${order.allProducts.length} products`
                        : order.allProducts.join(", ")}
                    </TableCell>
                    <TableCell>
                      {order.pickupDate
                        ? format(new Date(order.pickupDate), "dd/MM/yyyy")
                        : "—"}
                      {isAdmin && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openEditDialog(order)}
                          sx={{ ml: 1 }}
                        >
                          <EditCalendarIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.orderStatus}
                        color={
                          order.orderStatus === "requested"
                            ? "info"
                            : order.orderStatus === "pending"
                              ? "warning"
                              : ["confirmed", "fulfilled"].includes(
                                order.orderStatus,
                              )
                                ? "success"
                                : "error"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Stack direction="row" spacing={1}>
                          {order.orderStatus === "requested" && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => onApprove(order._id)}
                            >
                              Approve
                            </Button>
                          )}
                          {order.orderStatus === "pending" && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => onConfirm(order._id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => onCancel(order._id)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Box>
        {/*  Order Creation Form */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Create Multiple Orders
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            {orderRows.map((row, index) => (
              <Box
                key={index}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                  position: "relative",
                }}
              >
                {orderRows.length > 1 && (
                  <IconButton
                    color="error"
                    onClick={() => removeOrderRow(index)}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}

                <Grid container spacing={2}>
                  {/* Customer */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      sx={{ minWidth: 150 }}
                      options={[
                        { _id: "new", customerName: "+ Add New Customer" },
                        ...customers,
                      ]}
                      getOptionLabel={(option) =>
                        option._id === "new"
                          ? option.customerName
                          : getLocalizedText(option.customerName, lang)
                      }
                      isOptionEqualToValue={(option, value) => {
                        if (!value) return false;
                        return option._id === value._id;
                      }}
                      value={row.customer}
                      onChange={(_, newValue) => {
                        if (newValue?._id === "new") {
                          setOpenCustomerModal(true);
                          return;
                        }

                        const updated = [...orderRows];
                        updated[index].customer = newValue;

                        //  if customer selected in first row → apply to all rows
                        const synced = syncCommonFields(updated);
                        setOrderRows(synced);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Customer *" size="small" />
                      )}
                      renderOption={(props, option) => {
                        // Use _id as key to avoid duplicate key warning if names are same
                        const { key, ...otherProps } = props;
                        return (
                          <li key={option._id || option.customerName} {...otherProps}>
                            {option._id === "new"
                              ? option.customerName
                              : getLocalizedText(option.customerName, lang)}
                          </li>
                        );
                      }}
                    />
                  </Grid>

                  {/* Shop */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      sx={{ minWidth: 150 }}
                      options={combinedLocations}
                      getOptionLabel={(opt) => `${opt.name} (${opt.type})`}
                      value={
                        row.locationObj ||
                        combinedLocations.find(
                          (l) => String(l._id) === String(row.shopId),
                        ) ||
                        null
                      }
                      isOptionEqualToValue={(option, value) =>
                        String(option._id) === String(value?._id)
                      }
                      onChange={(_, newValue) => {
                        const updated = [...orderRows];
                        updated[index] = {
                          ...updated[index],
                          shopId: newValue ? newValue._id : "",
                          locationObj: newValue,
                        };
                        setOrderRows(updated);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Shop / Godown *"
                          size="small"
                          placeholder="Search shop or godown"
                        />
                      )}
                    />
                  </Grid>

                  {/* Product */}
                  {/* Product (Search by Code / English / Tamil) */}
                  {/* <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      options={productOptions}
                      value={
                        productOptions.find((p) => p._id === row.product) ||
                        products.find((p) => p._id === row.product) ||
                        null
                      }
                      isOptionEqualToValue={(option, value) =>
                        String(option._id) === String(value?._id)
                      }
                      getOptionLabel={(option) => {
                        const code = option.productCode || "";
                        const en = option.name?.en || "";
                        const ta = option.name?.ta || "";
                        return `${code} - ${en}${ta ? " / " + ta : ""}`;
                      }}
                      onInputChange={(e, value) => setProductSearchText(value)}
                      onChange={(_, newValue) => {
                        const updated = [...orderRows];
                        updated[index].product = newValue ? newValue._id : "";
                        setOrderRows(updated);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Product *"
                          size="small"
                          placeholder="Search by code / name"
                        />
                      )}
                    />

                    {/* Stock Display */}
                  {/* {row.availablePacks !== null && (
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          label={`Packs: ${row.availablePacks}`}
                          color={row.availablePacks > 0 ? "success" : "error"}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          label={`Weight: ${row.availableWeight ?? 0} ${
                            row.unit
                          }`}
                          color={row.availableWeight > 0 ? "success" : "error"}
                          size="small"
                        />
                      </Box>
                    )}
                  </Grid>  */}

                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete
                      options={productOptions}
                      value={row.product || null}
                      isOptionEqualToValue={(option, value) =>
                        String(option._id) === String(value?._id)
                      }
                      getOptionLabel={(option) => {
                        const code = option.productCode || "";
                        const en = option.name?.en || "";
                        const ta = option.name?.ta || "";
                        return `${code} - ${en}${ta ? " / " + ta : ""}`;
                      }}
                      onInputChange={(e, value) => setProductSearchText(value)}
                      onChange={(_, newValue) => {
                        const updated = [...orderRows];
                        updated[index].product = newValue; //  store full object
                        updated[index].productId = newValue ? newValue._id : ""; //  store id
                        setOrderRows(updated);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Product"
                          size="small"
                          placeholder="Search by code / name"
                        />
                      )}
                    />
                  </Grid>

                  {/* Quantity */}
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      sx={{ minWidth: 150 }}
                      label="Quantity *"
                      type="number"
                      value={row.quantity}
                      onChange={(e) => {
                        const updated = [...orderRows];
                        updated[index].quantity = e.target.value;
                        setOrderRows(updated);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();

                          // Only add new row if this is the LAST row
                          if (index === orderRows.length - 1) {
                            addOrderRow();
                          }
                        }
                      }}
                      size="small"
                    />
                  </Grid>

                  {/* Pickup Date */}
                  <Grid item xs={12} sm={6} md={3}>
                    <DatePicker
                      size="small"
                      label="Pickup Date"
                      value={row.pickupDate}
                      onChange={(d) => {
                        const updated = [...orderRows];
                        updated[index].pickupDate = d;

                        //  if pickupDate chosen in first row → apply to all rows
                        const synced = syncCommonFields(updated);
                        setOrderRows(synced);
                      }}
                      inputFormat="dd/MM/yyyy"
                      renderInput={(params) => (
                        <TextField
                          sx={{ width: 150 }}
                          size="small"
                          {...params}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}

            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={addOrderRow}
              sx={{ mb: 2 }}
            >
              Add Another Product
            </Button>

            <Button type="submit" variant="contained" fullWidth>
              Submit Orders
            </Button>
          </Box>
        </Paper>

        {/*  Tabs + Orders List */}
        <Paper elevation={2} sx={{ mb: 2 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, i) => {
              setTabIndex(i);
              setActiveTab?.(i);
            }}
            variant="fullWidth"
          >
            {currentUser?.role === "admin" && (
              <Tab
                label={`Requested (${localOrders.filter((o) => o.orderStatus === "requested")
                  .length
                  })`}
              />
            )}
            <Tab
              label={`Pending (${localOrders.filter((o) => o.orderStatus === "pending").length
                })`}
            />
            <Tab
              label={`Confirmed (${localOrders.filter((o) =>
                ["confirmed", "fulfilled"].includes(o.orderStatus),
              ).length
                })`}
            />
            <Tab
              label={`Cancelled (${localOrders.filter((o) => o.orderStatus === "cancelled").length
                })`}
            />
          </Tabs>
        </Paper>

        {/*  Render All Order Tabs */}
        {currentUser?.role === "admin" &&
          tabIndex === 0 &&
          renderOrders(
            localOrders.filter((o) => o.orderStatus === "requested"),
            "Requested",
            requestedPage,
            setRequestedPage,
          )}
        {tabIndex === (currentUser?.role === "admin" ? 1 : 0) &&
          renderOrders(
            localOrders.filter((o) => o.orderStatus === "pending"),
            "Pending",
            pendingPage,
            setPendingPage,
          )}
        {tabIndex === (currentUser?.role === "admin" ? 2 : 1) &&
          renderOrders(
            localOrders.filter((o) =>
              ["confirmed", "fulfilled"].includes(o.orderStatus),
            ),
            "Confirmed",
            confirmedPage,
            setConfirmedPage,
          )}
        {tabIndex === (currentUser?.role === "admin" ? 3 : 2) &&
          renderOrders(
            localOrders.filter((o) => o.orderStatus === "cancelled"),
            "Cancelled",
            cancelledPage,
            setCancelledPage,
          )}

        {/* ✏ Edit Pickup Modal */}
        <Dialog open={editDialogOpen} onClose={closeEditDialog}>
          <DialogTitle>Edit Pickup Date</DialogTitle>
          <DialogContent>
            <DatePicker
              label="Pickup Date"
              value={editingDate}
              onChange={(d) => setEditingDate(d)}
              inputFormat="dd/MM/yyyy"
              renderInput={(params) => (
                <TextField fullWidth size="small" {...params} sx={{ mt: 1 }} />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={saveEditedPickupDate} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* ➕ Add Customer Modal */}
        <Dialog
          open={openCustomerModal}
          onClose={() => setOpenCustomerModal(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogContent dividers>
            <CustomerForm
              onSuccess={async () => {
                await fetchAllDropdownData();
                setOpenCustomerModal(false);
                toast.success("Customer added successfully!");
              }}
            />
          </DialogContent>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default OrderForm;
