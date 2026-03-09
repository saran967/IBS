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
import CustomerForm from "../../components/Admin/CustomerForm.jsx";
import customFetch from "../../utils/customFetch.js";

import { useLocation } from "react-router-dom";

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
  const [customers, setCustomers] = useState([]);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [orderRows, setOrderRows] = useState([
    {
      customer: null,
      shop: "",
      product: "",
      quantity: "",
      price: "",
      pickupDate: null,
      availablePacks: null,
      availableWeight: null,
      unit: "",
      companyItems: [],
    },
  ]);

  const [localOrders, setLocalOrders] = useState(orders);
  const [tabIndex, setTabIndex] = useState(activeTab || 0);
  const [requestedPage, setRequestedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [confirmedPage, setConfirmedPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);

  const [openCustomerModal, setOpenCustomerModal] = useState(false);

  const { state } = useLocation();
  const prefillOrder = state?.prefillOrder || null;

  console.log(prefillOrder, "prefilled data fetched");

  const fetchAllDropdownData = async () => {
    setLoadingDropdowns(true);
    try {
      const me = await customFetch.get("/auth/current-user");
      const userData = me.data.user || me.data || null;

      const [custRes, shopRes, prodRes, invRes] = await Promise.all([
        customFetch.get("/customer"),
        customFetch.get("/shops").catch(() => customFetch.get("/shop")),
        customFetch.get("/product"),
        customFetch.get("/inventory"),
      ]);

      const customersData =
        custRes.data.data || custRes.data.customers || custRes.data || [];
      const shopsData =
        shopRes.data.data || shopRes.data.shops || shopRes.data || [];
      const productsData =
        prodRes.data.data || prodRes.data.products || prodRes.data || [];
      const inventoryData =
        invRes.data.inventory || invRes.data.data || invRes.data || [];

      setCurrentUser(userData);
      setCustomers(customersData);
      setProducts(productsData);
      setInventory(inventoryData);

      let usableShops = [];

      // Employee / subadmin: restrict shops
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
          usableShops = [shopObj];
          setShops(usableShops);
        } else {
          usableShops = [];
          setShops([]);
        }
      } else {
        const formattedShops = shopsData.map((s) => ({
          _id: s._id,
          name: s.name?.en || s.name?.ta || s.name || s.shopName,
        }));
        usableShops = formattedShops;
        setShops(formattedShops);
      }

      //  APPLY PREFILL HERE (after we have user + customers + shops)
      if (prefillOrder) {
        const customerObj =
          customersData.find((c) => c._id === prefillOrder.customer) || null;

        const defaultShopId =
          userData && userData.role !== "admin" && usableShops.length
            ? usableShops[0]._id
            : "";

        // support both:
        // 1) new:  { customer, items: [{product, quantity}, ...] }
        // 2) old:  { customer, product, quantity }
        const itemsToUse =
          Array.isArray(prefillOrder.items) && prefillOrder.items.length
            ? prefillOrder.items
            : [
                {
                  product: prefillOrder.product,
                  quantity: prefillOrder.quantity,
                },
              ].filter((it) => it.product); // ignore empty

        const rows =
          itemsToUse.length > 0
            ? itemsToUse.map((it) => ({
                customer: customerObj,
                shop: defaultShopId,
                product: it.product || "",
                quantity:
                  it.quantity !== undefined && it.quantity !== null
                    ? String(it.quantity)
                    : "",
                price:
                  it.price !== undefined && it.price !== null
                    ? Number(it.price)
                    : "",
                pickupDate: null,
                availablePacks: null,
                availableWeight: null,
                unit: "",
                companyItems: Array.isArray(it.companyItems)
                  ? it.companyItems
                  : [],
              }))
            : [
                {
                  customer: customerObj,
                  shop: defaultShopId,
                  product: "",
                  quantity: "",
                  pickupDate: null,
                  availablePacks: null,
                  availableWeight: null,
                  unit: "",
                  companyItems: [],
                },
              ];

        setOrderRows(rows);
      } else {
        // default empty row if no prefill
        setOrderRows([
          {
            customer: null,
            shop:
              userData && userData.role !== "admin" && usableShops.length
                ? usableShops[0]._id
                : "",
            product: "",
            quantity: "",
            pickupDate: null,
            availablePacks: null,
            availableWeight: null,
            unit: "",
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch data");
    } finally {
      setLoadingDropdowns(false);
    }
  };

  useEffect(() => setLocalOrders(orders), [orders]);
  useEffect(() => {
    if (typeof activeTab === "number" && activeTab !== tabIndex)
      setTabIndex(activeTab);
  }, [activeTab]);

  useEffect(() => {
    fetchAllDropdownData();
  }, []);

  // 🔁 Update availability whenever shop/product changes
  useEffect(() => {
    const updated = orderRows.map((row) => {
      if (row.shop && row.product && inventory.length) {
        const found = inventory.find(
          (item) =>
            String(item?.shopId?._id || item?.shopId) === String(row.shop) &&
            String(item?.productId?._id || item?.productId) ===
              String(row.product),
        );
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
  }, [inventory, products, orderRows.map((r) => r.shop + r.product).join(",")]);

  // ➕ Add & Remove rows
  const addOrderRow = () =>
    setOrderRows([
      ...orderRows,
      {
        customer: orderRows[0]?.customer || null,
        shop: currentUser?.role !== "admin" && shops.length ? shops[0]._id : "",
        product: "",
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
  const handleSubmit = (e) => {
    console.log("page get loaded");
    e.preventDefault();
    const invalid = orderRows.some(
      (r) => !r.customer || !r.shop || !r.product || !r.quantity,
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

      groupedOrders[key].orderItems.push({
        shopId: r.shop,
        productId: r.product,
        quantity: Number(r.quantity),
        price: Number(r.price) || 0,
        companyItems: r.companyItems.map((ci) => ({
          companyName: ci.companyName,
          quantity: Number(ci.quantity),
        })),
      });
    }
    const groupedArray = Object.values(groupedOrders);
    console.log(groupedArray, "groupedArray values");
    onOrderSubmit(groupedArray);
    toast.success("Orders submitted successfully!");

    setOrderRows([
      {
        customer: null,
        shop: currentUser?.role !== "admin" && shops.length ? shops[0]._id : "",
        product: "",
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

  // 🧮 Render Orders Table
  const renderOrders = (data, label, page, setPage) => {
    const isAdmin = currentUser?.role === "admin";
    const grouped = {};
    for (const order of data) {
      const key = `${order.customerId?._id || order.customerId}_${
        order.orderNumber
      }`;
      if (!grouped[key]) {
        grouped[key] = {
          ...order,
          shops: new Set(),
          allProducts: [],
        };
      }
      order.orderItems?.forEach((item) => {
        if (item.shopId?.name)
          grouped[key].shops.add(
            item.shopId.name?.en ||
              item.shopId.name?.ta ||
              item.shopId.name ||
              "Unknown Shop",
          );
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
                      {order.customerId?.customerName?.en || "Unknown"}
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
                    {/* <Autocomplete
                      options={[
                        ...customers,
                        { _id: "new", customerName: "+ Add New Customer" },
                      ]}
                      getOptionLabel={(option) => option.customerName || ""}
                      value={row.customer}
                      onChange={(_, newValue) => {
                        if (newValue?._id === "new") {
                          setOpenCustomerModal(true);
                        } else {
                          const updated = [...orderRows];
                          updated[index].customer = newValue;
                          setOrderRows(updated);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Customer" size="small" />
                      )}
                    /> */}
                    <Autocomplete
                      options={[
                        ...customers,
                        {
                          _id: "new",
                          customerName: { en: "+ Add New Customer" },
                        },
                      ]}
                      value={row.customer}
                      isOptionEqualToValue={(option, value) =>
                        option?._id === value?._id
                      }
                      getOptionLabel={(option) => {
                        if (option._id === "new") return "+ Add New Customer";
                        if (typeof option.customerName === "object") {
                          return (
                            option.customerName.en ||
                            option.customerName.ta ||
                            ""
                          );
                        }
                        return option.customerName || "";
                      }}
                      onChange={(_, newValue) => {
                        if (newValue?._id === "new") {
                          setOpenCustomerModal(true);
                        } else {
                          const updated = [...orderRows];
                          updated[index].customer = newValue;
                          setOrderRows(updated);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          sx={{ width: "140px" }}
                          {...params}
                          label="Customer"
                          size="small"
                        />
                      )}
                    />
                  </Grid>

                  {/* Shop */}
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      label="Shop"
                      value={row.shop}
                      onChange={(e) => {
                        const updated = [...orderRows];
                        updated[index].shop = e.target.value;
                        setOrderRows(updated);
                      }}
                      fullWidth
                      size="small"
                      disabled={currentUser && currentUser.role !== "admin"}
                      sx={{ width: "140px" }}
                    >
                      <MenuItem value="">Select Shop</MenuItem>
                      {shops.map((s) => (
                        <MenuItem key={s._id} value={s._id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Product */}
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      select
                      label="Product"
                      value={row.product}
                      // onChange={(e) => {
                      //   const updated = [...orderRows];
                      //   updated[index].product = e.target.value;
                      //   setOrderRows(updated);
                      // }}
                      onChange={(e) => {
                        const updated = [...orderRows];
                        const productId = e.target.value;

                        const selectedProduct = products.find(
                          (p) => p._id === productId,
                        );

                        //  Detect customer type safely
                        const customerType = String(
                          updated[index]?.customer?.customerType ||
                            updated[index]?.customer?.type ||
                            "",
                        ).toUpperCase();

                        let price = 0;

                        if (customerType === "B2B") {
                          price =
                            selectedProduct?.sellingPriceforB2B ??
                            selectedProduct?.sellingPrice ??
                            0;
                        } else if (customerType === "B2C") {
                          price =
                            selectedProduct?.sellingPriceforB2C ??
                            selectedProduct?.sellingPrice ??
                            0;
                        } else {
                          price = selectedProduct?.sellingPrice ?? 0;
                        }

                        updated[index].product = productId;
                        updated[index].price = Number(price); //  always number

                        setOrderRows(updated);
                      }}
                      fullWidth
                      size="small"
                      sx={{ width: "150px" }}
                    >
                      <MenuItem value="">Select Product</MenuItem>
                      {products.map((p) => (
                        <MenuItem key={p._id} value={p._id}>
                          {p.name?.en || p.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    {/*  Stock Display */}
                    {row.availablePacks !== null && (
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
                  </Grid>

                  {/* Quantity */}
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      label="Quantity"
                      type="number"
                      value={row.quantity}
                      onChange={(e) => {
                        const updated = [...orderRows];
                        updated[index].quantity = e.target.value;
                        setOrderRows(updated);
                      }}
                      fullWidth
                      size="small"
                      sx={{ width: "140px" }}
                    />
                  </Grid>

                  {/* Pickup Date */}
                  <Grid item xs={12} sm={6} md={2}>
                    <DatePicker
                      label="Pickup Date"
                      value={row.pickupDate}
                      onChange={(d) => {
                        const updated = [...orderRows];
                        updated[index].pickupDate = d;
                        setOrderRows(updated);
                      }}
                      inputFormat="dd/MM/yyyy"
                      renderInput={(params) => (
                        <TextField
                          size="small"
                          {...params}
                          sx={{ width: "140px", height: "30px" }}
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
                label={`Requested (${
                  localOrders.filter((o) => o.orderStatus === "requested")
                    .length
                })`}
              />
            )}
            <Tab
              label={`Pending (${
                localOrders.filter((o) => o.orderStatus === "pending").length
              })`}
            />
            <Tab
              label={`Confirmed (${
                localOrders.filter((o) =>
                  ["confirmed", "fulfilled"].includes(o.orderStatus),
                ).length
              })`}
            />
            <Tab
              label={`Cancelled (${
                localOrders.filter((o) => o.orderStatus === "cancelled").length
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
