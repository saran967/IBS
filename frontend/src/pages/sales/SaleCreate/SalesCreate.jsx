import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../../utils/customFetch";
import AdditionalChargesSection from "../AdditionalChargesSection";
import { useParams, useNavigate } from "react-router-dom";
import CustomerForm from "../../../components/Admin/CustomerForm";
import CustomerSection from "./components/CustomerSection";
import SalesItemsTable from "./components/SalesItemsTable";
import B2BAllocationTable from "./components/B2BAllocationTable";
import TotalsSection from "./components/SalesTotalsSection";
import SalesActionsBar from "./components/SalesActionsBar";
import { numeric, recalcTotals } from "./utils/salesCalc";
import { focusField, focusNextLogicalField } from "./utils/salesFocus";
import PurchaseForm from "../../../components/Admin/purchase/PurchaseForm";

export default function SaleCreate({ tabId, tabData, updateTabData }) {
  const getText = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value.en || value.ta || "";
    return String(value);
  };

  const [customers, setCustomers] = useState([]);
  const [openCustomerModal, setOpenCustomerModal] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedShop, setSelectedShop] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [saleType, setSaleType] = useState("B2C");
  const [dueDate, setDueDate] = useState(null);

  // NEW: billType state (GST or WITHOUT_GST). Default GST.
  const [billType, setBillType] = useState("GST");
  const [paymentSplits, setPaymentSplits] = useState([
    { mode: "CASH", amount: "" },
  ]);

  const [priceTier, setPriceTier] = useState("R"); // R, W, SW

  const [productSearchText, setProductSearchText] = useState({});

  const [includeTransport, setIncludeTransport] = useState(false);
  const [includeHandling, setIncludeHandling] = useState(false);
  const [handlingCharges, setHandlingCharges] = useState([]);
  const [transport, setTransport] = useState({
    vehicleNumber: "",
    driverName: "",
    driverPhone: "",
    transportAgency: "",
    remarks: "",
  });

  const [loadingProducts, setLoadingProducts] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [tempCurrentSale, setTempCurrentSale] = useState(null);
  const [currentMode, setCurrentMode] = useState(false);
  // currentVisible = true when viewing a loaded (read-only) sale via Prev/Next
  const [currentVisible, setCurrentVisible] = useState(false);
  const [isLoadingSale, setIsLoadingSale] = useState(false);

  const [inCurrentMode, setInCurrentMode] = useState(true);

  const [combinedLocations, setCombinedLocations] = useState([]);

  const [products, setProducts] = useState([]);

  const createRow = () => ({
    rowKey: crypto.randomUUID(),

    shopId: "",
    productCode: "",
    productId: "",
    name: "",
    quantity: 0,
    unit: "",
    soldUnit: "",
    sellingPrice: 0,
    productBaseUnit: "",
    hsnCode: "",

    cgstPercentage: 0,
    sgstPercentage: 0,
    cgstAmount: 0,
    sgstAmount: 0,

    rate: 0,
    total: 0,

    skuId: "",
    skuList: [],
    inventoryId: "",
    batches: [],
    isLoose: false,
    looseUnit: "",
    availablePacks: 0,
    availableWeight: 0,
  });

  const [items, setItems] = useState([createRow()]);

  // totals allow empty for discount/paid (display empty but compute as 0)
  const [totals, setTotals] = useState({
    gross: 0,
    discount: "", // allow empty
    net: 0,
    paid: "", // allow empty
    balance: 0,
  });

  const [b2bCompanies, setB2bCompanies] = useState([]);
  const [companyQtyMap, setCompanyQtyMap] = useState({});
  const refs = useRef({}); // central place to store refs for all focusable fields
  const debounceTimeouts = useRef({});
  const { id: orderId } = useParams();

  // NEW: track saved sale id -> when set, form becomes read-only
  const [savedSaleId, setSavedSaleId] = useState(null);
  const isSaved = Boolean(savedSaleId);

  // NEW: sales list & current index for selected customer navigation
  const [salesList, setSalesList] = useState([]); // array of sales
  const [currentSaleIndex, setCurrentSaleIndex] = useState(-1); // index into salesList
  const [productSearchOptions, setProductSearchOptions] = useState({});
  const [openQuickPurchase, setOpenQuickPurchase] = useState(false);
  const [purchaseContext, setPurchaseContext] = useState({});
  useEffect(() => {
    Object.entries(productSearchText).forEach(([index, text]) => {
      if (!text || text.length < 2) {
        setProductSearchOptions((prev) => ({ ...prev, [index]: [] }));
        return;
      }

      console.log(productSearchText, "Search text value is visible", text);

      // debounce per row
      if (debounceTimeouts.current[index])
        clearTimeout(debounceTimeouts.current[index]);

      debounceTimeouts.current[index] = setTimeout(async () => {
        try {
          const res = await customFetch.get(
            `/product/search?q=${encodeURIComponent(text)}`,
          );

          setProductSearchOptions((prev) => ({
            ...prev,
            [index]: res.data.products || [],
          }));
        } catch {
          setProductSearchOptions((prev) => ({ ...prev, [index]: [] }));
        }
      }, 300);
    });
  }, [productSearchText]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const userRes = await customFetch.get("/auth/current-user");
        const user = userRes.data.user;
        setCurrentUser(user);

        // Fetch customer + shops + godowns
        const [custRes, shopRes, godownRes] = await Promise.all([
          customFetch.get("/customer"),
          customFetch.get("/shops"),
          customFetch.get("/godowns"),
        ]);

        setCustomers(custRes.data.customers || []);

        const shopsData =
          shopRes.data.data || shopRes.data.shops || shopRes.data || [];

        const godownsData =
          godownRes.data.data || godownRes.data.godowns || godownRes.data || [];

        // Format shops
        const formattedShops = shopsData.map((s) => ({
          _id: s._id,
          name: s.name?.en || s.name,
          type: "Shop",
          shopId: s._id,
        }));

        // Format godowns
        const formattedGodowns = godownsData.map((g) => ({
          _id: g._id,
          name: g.name?.en || g.name || g.godownName,
          type: "Godown",
          shopId: g._id,
        }));

        // Merge shops + godowns
        const merged = [...formattedShops, ...formattedGodowns];

        //  Filter by role
        let finalLocations = [];

        if (user.role === "admin") {
          finalLocations = merged;
        } else {
          const userShopId =
            typeof user.shopId === "object" ? user.shopId._id : user.shopId;

          finalLocations = merged.filter(
            (loc) => String(loc.shopId) === String(userShopId),
          );
        }

        setCombinedLocations(finalLocations);

        // DEFAULT PRICE TIER: Admin -> SW, Shop -> R
        if (user.role === "admin") {
          setPriceTier("SW");
          updateTabData(tabId, { priceTier: "SW" });
        } else {
          setPriceTier("R");
          updateTabData(tabId, { priceTier: "R" });
        }

        //  DEFAULT LOCATION AUTO SELECT
        //  If user has assigned shop -> prefer that
        if (user?.shopId?._id) {
          setSelectedShop(user.shopId._id);

          setItems((prev) => {
            const copy = [...prev];
            if (!copy[0]) return prev;

            copy[0] = {
              ...copy[0],
              shopId: user.shopId._id,
              godownId: "",
              locationObj:
                finalLocations.find(
                  (l) => String(l._id) === String(user.shopId._id),
                ) || null,
            };

            // updateTabData(tabId, { items: stripLocationObj(copy) });
            return copy;
          });

          updateTabData(tabId, { selectedShop: user.shopId._id });
        }
        //  Otherwise (ADMIN case) -> pick first shop/godown
        else if (finalLocations.length > 0) {
          const firstLoc = finalLocations[0];

          setSelectedShop(firstLoc._id);

          setItems((prev) => {
            const copy = [...prev];
            if (!copy[0]) return prev;

            copy[0] = {
              ...copy[0],
              shopId: firstLoc.type === "Shop" ? firstLoc._id : firstLoc.shopId,
              godownId: firstLoc.type === "Godown" ? firstLoc._id : "",
              locationObj: firstLoc,
            };

            // updateTabData(tabId, { items: stripLocationObj(copy) });
            return copy;
          });

          updateTabData(tabId, { selectedShop: firstLoc._id });
        }
      } catch (err) {
        toast.error("Failed to load data");
      }
    };

    fetchAllData();
  }, []);

  const resolveOrderLocation = (orderItem) => {
    if (orderItem.godownId?._id) {
      return {
        locationId: orderItem.godownId._id,
        type: "Godown",
        shopId: orderItem.shopId?._id || "",
        godownId: orderItem.godownId._id,
      };
    }

    if (orderItem.shopId?._id) {
      return {
        locationId: orderItem.shopId._id,
        type: "Shop",
        shopId: orderItem.shopId._id,
        godownId: "",
      };
    }

    return {
      locationId: "",
      type: "",
      shopId: "",
      godownId: "",
    };
  };

  const stripLocationObj = (rows) =>
    rows.map(({ locationObj, ...rest }) => rest);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await customFetch.get("/product");
        setProducts(res.data.products || res.data || []);
      } catch {
        toast.error("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (tabData.items) setItems(tabData.items);
    if (tabData.totals) setTotals(tabData.totals);
    if (tabData.billType) setBillType(tabData.billType);
    if (tabData.saleType) setSaleType(tabData.saleType);

    if (tabData.paymentSplits) setPaymentSplits(tabData.paymentSplits);

    if (tabData.includeTransport !== undefined)
      setIncludeTransport(tabData.includeTransport);

    if (tabData.includeHandling !== undefined)
      setIncludeHandling(tabData.includeHandling);

    if (tabData.transport) setTransport(tabData.transport);
    if (tabData.handlingCharges) setHandlingCharges(tabData.handlingCharges);
    if (tabData.companyQtyMap) setCompanyQtyMap(tabData.companyQtyMap);

    if (tabData.savedSaleId) setSavedSaleId(tabData.savedSaleId);

    if (tabData.selectedCustomer !== undefined)
      setSelectedCustomer(tabData.selectedCustomer);

    if (tabData.priceTier !== undefined)
      setPriceTier(tabData.priceTier);
  }, [tabId]);

  // ---------------- Fetch existing order if editing ----------------
  useEffect(() => {
    const fetchOrderIfNeeded = async () => {
      if (!orderId) return;
      try {
        const { data } = await customFetch.get(`/orders/${orderId}`);
        const order = data.order || data.data || data;
        const locationIds = [
          ...new Set(
            order.orderItems
              ?.map((it) =>
                it.godownId?._id
                  ? it.godownId._id //  prefer godown
                  : it.shopId?._id
                    ? it.shopId._id //  fallback to shop
                    : null,
              )
              .filter(Boolean),
          ),
        ];
        setSelectedCustomer(order.customerId?._id || "");
        if (locationIds.length === 1) setSelectedShop(locationIds[0]);
        else setSelectedShop("");

        let detectedSaleType = "B2C";
        try {
          const custRes = await customFetch.get(
            `/customer/${order.customerId?._id || order.customerId}`,
          );

          const cust =
            custRes.data.customer || custRes.data.data || custRes.data;
          const cType = String(
            cust.customerType || cust.type || "",
          ).toUpperCase();

          if (cType === "B2B" || cType === "BUSINESS") {
            detectedSaleType = "B2B";

            const comps = cust.companies || cust.companyList || [];
            setB2bCompanies(comps);

            const initialMap = {};

            order.orderItems?.forEach((it) => {
              const pid = (it.productId?._id || it.productId || "").toString();

              initialMap[pid] = {};

              const storedAlloc = {};

              //  Existing allocations (manual typing, keyed by companyId)
              if (
                it.companyAllocation &&
                typeof it.companyAllocation === "object"
              ) {
                Object.entries(it.companyAllocation).forEach(([key, qty]) => {
                  storedAlloc[key] = Number(qty) || 0;
                });
              }

              //  Backend allocations (order.companyItems, keyed by companyName)
              (it.companyItems || []).forEach((ci) => {
                const nameKey = String(ci.companyName).trim().toLowerCase();
                storedAlloc[nameKey] = Number(ci.quantity) || 0;
              });

              console.log(storedAlloc, "Merged Allocation Value");

              comps.forEach((comp) => {
                const nameKey = String(comp.companyName).trim().toLowerCase();
                const idKey = String(comp._id);

                initialMap[pid][idKey] =
                  storedAlloc[idKey] !== undefined
                    ? storedAlloc[idKey] //  manual entry wins
                    : storedAlloc[nameKey] !== undefined
                      ? storedAlloc[nameKey] //  backend order value
                      : 0; // default
              });

              // 🔍 DEBUG LOG (VERY IMPORTANT)
              console.log("🧾 Product:", it.productId?.name?.en);
              console.log("📦 Company Allocation:", initialMap[pid]);
            });

            setCompanyQtyMap(initialMap);
          } else {
            setB2bCompanies([]);
            setCompanyQtyMap({});
          }
        } catch {
          console.warn("Could not verify customer type, defaulting to B2C");
        }

        setSaleType(detectedSaleType);

        if (order.customerId?._id || order.customerId) {
          fetchSalesForCustomer(
            order.customerId?._id || order.customerId,
            false,
          );
        }

        const mappedItems = order.orderItems.map((it) => {
          const resolved = resolveOrderLocation(it);
          console.log(resolved.shopId, "shop data");

          const product = it.productId || {};
          const maintainInventory = product.maintainInventory !== false;
          const baseUnit = product.unit?.en || product.unit || it.unit || "";
          const price =
            it.price !== undefined ? it.price : it.productId?.sellingPrice || 0;
          return {
            shopId: resolved.shopId,
            godownId: resolved.godownId,
            locationObj: null,
            productId: it.productId._id,
            maintainInventory: maintainInventory,
            productCode: it.productId.productCode,
            hsnCode: it.productId.hsnCode || "",
            name: it.productId.name?.en || "",
            // unit: it.productId.unit?.en || "",
            unit: baseUnit,
            productBaseUnit: baseUnit,
            skuList: [],
            pack: it.productId.pack?.en || it.pack,
            purchasePrice: it.productId.purchasePrice || it.purchasePrice || 0,
            profitPercentage: it.profitPercentage || 0,
            // sellingPrice,
            gstPercentage: it.gstPercentage || 0,
            gstAmount: it.gstAmount || 0,
            quantity: Number(it.quantity || 0),
            sellingPrice: price || it.productId.sellingPrice,
            rate: price || it.productId.sellingPrice,
            total: it.quantity * Number(price || it.productId.sellingPrice),
          };
        });

        setItems(mappedItems);
        recalcTotalsWrapper(mappedItems);

        setCurrentVisible(false);
        //  Store initial snapshot for CURRENT button (when pre-filling from order)
        setTempCurrentSale({
          items: JSON.parse(JSON.stringify(mappedItems)),
          totals: {
            gross: mappedItems.reduce((s, it) => s + (it.total || 0), 0),
            discount: "",
            net: mappedItems.reduce((s, it) => s + (it.total || 0), 0),
            paid: "",
            balance: mappedItems.reduce((s, it) => s + (it.total || 0), 0),
          },
          includeHandling: false,
          handlingCharges: [],
          includeTransport: false,
          transport: {
            vehicleNumber: "",
            driverName: "",
            driverPhone: "",
            transportAgency: "",
            remarks: "",
          },
          saleType: detectedSaleType,
          billType,
          selectedCustomer: order.customerId?._id || "",
          selectedShop: locationIds.length === 1 ? locationIds[0] : "",
          savedSaleId: null,
        });

        toast.success("Order details loaded successfully!");
      } catch (err) {
        console.error("Failed to fetch order for prefill", err);
        toast.error("Failed to load order details");
      }
    };
    fetchOrderIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const locationKey = useMemo(
    () => items.map((i) => `${i.shopId}_${i.godownId}`).join(","),
    [items],
  );

  useEffect(() => {
    //  NEVER touch location during Prev / Next or saved view
    if (currentVisible || savedSaleId) return;
    if (!combinedLocations.length) return;

    setItems((prev) =>
      prev.map((it) => {
        // Already resolved → KEEP IT
        if (it.locationObj) return it;

        const locId = it.godownId || it.shopId;
        if (!locId) return it;

        const matched = combinedLocations.find(
          (l) => String(l._id) === String(locId),
        );

        return matched ? { ...it, locationObj: matched } : it;
      }),
    );
  }, [combinedLocations, locationKey, currentVisible, savedSaleId]);

  useEffect(() => {
    const paid = paymentSplits.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );

    setTotals((prev) => ({
      ...prev,
      paid,
      balance: Number(prev.net || 0) - paid,
    }));

    updateTabData(tabId, {
      paymentSplits,
    });
  }, [paymentSplits]);



  // ---------------- Recalculate totals ----------------
  const recalcTotalsWrapper = (
    rows,
    updatedTotals = {},
    updatedHandling = handlingCharges,
  ) => {
    const nextTotals = recalcTotals({
      rows,
      totals,
      includeHandling,
      handlingCharges,
      updatedTotals,
      updatedHandling,
    });

    setTotals(nextTotals);
  };

  useEffect(() => {
    const fetchSkuForLoadedItems = async () => {
      const updatedItems = [...items];
      let changed = false;

      for (let i = 0; i < updatedItems.length; i++) {
        const it = updatedItems[i];

        //  Product exists
        if (
          it.productId &&
          (!Array.isArray(it.skuList) || it.skuList.length === 0)
        ) {
          try {
            const pid =
              typeof it.productId === "object"
                ? it.productId._id
                : it.productId;

            const skuRes = await customFetch.get(`/retail-skus/product/${pid}`);

            const skuList = skuRes.data.data || [];

            updatedItems[i] = {
              ...it,
              skuList,
            };

            changed = true;
          } catch (err) {
            console.warn("SKU fetch failed for product", it.productId);
          }
        }
      }

      if (changed) {
        setItems(updatedItems);
        updateTabData(tabId, { items: stripLocationObj(updatedItems) });
      }
    };

    fetchSkuForLoadedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => String(i.productId)).join(",")]);

  // ---------------- B2B: Auto-initialize company allocation for NEW sales ----------------
  useEffect(() => {
    if (savedSaleId && !inCurrentMode) return;
    if (saleType !== "B2B") return;
    if (!b2bCompanies.length) return;

    setCompanyQtyMap((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        const pid = String(it.productId);
        if (!pid) return;

        if (!next[pid]) next[pid] = {};
        b2bCompanies.forEach((comp) => {
          if (next[pid][comp._id] === undefined) {
            next[pid][comp._id] = 0;
          }
        });
      });
      return next;
    });
  }, [
    items.map((i) => String(i.productId)).join(","),
    saleType,
    b2bCompanies.length,
    currentVisible,
    savedSaleId,
  ]);

  const handleProductCodeChange = (index, code) => {
    if (isSaved) return;

    const updated = [...items];
    updated[index].productCode = code;

    //  RESET ONLY WHEN EMPTY
    if (!code || code.trim().length === 0) {
      updated[index] = {
        ...updated[index],
        productId: "",
        name: "",
        unit: "",
        productBaseUnit: "",
        productSellingPrice: 0,
        purchasePrice: 0,
        profitPercentage: 0,
        hsnCode: "",
        cgstPercentage: 0,
        sgstPercentage: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        sellingPrice: 0,
        rate: 0,
        total: 0,
        skuId: null,
        skuList: [],
        isLoose: false,
        looseUnit: "",
      };

      setItems(updated);
      updateTabData(tabId, { items: stripLocationObj(updated) });
      recalcTotalsWrapper(updated);
      return;
    }

    setItems(updated);
    updateTabData(tabId, { items: stripLocationObj(updated) });

    //  DEBOUNCE
    if (debounceTimeouts.current[index])
      clearTimeout(debounceTimeouts.current[index]);

    debounceTimeouts.current[index] = setTimeout(async () => {
      try {
        setLoadingProducts((p) => ({ ...p, [index]: true }));

        const { data } = await customFetch.get(`/product/code/${code}`);
        const p = data.product;

        if (!p || !p._id) throw new Error("Product not found");

        const skuRes = await customFetch.get(`/retail-skus/product/${p._id}`);
        const skuList = skuRes.data.data || [];
        //  RESET COMPANY ALLOCATION FOR THIS PRODUCT
        setCompanyQtyMap((prev) => {
          const next = { ...prev };
          next[p._id] = {};
          b2bCompanies.forEach((comp) => {
            next[p._id][comp._id] = 0;
          });
          return next;
        });
        //-----------------------stock fetch (For sales)------------
        const staleRow = items[index];
        // Use the 'updated' copy to be safe from closure issues
        const currentRow = updated[index];

        if (!p._id || (!currentRow.shopId && !currentRow.godownId)) {
          console.warn("Skipping batch fetch: Missing productId or location", {
            productId: p._id,
            shopId: currentRow.shopId,
            godownId: currentRow.godownId,
          });
          setLoadingProducts((p) => ({ ...p, [index]: false }));
          return;
        }

        let stockRes = { data: { availablePacks: null, availableWeight: null } };
        let batchesRes = { data: { batches: [] } };

        const maintainInventory = p.maintainInventory !== false;

        if (maintainInventory) {
          stockRes = await customFetch.get("/inventory/stock/sales", {
            params: {
              productId: p._id,
              shopId: currentRow.shopId || null,
              godownId: currentRow.godownId || null,
            },
          });

          batchesRes = await customFetch.get("/inventory/batches", {
            params: {
              productId: p._id,
              shopId: currentRow.shopId || null,
              godownId: currentRow.godownId || null,
            },
          });
        }

        setItems((prev) => {
          const newItems = [...prev];
          const row = { ...newItems[index] };

          //  Assign product fields
          row.productId = p._id;
          row.maintainInventory = maintainInventory;
          row.availablePacks = stockRes.data.availablePacks;
          row.availableWeight = stockRes.data.availableWeight;
          row.batches = batchesRes.data?.batches || [];
          row.inventoryId = ""; // default FIFO (Auto)

          row.name = p.name?.en || "";
          row.hsnCode = p.hsnCode || "";
          row.baseUnitType = p.baseUnitType;
          row.productBaseUnit = p.unit?.en || "";
          row.unit = row.productBaseUnit ? "__BASE__" : "";

          row.soldUnit = row.productBaseUnit;

          row.purchasePrice = p.purchasePrice ?? 0;
          row.profitPercentage = p.profitPercentage ?? 0;

          let initialPrice = p.sellingPrice ?? 0;
          if (priceTier === "W") {
            initialPrice = p.sellingPriceforB2B ?? initialPrice;
          } else if (priceTier === "SW") {
            initialPrice = p.sellingPriceforAgent ?? initialPrice;
          } else {
            initialPrice = p.sellingPrice ?? 0;
          }

          row.productSellingPrice = initialPrice;
          row.sellingPrice = initialPrice;
          row.priceTier = priceTier; // Store individual tier

          row.skuList = Array.isArray(skuList) ? skuList : [];

          //  BASE MODE FLAGS
          row.skuId = null;
          row.isLoose = false;
          row.looseUnit = "";
          row.maintainInventory = maintainInventory;

          //  GST % from product
          const cgstPerc =
            billType === "WITHOUT_GST" ? 0 : Number(p.cgstPercentage || 0);
          const sgstPerc =
            billType === "WITHOUT_GST" ? 0 : Number(p.sgstPercentage || 0);

          row.cgstPercentage = cgstPerc;
          row.sgstPercentage = sgstPerc;

          //  GST Amount
          row.cgstAmount = (row.sellingPrice * cgstPerc) / 100;
          row.sgstAmount = (row.sellingPrice * sgstPerc) / 100;

          //  Rate
          row.rate =
            billType === "WITHOUT_GST"
              ? row.sellingPrice
              : row.sellingPrice + row.cgstAmount + row.sgstAmount;

          //  total
          const qty = Number(row.quantity || 0);
          row.total = qty * row.rate;

          newItems[index] = row;

          updateTabData(tabId, { items: stripLocationObj(newItems) });
          recalcTotalsWrapper(newItems);

          return newItems;
        });
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error("Invalid product code");
        } else {
          toast.error("Failed to load product");
        }
      } finally {
        setLoadingProducts((p) => ({ ...p, [index]: false }));
      }
    }, 350);
  };

  const handleItemChange = async (index, field, value) => {
    if (field === "quantity") {
      const row = items[index];

      if (row.productId && row.maintainInventory !== false) {
        const baseUnit = String(row.productBaseUnit || "").toLowerCase();

        let maxQty;
        if (["kg", "l", "ltr"].includes(baseUnit)) {
          // weight / volume products
          maxQty = row.availableWeight;
        } else {
          // PCS / count-based products
          maxQty = row.availablePacks;
        }
        if (maxQty !== null && Number(value) > maxQty) {
          toast.error(`Only ${maxQty} available`);
          return;
        }
      }
    }

    //  UNIT CHANGE LOGIC
    if (field === "unit") {
      const updated = [...items];
      const row = updated[index];
      const newUnit = value;

      //   BASE SELECTED
      if (newUnit === "__BASE__") {
        row.unit = "__BASE__"; //  keeps value stable in UI
        row.skuId = null;
        row.soldUnit = row.productBaseUnit;
        row.isLoose = false;
        row.looseUnit = "";

        //  reset to product base selling price
        const basePrice = Number(row.productSellingPrice || 0);
        row.sellingPrice = basePrice;

        const cgst =
          billType === "WITHOUT_GST" ? 0 : Number(row.cgstPercentage || 0);
        const sgst =
          billType === "WITHOUT_GST" ? 0 : Number(row.sgstPercentage || 0);

        row.cgstAmount = (row.sellingPrice * cgst) / 100;
        row.sgstAmount = (row.sellingPrice * sgst) / 100;

        row.rate =
          billType === "WITHOUT_GST"
            ? row.sellingPrice
            : row.sellingPrice + row.cgstAmount + row.sgstAmount;

        const qty = Number(row.quantity || 0);
        row.total = qty * row.rate;

        setItems(updated);
        updateTabData(tabId, { items: stripLocationObj(updated) });
        recalcTotalsWrapper(updated);
        return;
      }

      //   LOOSE SELECTED
      if (newUnit === "LOOSE") {
        row.unit = "LOOSE";
        row.isLoose = true;
        row.skuId = null;

        const lu = getLooseUnitFromBase(row.productBaseUnit);
        if (!lu) {
          toast.error("Loose sale is allowed only for KG / Litre products");
          return;
        }
        row.looseUnit = lu;
        row.soldUnit = lu;
        row.quantity = ""; // user must type loose qty
        row.total = 0;

        setItems(updated);
        updateTabData(tabId, { items: stripLocationObj(updated) });
        recalcTotalsWrapper(updated);
        return;
      }

      //  SKU SELECTED (value is sku._id)
      const sku = (Array.isArray(row.skuList) ? row.skuList : []).find(
        (s) => String(s._id) === String(newUnit),
      );

      if (sku) {
        row.unit = sku._id; //  IMPORTANT: keeps dropdown value = skuId
        row.skuId = sku._id;
        row.soldUnit = sku.sellUnit;
        row.isLoose = false;
        row.looseUnit = "";

        row.quantity = ""; //  reset qty for SKU
        row.sellingPrice = Number(sku.retailPrice || 0);

        const cgst =
          billType === "WITHOUT_GST" ? 0 : Number(row.cgstPercentage || 0);
        const sgst =
          billType === "WITHOUT_GST" ? 0 : Number(row.sgstPercentage || 0);

        row.cgstAmount = (row.sellingPrice * cgst) / 100;
        row.sgstAmount = (row.sellingPrice * sgst) / 100;

        row.rate =
          billType === "WITHOUT_GST"
            ? row.sellingPrice
            : row.sellingPrice + row.cgstAmount + row.sgstAmount;

        row.total = 0;

        setItems(updated);
        updateTabData(tabId, { items: stripLocationObj(updated) });
        recalcTotalsWrapper(updated);
        return;
      }

      if (row.productId && row.maintainInventory !== false) {
        try {
          const res = await customFetch.get("/inventory/stock/sales", {
            params: {
              productId: row.productId,
              shopId: row.shopId,
              godownId: row.godownId || null,
            },
          });

          row.availablePacks = res.data.availablePacks;
          row.availableWeight = res.data.availableWeight;
        } catch (err) {
          console.warn("Stock fetch failed in unit change");
        }
      }

      //   FALLBACK
      row.unit = newUnit;
      row.skuId = null;
      row.isLoose = false;
      row.looseUnit = "";

      const qty = Number(row.quantity || 0);
      row.total = qty * Number(row.rate || 0);

      setItems(updated);
      updateTabData(tabId, { items: stripLocationObj(updated) });
      recalcTotalsWrapper(updated);
      return;
    }

    //  OTHER FIELD UPDATE LOGIC
    if (isSaved) return;

    const updated = [...items];
    const row = updated[index];
    row[field] = value;

    // Handle per-item price tier change
    if (field === "priceTier" && row.productId) {
      const p = products.find((prod) => String(prod._id) === String(row.productId));
      if (p) {
        let newPrice = p.sellingPrice ?? 0;
        if (value === "W") {
          newPrice = p.sellingPriceforB2B ?? newPrice;
        } else if (value === "SW") {
          newPrice = p.sellingPriceforAgent ?? newPrice;
        }
        row.sellingPrice = newPrice;
      }
    }

    let cgstPercentage = Number(row.cgstPercentage) || 0;
    let sgstPercentage = Number(row.sgstPercentage) || 0;

    if (billType === "WITHOUT_GST") {
      cgstPercentage = 0;
      sgstPercentage = 0;
    }

    const qty = Number(row.quantity || 0);
    const sellingPrice = Number(row.sellingPrice) || 0;

    const cgstAmt = (sellingPrice * cgstPercentage) / 100;
    const sgstAmt = (sellingPrice * sgstPercentage) / 100;

    row.cgstAmount = billType === "WITHOUT_GST" ? 0 : cgstAmt;
    row.sgstAmount = billType === "WITHOUT_GST" ? 0 : sgstAmt;

    row.rate = billType === "WITHOUT_GST" ? sellingPrice : sellingPrice + row.cgstAmount + row.sgstAmount;
    row.total = qty * row.rate;

    setItems(updated);
    updateTabData(tabId, { items: stripLocationObj(updated) });
    recalcTotalsWrapper(updated);
  };

  const handleAddRow = () => {
    if (isSaved) return;

    const defaultLoc = combinedLocations?.[0] || null;

    setItems((prev) => {
      const updated = [
        ...prev,
        {
          rowKey: crypto.randomUUID(), //  FIX

          shopId: defaultLoc
            ? defaultLoc.type === "Shop"
              ? defaultLoc._id
              : defaultLoc.shopId
            : "",
          godownId: defaultLoc?.type === "Godown" ? defaultLoc._id : "",
          locationObj: defaultLoc,

          productCode: "",
          productId: "",
          hsnCode: "",
          name: "",
          quantity: 0,
          unit: "",
          soldUnit: "",
          sellingPrice: 0,

          cgstPercentage: billType === "WITHOUT_GST" ? 0 : 0,
          sgstPercentage: billType === "WITHOUT_GST" ? 0 : 0,
          cgstAmount: 0,
          sgstAmount: 0,

          rate: 0,
          total: 0,
          skuId: "",
          skuList: [],
          productBaseUnit: "",
          isLoose: false,
          looseUnit: "",
          availablePacks: 0,
          availableWeight: 0,
          priceTier: priceTier, // Initialize with current global default
        },
      ];

      updateTabData(tabId, { items: stripLocationObj(updated) });
      return updated;
    });
  };

  const isWeightOrVolumeUnit = (u) => {
    const unit = String(u || "").toLowerCase();
    return ["kg", "g", "l", "ltr", "ml"].includes(unit);
  };

  const getLooseUnitFromBase = (baseUnit) => {
    const u = String(baseUnit || "").toLowerCase();
    if (u === "kg") return "g";
    if (u === "l" || u === "ltr") return "ml";
    return ""; // count-based units will return empty
  };

  const getEffectiveQty = (row) => {
    const qty = Number(row.quantity || 0);

    // 1) LOOSE (grams/ml input -> convert to kg/l)
    if (row.isLoose) {
      if (row.looseUnit === "g" || row.looseUnit === "ml") return qty / 1000;
      return qty;
    }

    // 2) SKU packed (qty entered = number of packs)
    if (row.skuId) {
      const sku = (row.skuList || []).find(
        (s) => String(s._id) === String(row.skuId),
      );
      if (!sku) return qty;

      // sku.baseQty = how much base unit inside 1 pack
      // if base unit is KG/LTR and baseQty is grams/ml -> convert to kg/l if needed
      const baseQty = Number(sku.baseQty) || 0;

      // IMPORTANT:
      // total base qty in base unit = packs * baseQty
      // but billing sellingPrice here is per pack => qty * rate is correct
      // so effectiveQty should remain qty (packs count)
      return qty;
    }

    // 3) Base unit
    return qty;
  };

  const getFinalUnitForPayload = (row) => {
    if (row.isLoose) return row.looseUnit; // g or ml
    if (row.skuId) {
      const sku = (row.skuList || []).find(
        (s) => String(s._id) === String(row.skuId),
      );
      return sku?.sellUnit || sku?.unit || row.productBaseUnit || "";
    }
    return row.productBaseUnit || "";
  };

  const handleDeleteRow = (index) => {
    if (isSaved) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    updateTabData(tabId, { items: stripLocationObj(updated) });
    recalcTotalsWrapper(updated);
  };

  // ---------------- Customer change ----------------
  const handleCustomerChange = async (e) => {
    const selectedId = e.target.value;
    if (isSaved) return;
    setSelectedCustomer(selectedId);
    updateTabData(tabId, { selectedCustomer: selectedId });
    const selectedCust = customers.find((c) => c._id === selectedId);
    if (selectedCust?.creditLimit) {
      try {
        const res = await customFetch.get(`/customer/${selectedId}/ledger`);
        const balance = res.data?.totals?.totalBalance || 0;

        if (Number(balance) > Number(selectedCust.creditLimit)) {
          toast.warning("Customer already exceeded credit limit!");
        }
      } catch (err) {
        console.warn("Ledger check failed", err);
      }
    }
    if (selectedCust) {
      const custType = String(
        selectedCust.customerType || selectedCust.type || "",
      ).toUpperCase();

      let newSaleType = "B2C";
      if (custType === "B2B" || custType === "BUSINESS") {
        newSaleType = "B2B";
        try {
          const { data } = await customFetch.get(`/customer/${selectedId}`);
          const cust = data.customer || data.data || data;
          const companies = cust.companies || cust.companyList || [];
          setB2bCompanies(companies);
        } catch {
          toast.error("Failed to load B2B companies");
        }
      } else if (custType === "AGENT") {
        newSaleType = "AGENT";
        setB2bCompanies([]);
      } else {
        newSaleType = "B2C";
        setB2bCompanies([]);
      }

      setSaleType(newSaleType);

      // buddy in sales dont fix the price based on customer it will be like there will be 3 options
      // (Prices are now handled by global priceTier selection)
    }

    fetchSalesForCustomer(selectedId, false);
    //  do NOT auto load into form
    setSavedSaleId(null); //  unlock form
    setCurrentVisible(false);
    setInCurrentMode(true);
  };

  const validateB2BAllocations = () => {
    if (saleType !== "B2B") return true;

    for (const it of items) {
      if (!it.productId) continue;
      const pid = String(it.productId?._id || it.productId);
      const mainQty = getEffectiveQty(it);

      const sumAlloc = Object.values(companyQtyMap[pid] || {}).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      );

      if (sumAlloc !== mainQty) {
        toast.error(
          `Allocation mismatch for ${it.name || it.productCode}.
Main Qty: ${mainQty}, Allocated: ${sumAlloc}`,
        );

        console.debug("B2B CHECK", {
          product: it.name,
          mainQty,
          allocation: companyQtyMap[pid],
        });
        return false;
      }
    }

    return true;
  };

  const saveSale = async () => {
    if (!items.some((i) => i.productId)) {
      toast.error("Add at least one product");
      setSubmitting(false);
      return null;
    }
    if (!validateB2BAllocations()) {
      return null; //  STOP EVERYTHING
    }
    if (savedSaleId) {
      toast.info("Sale already saved");
      return savedSaleId;
    }

    if (submitting) return null;
    setSubmitting(true);

    try {
      if (!selectedCustomer) {
        toast.error("Select a customer");
        setSubmitting(false);
        return null;
      }

      const selectedCust = customers.find(c => c._id === selectedCustomer);

      if (selectedCust?.creditLimit) {
        try {
          const res = await customFetch.get(`/customer/${selectedCustomer}/ledger`);
          const balance = res.data?.totals?.totalBalance || 0;

          const newExposure = Number(balance) + Number(totals.net || 0);

          if (newExposure > Number(selectedCust.creditLimit)) {
            toast.warning(
              `Credit limit exceeded! Limit: ₹${selectedCust.creditLimit}`
              // , Exposure: ₹${newExposure}`
            );
          }
        } catch (err) {
          console.warn("Credit check failed", err);
        }
      }

      // ---------------- NORMALIZE ITEMS ----------------
      const normalizedItems = items.map((it, idx) => {
        const sellingPrice = Number(it.sellingPrice) || 0;

        // GST Split
        let cgstPercentage =
          billType === "WITHOUT_GST" ? 0 : Number(it.cgstPercentage) || 0;
        let sgstPercentage =
          billType === "WITHOUT_GST" ? 0 : Number(it.sgstPercentage) || 0;

        let cgstAmount = (sellingPrice * cgstPercentage) / 100;
        let sgstAmount = (sellingPrice * sgstPercentage) / 100;

        // Rate
        const rate =
          billType === "WITHOUT_GST"
            ? sellingPrice
            : sellingPrice + cgstAmount + sgstAmount;

        const qty = Number(it.quantity || 0);
        const total = qty * rate;

        return {
          originalIndex: idx,
          shopId: it.shopId,
          productId: it.productId,
          productCode: it.productCode,
          hsnCode: it.hsnCode || "",
          quantity: qty,
          purchasePrice: it.purchasePrice ?? 0,
          profitPercentage: it.profitPercentage ?? 0,

          cgstPercentage,
          sgstPercentage,
          cgstAmount,
          sgstAmount,

          sellingPrice,
          rate,
          total,
        };
      });

      // ---------------- BUILD B2B COMPANY SPLIT ----------------
      let companyAllocations = [];

      if (saleType === "B2B") {
        companyAllocations = Object.entries(companyQtyMap).flatMap(
          ([productId, compMap]) => {
            const fullItem = normalizedItems.find(
              (it) => String(it.productId) === String(productId),
            );

            if (!fullItem) return [];

            const srcItem = items.find(
              (i) => String(i.productId) === String(productId),
            );

            const qty = Number(fullItem.quantity || 0);
            const effectiveQty = srcItem ? getEffectiveQty(srcItem) : qty;
            let allocatedSum = 0;
            return Object.entries(compMap)
              .map(([companyId, qtyRaw]) => {
                const qty = Number(qtyRaw) || 0;

                if (qty <= 0) return null;
                allocatedSum += qty;

                return {
                  companyId,
                  allocations: [
                    {
                      productId: fullItem.productId,
                      quantity: qty,
                      sellingPrice: fullItem.sellingPrice,
                      gstPercentage:
                        fullItem.cgstPercentage + fullItem.sgstPercentage,
                      gstAmount: fullItem.cgstAmount + fullItem.sgstAmount,
                      purchasePrice: fullItem.purchasePrice,
                      profitPercentage: fullItem.profitPercentage,
                      unit:
                        items.find((i) => i.productId === productId)?.unit ||
                        "",
                      productName:
                        items.find((i) => i.productId === productId)?.name ||
                        "",
                      shopId: fullItem.shopId,
                      total: qty * fullItem.rate,
                    },
                  ],
                };
              })
              .filter(Boolean);
          },
        );
      }
      // productSellingPrice = original base price from product
      // sellingPrice = current effective selling price (SKU / loose / base)
      const formattedItems = items.map((it) => ({
        rowKey: it.rowKey, //  add this

        shopId: it.shopId,
        godownId: it.godownId,
        productId: it.productId,

        quantity: Number(it.quantity || 0),
        unit: getFinalUnitForPayload(it),
        soldUnit: it.soldUnit || getFinalUnitForPayload(it),

        skuId: it.skuId || null,
        isLoose: Boolean(it.isLoose),
        looseUnit: it.looseUnit || null,

        purchasePrice: it.purchasePrice ?? 0,
        profitPercentage: it.profitPercentage ?? 0,
        hsnCode: it.hsnCode || "",

        cgstPercentage: it.cgstPercentage,
        sgstPercentage: it.sgstPercentage,
        cgstAmount: it.cgstAmount,
        sgstAmount: it.sgstAmount,

        sellingPrice: it.sellingPrice,
        rate: it.rate,
        total: it.total,
      }));

      // ---------------- BUILD PAYLOAD ----------------
      const payload = {
        saleType,
        billType,
        priceTier,
        paymentSplits,
        customerId: selectedCustomer, //  FIX
        items: formattedItems,
        grossTotal: totals.gross,
        discount: numeric(totals.discount),
        netTotal: totals.net,
        paidAmount: numeric(totals.paid),
        balanceAmount: totals.balance,
        includeTransport,
        transportDetails: includeTransport ? transport : null,
        includeHandling,
        handlingCharges: includeHandling ? handlingCharges : [],
        companyAllocations,
      };

      // ---------------- POST REQUEST ----------------
      const { data } = await customFetch.post("/sales", payload);

      const savedSale = data?.sale || data;
      const saleId = savedSale?._id;

      if (savedSale?.dueDate) {
        setDueDate(savedSale.dueDate);
      }
      if (saleId) {
        setSavedSaleId(saleId);
        updateTabData(tabId, { savedSaleId: saleId });
        toast.success("Sale created successfully");
        if (selectedCustomer) {
          await fetchSalesForCustomer(selectedCustomer, false);
        }

        //  Reset navigation states so Prev/Next start correctly
        setInCurrentMode(true);
        setTempCurrentSale(null);
        setCurrentVisible(false);
      } else {
        toast.success("Sale created successfully (no id returned)");
      }

      return saleId;
    } catch (err) {
      console.error("Save sale error", err);
      toast.error(err.response?.data?.message || "Error saving sale");
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // 🔹 F3–F7 SKU quick select (max 5 options)
  const handleSkuFunctionKey = (e, rowIndex) => {
    if (isSaved) return;

    const keyMap = {
      F3: 0,
      F4: 1,
      F5: 2,
      F6: 3,
      F7: 4,
    };

    const skuIndex = keyMap[e.key];
    if (skuIndex === undefined) return;

    e.preventDefault();

    const row = items[rowIndex];
    if (!row) return;

    const options = [];

    //  BASE OPTION
    if (row.productBaseUnit) {
      options.push("__BASE__");
    }

    //  SKU OPTIONS (use sku._id)
    if (Array.isArray(row.skuList)) {
      row.skuList
        .filter((sku) => sku && sku._id && sku.sellUnit)
        .forEach((sku) => {
          options.push(sku._id);
        });
    }

    //  LOOSE OPTION
    if (["kg", "l", "ltr"].includes(row.productBaseUnit?.toLowerCase())) {
      options.push("LOOSE");
    }

    const selectedValue = options[skuIndex];
    if (!selectedValue) return;

    //  correct unit update
    handleItemChange(rowIndex, "unit", selectedValue);
  };

  // ---------------- Smart Print Function — opens in clean window and auto prints ----------------
  const openCleanPrintWindow = (url) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("Please allow popups for printing");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Bill</title>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            iframe { border: none; width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <iframe src="${url}" onload="setTimeout(()=>{this.contentWindow.print(); setTimeout(()=>window.close(),1000)}, 800)"></iframe>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handler attached to TextFields & Selects in this file
  // When no next field, we now call onFinal action (save)
  const handleEnterInField = async (e, fieldName, rowIndex) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    // Build key for current position
    let currentKey = fieldName;
    if (rowIndex !== undefined && rowIndex !== null) {
      currentKey = `${fieldName}_${rowIndex}`;
    }

    // Delegate to focusNextLogicalField which handles skipping disabled fields
    const moved = focusNextLogicalField({
      refs,
      currentKey,
      items,
      includeHandling,
      includeTransport,
    });

    if (moved) return;

    // If nothing moved (no next focusable), then final Enter => save
    await saveSale();
  };

  // ---------------- Keyboard shortcuts (Ctrl+E clear, Ctrl+Y save, Ctrl+I/Q prints, Ctrl+B add) ----------------
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Ctrl + E -> Clear
      if (e.ctrlKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleClearForm();
        return;
      }

      // Ctrl + B -> Add product row and focus it
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (isSaved) {
          toast.info("Cannot add product after save");
          return;
        }
        handleAddRow();
        // focus new row's product code after render
        setTimeout(() => {
          const idx = items.length; // previous length -> new index
          focusField(refs, `productCode_${idx}`);
        }, 100);
        return;
      }

      // Ctrl + Y -> Save (only)
      if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        await saveSale();
        return;
      }

      // Ctrl + I -> Print Sales Bill (only if already saved)
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (!savedSaleId) {
          toast.info("Please save before printing (Ctrl + Y)");
          return;
        }
        openCleanPrintWindow(`/en/admin/sales/${savedSaleId}/bill`);
        return;
      }

      // Ctrl + Q -> Print Delivery Bill (only if already saved)
      if (e.ctrlKey && e.key.toLowerCase() === "q") {
        e.preventDefault();
        if (!savedSaleId) {
          toast.info("Please save before printing (Ctrl + Y)");
          return;
        }
        openCleanPrintWindow(`/en/admin/sales/${savedSaleId}/print`);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    savedSaleId,
    items,
    totals,
    includeHandling,
    handlingCharges,
    transport,
    selectedCustomer,
    submitting,
  ]);

  // ---------------- Clear form ----------------
  const handleClearForm = () => {
    setSelectedCustomer("");
    setIncludeHandling(false);
    setIncludeTransport(false);
    setHandlingCharges([]);
    setTransport({
      vehicleNumber: "",
      driverName: "",
      driverPhone: "",
      transportAgency: "",
      remarks: "",
    });
    setTotals({ gross: 0, discount: "", net: 0, paid: "", balance: 0 });
    setItems([
      {
        rowKey: crypto.randomUUID(), //  ADD THIS

        shopId: selectedShop || "",
        productCode: "",
        productId: "",
        name: "",
        hsnCode: "",
        quantity: 0,
        unit: "",
        sellingPrice: 0,

        cgstPercentage: billType === "WITHOUT_GST" ? 0 : 0,
        sgstPercentage: billType === "WITHOUT_GST" ? 0 : 0,
        cgstAmount: 0,
        sgstAmount: 0,

        rate: 0,
        total: 0,
        skuId: "",
        skuList: [],
        productBaseUnit: "",
        isLoose: false,
        looseUnit: "",
        availablePacks: 0,
        availableWeight: 0,
      },
    ]);

    updateTabData(tabId, {
      items: [
        {
          shopId: selectedShop || "",
          productCode: "",
          productId: "",
          name: "",
          hsnCode: "",
          quantity: 0,
          unit: "",
          sellingPrice: 0,
          cgstPercentage: billType === "WITHOUT_GST" ? 0 : 0,
          sgstPercentage: billType === "WITHOUT_GST" ? 0 : 0,
          cgstAmount: 0,
          sgstAmount: 0,
          rate: 0,
          total: 0,
        },
      ],
      totals: { gross: 0, discount: "", net: 0, paid: "", balance: 0 },
      includeHandling: false,
      includeTransport: false,
      handlingCharges: [],
      transport: {
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
        transportAgency: "",
        remarks: "",
      },
    });

    setB2bCompanies([]);
    setSavedSaleId(null); // allow new save (makes form editable)
    setSalesList([]); // clear navigation context
    setCurrentSaleIndex(-1);
    setTempCurrentSale(null);
    setCurrentVisible(false);
    toast.info("Form cleared successfully");
  };

  // ---------------- Submit (Save via button) ----------------
  const handleSubmit = async () => {
    const saleId = await saveSale();
    if (saleId) toast.success("Sale saved successfully");
  };

  // ---------------- Handle Bill Type toggle ----------------
  const handleBillTypeChange = (event, newType) => {
    if (!newType) return;
    setBillType(newType);
    updateTabData(tabId, { billType: newType });

    // When switching to WITHOUT_GST, zero out gst fields and recalc
    // When switching to WITHOUT_GST:
    if (newType === "WITHOUT_GST") {
      setItems((prev) => {
        const updated = prev.map((it) => {
          const sellingPrice = Number(it.sellingPrice) || 0;
          const rate = sellingPrice;
          const total = (Number(it.quantity || 0) || 0) * rate;
          return {
            ...it,
            cgstPercentage: 0,
            sgstPercentage: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            rate,
            total,
          };
        });
        updateTabData(tabId, { items: stripLocationObj(updated) });

        recalcTotalsWrapper(updated);
        return updated;
      });
    } else {
      setItems((prev) => {
        const updated = prev.map((it) => {
          const sellingPrice = Number(it.sellingPrice) || 0;
          const cgstAmount = (sellingPrice * it.cgstPercentage) / 100;
          const sgstAmount = (sellingPrice * it.sgstPercentage) / 100;
          const rate = sellingPrice + cgstAmount + sgstAmount;
          const total = (Number(it.quantity || 0) || 0) * rate;
          return { ...it, cgstAmount, sgstAmount, rate, total };
        });
        recalcTotalsWrapper(updated);
        return updated;
      });
    }
  };

  // ---------------- Fetch sales list for a customer ----------------
  const fetchSalesForCustomer = async (custId, loadLatest = true) => {
    try {
      const { data } = await customFetch.get(`/sales/customer/${custId}`);
      // let sales = data.sales || data.data || [];
      let sales = JSON.parse(JSON.stringify(data.sales || data.data || []));

      //  FIX: Sort by createdAt so latest is ALWAYS last
      sales = sales.sort((a, b) => {
        const t1 = new Date(a.createdAt).getTime();
        const t2 = new Date(b.createdAt).getTime();
        if (t1 !== t2) return t1 - t2;

        //  SECONDARY SORT (Mongo ObjectID timestamp)
        return a._id.localeCompare(b._id);
      });

      console.log(sales, "sorted customer sales response");

      // Detect B2B customer
      let isCustomerB2B = false;
      let companies = [];

      try {
        const custRes = await customFetch.get(`/customer/${custId}`);
        const cust = custRes.data.customer || custRes.data.data || custRes.data;

        const type = String(cust.customerType || cust.type || "").toUpperCase();
        isCustomerB2B = type === "B2B" || type === "BUSINESS";

        companies = cust.companies || cust.companyList || [];
      } catch (err) {
        console.warn("Unable to load customer details for B2B detection");
      }

      // --------------------------
      //  FIXED B2B MAPPING LOGIC
      // --------------------------
      sales = sales.map((origSale) => {
        const sale = JSON.parse(JSON.stringify(origSale)); // deep clone

        if (isCustomerB2B) {
          sale.saleType = "B2B";
          sale.b2bCompanies = companies;

          (sale.items || sale.orderItems || []).forEach((it) => {
            const pid = String(
              typeof it.productId === "object"
                ? it.productId._id
                : it.productId,
            );
            it._pid = pid;
            it.companyAllocation = it.companyAllocation || {};
            if (
              !it.companyAllocation ||
              typeof it.companyAllocation !== "object"
            ) {
              it.companyAllocation = {};
            }
            companies.forEach((comp) => {
              if (!(comp._id in it.companyAllocation)) {
                it.companyAllocation[comp._id] = 0;
              }
            });
          });
        } else {
          sale.saleType = "B2C";
        }

        return sale; //  return cloned + safe sale
      });

      // --------------------------
      // Save to state
      // --------------------------
      setSalesList(sales);

      if (sales.length > 0) {
        const newIndex = sales.length - 1;
        setCurrentSaleIndex(newIndex);

        if (loadLatest) {
          loadSaleIntoForm(sales[newIndex], newIndex);
        }
      } else {
        setCurrentSaleIndex(-1);
      }
    } catch (err) {
      console.error("Failed to load sales for customer", err);
      toast.error("Failed to load customer sales");
      setSalesList([]);
      setCurrentSaleIndex(-1);
    }
  };

  // Normalize DB sale item → UI sale item
  const normalizeSaleItem = (dbItem, products, locations) => {
    const product = products.find(
      (p) => String(p._id) === String(dbItem.productId),
    );

    let location = null;

    if (dbItem.godownId) {
      location = locations.find(
        (l) => l.type === "Godown" && String(l._id) === String(dbItem.godownId),
      );
    }

    if (!location && dbItem.shopId) {
      location = locations.find(
        (l) => l.type === "Shop" && String(l._id) === String(dbItem.shopId),
      );
    }

    return {
      ...dbItem,
      name: product?.name || {},
      productBaseUnit: product?.unit?.en || product?.unit || "",
      skuList: product?.skuList || [],
      soldUnit: dbItem.soldUnit || dbItem.unit || "",
      locationObj: location,
    };
  };

  // ---------------- Load given sale object into form (read-only) ----------------
  const loadSaleIntoForm = (sale, indexInList = -1) => {
    if (!sale) return;
    if (!products || products.length === 0) {
      console.warn("⏳ Products not ready, delaying sale load");
      return;
    }

    try {
      setIsLoadingSale(true);

      // -----------------------------
      //  Map product rows with stable PID (B2C + B2B FIXED)
      // -----------------------------
      const mappedItems = (sale.items || sale.orderItems || []).map((orig) => {
        const normalized = normalizeSaleItem(orig, products, combinedLocations);

        const product =
          normalized.productId && typeof normalized.productId === "object"
            ? normalized.productId
            : products.find(
              (p) => String(p._id) === String(normalized.productId),
            ) || {};

        const baseUnit =
          product.unit?.en || product.unit || normalized.productBaseUnit || "";

        return {
          rowKey: crypto.randomUUID(),

          shopId: normalized.shopId,
          godownId: normalized.godownId,
          locationObj: normalized.locationObj,

          productId: product._id || normalized.productId,
          productCode: product.productCode || normalized.productCode || "",
          name: product.name?.en || product.name || normalized.name || "",

          productBaseUnit: baseUnit,
          unit: normalized.skuId
            ? String(normalized.skuId)
            : normalized.isLoose
              ? "LOOSE"
              : normalized.unit === normalized.productBaseUnit
                ? "__BASE__"
                : normalized.unit || (baseUnit ? "__BASE__" : ""),


          skuId: normalized.skuId || null,
          skuList: normalized.skuList || [],

          isLoose: Boolean(normalized.isLoose),
          looseUnit: normalized.looseUnit || "",
          soldUnit: normalized.soldUnit || normalized.unit || "",
          hsnCode: product.hsnCode || normalized.hsnCode || "",
          quantity: normalized.quantity || 0,

          sellingPrice: normalized.sellingPrice || product.sellingPrice || 0,
          rate: normalized.rate || normalized.sellingPrice || 0,
          total: normalized.total || 0,

          companyAllocation: normalized.companyAllocation || {},
          _pid: normalized._pid || String(product._id || normalized.productId),
        };
      });

      setItems(mappedItems.length ? mappedItems : []);
      setTimeout(() => {
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            unit: it.unit || (it.productBaseUnit ? "__BASE__" : ""),

            productBaseUnit: it.productBaseUnit || "",
            skuList: Array.isArray(it.skuList) ? it.skuList : [],
          })),
        );
      }, 0);
      // -----------------------------
      //  Restore totals
      // -----------------------------
      const grossVal =
        sale.grossTotal ??
        sale.gross ??
        mappedItems.reduce((sum, it) => sum + (it.total || 0), 0);

      setTotals({
        gross: Number(grossVal || 0),
        discount: sale.discount === "" ? "" : Number(sale.discount || 0),
        net: Number(sale.netTotal || sale.net || 0),
        paid: sale.paidAmount === "" ? "" : Number(sale.paidAmount || 0),
        balance: Number(sale.balanceAmount || sale.balance || 0),
      });
      //  Restore payment splits
      setPaymentSplits(
        sale.paymentSplits?.length
          ? sale.paymentSplits
          : [{ mode: "CASH", amount: "" }],
      );
      // -----------------------------
      // Restore handling & transport
      // -----------------------------
      setIncludeHandling(Boolean(sale.includeHandling));
      setHandlingCharges(sale.handlingCharges || []);

      setIncludeTransport(Boolean(sale.includeTransport));
      setTransport(
        sale.transportDetails || {
          vehicleNumber: "",
          driverName: "",
          driverPhone: "",
          transportAgency: "",
          remarks: "",
        },
      );

      // -----------------------------
      //  billType + saleType
      // -----------------------------
      setSaleType(sale.saleType || "B2C");
      setPriceTier(sale.priceTier || "R");
      setBillType(sale.billType || "GST");
      setDueDate(sale.dueDate || null);

      // -----------------------------
      // 5️⃣ Restore Company Allocation (B2B only)
      // -----------------------------
      if (sale.saleType === "B2B" && sale.b2bCompanies) {
        const restoredMap = {};

        (sale.items || sale.orderItems || []).forEach((it) => {
          const pid = String(
            typeof it.productId === "object" ? it.productId._id : it.productId,
          );

          restoredMap[pid] = {};

          // normalize existing allocation
          const stored = it.companyAllocation || {};

          sale.b2bCompanies.forEach((comp) => {
            const idKey = String(comp._id);
            const nameKey = String(comp.companyName || "")
              .trim()
              .toLowerCase();

            restoredMap[pid][idKey] =
              stored[idKey] !== undefined
                ? Number(stored[idKey])
                : stored[nameKey] !== undefined
                  ? Number(stored[nameKey])
                  : 0;
          });
        });

        setCompanyQtyMap(restoredMap);
        setB2bCompanies([...sale.b2bCompanies]);
        console.log(" B2B ALLOCATION RESTORED", {
          saleId: sale._id,
          restoredMap,
          companies: sale.b2bCompanies,
        });
      } else {
        //  B2C clean state
        setB2bCompanies([]);
        setCompanyQtyMap({});
      }

      // -----------------------------
      // 6️⃣ Lock form as read-only
      // -----------------------------
      const sid = sale._id || sale.id || sale.saleId || null;
      setSavedSaleId(sid);

      if (typeof indexInList === "number" && indexInList >= 0) {
        setCurrentSaleIndex(indexInList);
      }

      setTimeout(() => {
        setItems((prev) =>
          prev.map((it) => {
            if (it.locationObj) return it;

            const locId = it.godownId || it.shopId;
            const matched = combinedLocations.find(
              (l) => String(l._id) === String(locId),
            );

            return matched ? { ...it, locationObj: matched } : it;
          }),
        );
      }, 0);

      toast.info("Loaded sale in read-only mode");
    } catch (e) {
      console.error("Error loading sale", e);
      toast.error("Could not load sale");
    } finally {
      setTimeout(() => setIsLoadingSale(false), 50);
    }
  };

  useEffect(() => {
    if (!products.length) return;
    if (!salesList.length) return;
    if (currentSaleIndex < 0) return;
    if (inCurrentMode) return; //  IMPORTANT

    loadSaleIntoForm(salesList[currentSaleIndex], currentSaleIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  const handlePrevSale = () => {
    if (!salesList.length) return;

    // First time entering history
    if (inCurrentMode) {
      setTempCurrentSale({
        items: JSON.parse(JSON.stringify(items)),
        totals: JSON.parse(JSON.stringify(totals)),
        includeHandling,
        handlingCharges: JSON.parse(JSON.stringify(handlingCharges)),
        includeTransport,
        transport: JSON.parse(JSON.stringify(transport)),
        saleType,
        billType,
        selectedCustomer,
        selectedShop,
        b2bCompanies: JSON.parse(JSON.stringify(b2bCompanies)),
        companyQtyMap: JSON.parse(JSON.stringify(companyQtyMap)),
        paymentSplits: JSON.parse(JSON.stringify(paymentSplits)),
        priceTier,
      });

      setInCurrentMode(false);

      const lastIndex = salesList.length - 1;
      setCurrentSaleIndex(lastIndex);
      loadSaleIntoForm(salesList[lastIndex], lastIndex);
      return;
    }

    // Normal prev
    if (currentSaleIndex <= 0) {
      toast.info("Already at the oldest sale");
      return;
    }

    const newIndex = currentSaleIndex - 1;
    setCurrentSaleIndex(newIndex);
    loadSaleIntoForm(salesList[newIndex], newIndex);
  };

  const handleNextSale = () => {
    if (!salesList.length) return;
    if (inCurrentMode) return;

    if (currentSaleIndex >= salesList.length - 1) {
      toast.info("Already at the latest sale");
      return;
    }

    const newIndex = currentSaleIndex + 1;
    setCurrentSaleIndex(newIndex);
    loadSaleIntoForm(salesList[newIndex], newIndex);
  };

  const handleRestoreCurrent = () => {
    if (!tempCurrentSale) {
      toast.info("No stored current form to restore");
      return;
    }

    console.log(" Restoring CURRENT snapshot");

    setIsLoadingSale(true);

    // Restore everything exactly
    setItems(JSON.parse(JSON.stringify(tempCurrentSale.items)));
    setTotals(JSON.parse(JSON.stringify(tempCurrentSale.totals)));
    setIncludeHandling(tempCurrentSale.includeHandling);
    setHandlingCharges(
      JSON.parse(JSON.stringify(tempCurrentSale.handlingCharges)),
    );
    setIncludeTransport(tempCurrentSale.includeTransport);
    setTransport(JSON.parse(JSON.stringify(tempCurrentSale.transport)));
    setSaleType(tempCurrentSale.saleType);
    setBillType(tempCurrentSale.billType);
    setSelectedCustomer(tempCurrentSale.selectedCustomer);
    setSelectedShop(tempCurrentSale.selectedShop);
    setB2bCompanies(JSON.parse(JSON.stringify(tempCurrentSale.b2bCompanies)));
    setCompanyQtyMap(JSON.parse(JSON.stringify(tempCurrentSale.companyQtyMap)));
    setPaymentSplits(tempCurrentSale.paymentSplits);
    setPriceTier(tempCurrentSale.priceTier || "R");

    updateTabData(tabId, {
      items: tempCurrentSale.items,
      totals: tempCurrentSale.totals,
      includeHandling: tempCurrentSale.includeHandling,
      handlingCharges: tempCurrentSale.handlingCharges,
      includeTransport: tempCurrentSale.includeTransport,
      transport: tempCurrentSale.transport,
      saleType: tempCurrentSale.saleType,
      billType: tempCurrentSale.billType,
      selectedCustomer: tempCurrentSale.selectedCustomer,
      selectedShop: tempCurrentSale.selectedShop,
      b2bCompanies: tempCurrentSale.b2bCompanies,
      companyQtyMap: tempCurrentSale.companyQtyMap,
      priceTier: tempCurrentSale.priceTier,
    });

    // Enter editable mode
    setSavedSaleId(null);
    setCurrentVisible(false);
    setInCurrentMode(true);

    setTimeout(() => setIsLoadingSale(false), 150);

    toast.success("Restored editable form");
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{ fontWeight: "bold", fontSize: 18, textAlign: "center", mb: 1 }}
      >
        SALES ENTRY FORM
      </Box>
      <Paper elevation={2} sx={{ p: 1, borderRadius: 3 }}>
        {/*  TOP ROW: Customer (Left) + Net Total (Right) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            mb: 1,
          }}
        >
          {/*  Customer Section */}
          <Box sx={{ flex: 1 }}>
            <CustomerSection
              customers={customers}
              selectedCustomer={selectedCustomer}
              handleCustomerChange={handleCustomerChange}
              setOpenCustomerModal={setOpenCustomerModal}
              saleType={saleType}
              isSaved={isSaved}
              refs={refs}
              handleEnterInField={handleEnterInField}
              searchCustomer={searchCustomer}
              setSearchCustomer={setSearchCustomer}
              compact={true}
              priceTier={priceTier}
              setPriceTier={(val) => {
                setPriceTier(val);
                updateTabData(tabId, { priceTier: val });
              }}
            />
          </Box>

          {/*  Net Total Box */}
          <Box
            sx={{
              px: 2,
              py: 1,
              borderRadius: 2,
              backgroundColor: "#E8F5E9",
              border: "1px solid #A5D6A7",
              minWidth: 220,
              textAlign: "center",
              height: "130px",
            }}
          >
            <Typography
              sx={{ fontSize: 13, color: "#2E7D32", fontWeight: 600 }}
            >
              Net Total
            </Typography>

            {dueDate && (
              <Typography sx={{ fontSize: 12, color: "#444" }}>
                Due: {new Date(dueDate).toLocaleDateString()}
              </Typography>
            )}

            <Typography
              sx={{
                fontSize: 26,
                fontWeight: 900,
                color: "#1B5E20",
                lineHeight: 1.2,
                height: "80px",
              }}
            >
              ₹ {Number(totals.net || 0).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/*  Product Table (More Space) */}
        <SalesItemsTable
          items={items}
          setItems={setItems}
          combinedLocations={combinedLocations}
          productSearchOptions={productSearchOptions}
          setProductSearchText={setProductSearchText}
          products={products}
          isSaved={isSaved}
          billType={billType}
          refs={refs}
          handleItemChange={handleItemChange}
          handleProductCodeChange={handleProductCodeChange}
          handleDeleteRow={handleDeleteRow}
          handleAddRow={handleAddRow}
          focusField={focusField}
          focusNextLogicalField={focusNextLogicalField}
          handleEnterInField={handleEnterInField}
          handleSkuFunctionKey={handleSkuFunctionKey}
          getText={getText}
          includeHandling={includeHandling}
          includeTransport={includeTransport}
          onQuickPurchase={(rowIndex) => {
            setPurchaseContext({
              rowIndex,
              productId: items[rowIndex].productId,
              productCode: items[rowIndex].productCode,
              shopId: items[rowIndex].shopId,
              godownId: items[rowIndex].godownId,
            });
            setOpenQuickPurchase(true);
          }}
        />

        {/* 🔹 B2B Allocation */}
        <B2BAllocationTable
          saleType={saleType}
          items={items}
          b2bCompanies={b2bCompanies}
          companyQtyMap={companyQtyMap}
          setCompanyQtyMap={setCompanyQtyMap}
          isSaved={isSaved}
          getText={getText}
        />

        {/*  Totals + Payment + Billtype */}
        <TotalsSection
          totals={totals}
          items={items}
          isSaved={isSaved}
          refs={refs}
          recalcTotals={recalcTotalsWrapper}
          updateTabData={updateTabData}
          tabId={tabId}
          handleEnterInField={handleEnterInField}
          billType={billType}
          handleBillTypeChange={handleBillTypeChange}
          paymentSplits={paymentSplits}
          setPaymentSplits={setPaymentSplits}
        />

        {/*  Additional Charges */}
        <AdditionalChargesSection
          tabId={tabId}
          updateTabData={updateTabData}
          includeTransport={includeTransport}
          setIncludeTransport={setIncludeTransport}
          transport={transport}
          setTransport={setTransport}
          includeHandling={includeHandling}
          setIncludeHandling={setIncludeHandling}
          handlingCharges={handlingCharges}
          setHandlingCharges={setHandlingCharges}
          items={items}
          recalcTotals={recalcTotalsWrapper}
          isSaved={isSaved}
          refs={refs}
          focusNextLogicalField={focusNextLogicalField}
          onFinalEnter={async () => {
            await saveSale();
          }}
        />

        {/*  Actions Bar */}
        <SalesActionsBar
          salesList={salesList}
          currentSaleIndex={currentSaleIndex}
          handlePrevSale={handlePrevSale}
          handleNextSale={handleNextSale}
          handleRestoreCurrent={handleRestoreCurrent}
          tempCurrentSale={tempCurrentSale}
          handleClearForm={handleClearForm}
          handleSubmit={handleSubmit}
          submitting={submitting}
          isSaved={isSaved}
          refs={refs}
        />
      </Paper>

      {/*  Customer Modal */}
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
              setOpenCustomerModal(false);
              toast.success("Customer added!");

              const res = await customFetch.get("/customer");
              const updated = res.data.customers || [];
              setCustomers(updated);

              const newCust = updated[updated.length - 1];
              setSelectedCustomer(newCust._id);

              handleCustomerChange({ target: { value: newCust._id } });
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={openQuickPurchase}
        onClose={() => setOpenQuickPurchase(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Quick Purchase
          <IconButton size="small" onClick={() => setOpenQuickPurchase(false)}>
            ✕
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <PurchaseForm
            defaultProduct={purchaseContext}
            onSuccess={async () => {
              const { rowIndex, productId, shopId, godownId } = purchaseContext;

              const res = await customFetch.get("/inventory/stock/sales", {
                params: { productId, shopId, godownId },
              });

              setItems((prev) => {
                const copy = [...prev];
                copy[rowIndex].availablePacks = res.data.availablePacks;
                copy[rowIndex].availableWeight = res.data.availableWeight;

                return copy;
              });

              setOpenQuickPurchase(false);
              toast.success("Stock updated. Continue sale.");
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
