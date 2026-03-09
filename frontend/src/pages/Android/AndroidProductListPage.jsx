import React, { useEffect, useState, useRef } from "react";
import {
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Box,
  Switch,
  Card,
  CardContent,
  TextField,
  Autocomplete,
  Button,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import JsBarcode from "jsbarcode";
import ProductForm from "../../components/Admin/ProductionForm";
import customFetch from "../../utils/customFetch";
import { useLanguage } from "../../context/LanguageContext";
import AndroidProductPage from "./AndroidProductPage";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);

  const lang = useLanguage();
  const navigate = useNavigate();

  const makeCategoryKey = (category) =>
    `${category?.en || "Unknown"}-${
      category?.ta || category?.en || "அறியாதது"
    }`;

  // -------------------------
  // Fetch products
  // -------------------------
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await customFetch.get("/product");
      const data = res.data?.products || res.data || [];
      const productsWithDefaults = data.map((p) => ({
        ...p,
        _id: p._id.toString(),
        enableDelivery: p.enableDelivery ?? true,
        categoryDeliveryEnabled: p.categoryDeliveryEnabled ?? false,
      }));
      setProducts(productsWithDefaults);

      // Extract categories
      const categoryMap = new Map();
      productsWithDefaults.forEach((p) => {
        const key = makeCategoryKey(p.category);
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            key,
            en: p.category?.en || "Unknown",
            ta: p.category?.ta || p.category?.en || "அறியாதது",
            productIds: [],
          });
        }
        categoryMap.get(key).productIds.push(p._id);
      });

      const cats = Array.from(categoryMap.values()).map((cat) => ({
        ...cat,
        enabled: cat.productIds.every(
          (id) =>
            productsWithDefaults.find((p) => p._id === id)
              ?.categoryDeliveryEnabled,
        ),
      }));
      setCategories(cats);

      // Fetch shops
      await fetchShopsFromPurchases(productsWithDefaults);

      if (selectedCategory) {
        const refreshed = cats.find((c) => c.key === selectedCategory.key);
        if (refreshed) setSelectedCategory(refreshed);
      }
    } catch (err) {
      console.error("fetchProducts err:", err);
      toast.error(
        lang === "ta" ? "பொருட்களை பெற முடியவில்லை" : "Error fetching products",
      );
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Fetch shops via purchases
  // -------------------------
  const fetchShopsFromPurchases = async (productsList) => {
    try {
      const res = await customFetch.get("/purchase");
      const purchases = res.data?.purchases || [];
      const shopMap = new Map();

      purchases.forEach((purchase) => {
        purchase.shopSplits?.forEach((split) => {
          if (!split.shop) return;

          const shopId =
            typeof split.shop === "string" ? split.shop : split.shop._id;
          if (!shopId) return;

          const shopEn =
            typeof split.shop === "string"
              ? `Shop ${shopId}`
              : split.shop.en || split.shop.name?.en || `Shop ${shopId}`;
          const shopTa =
            typeof split.shop === "string"
              ? `அடைப்பகம் ${shopId}`
              : split.shop.ta || split.shop.name?.ta || shopEn;

          const key = `${shopId}-${shopEn}-${shopTa}`;
          if (!shopMap.has(key)) {
            shopMap.set(key, {
              key,
              id: shopId.toString(),
              en: shopEn,
              ta: shopTa,
              productIds: [],
              enabled: true,
            });
          }

          const productId =
            typeof purchase.productId === "string"
              ? purchase.productId
              : purchase.productId?._id?.toString();
          if (productId) shopMap.get(key).productIds.push(productId);
        });
      });

      const shopList = Array.from(shopMap.values()).map((shop) => {
        const allEnabled = shop.productIds.every(
          (id) =>
            productsList.find((p) => p._id.toString() === id)?.enableDelivery,
        );
        return { ...shop, enabled: allEnabled };
      });

      setShops(shopList);

      if (selectedShop) {
        const refreshed = shopList.find((s) => s.key === selectedShop.key);
        if (refreshed) setSelectedShop(refreshed);
      }
    } catch (err) {
      console.error("fetchShopsFromPurchases err:", err);
      toast.error(
        lang === "ta"
          ? "அடைப்பகங்களை பெற முடியவில்லை"
          : "Failed to fetch shops",
      );
    }
  };

  // -------------------------
  // Barcode renderer
  // -------------------------
  const BarcodeRenderer = ({ code, id }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (!code || !ref.current) return;
      ref.current.innerHTML = "";
      try {
        JsBarcode(ref.current, code, {
          format: "CODE128",
          width: 1,
          height: 30,
          displayValue: true,
          fontSize: 10,
        });
      } catch (e) {
        console.error("JsBarcode error:", e);
      }
    }, [code, id]);
    return <svg ref={ref} />;
  };

  // -------------------------
  // Delete product
  // -------------------------
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        lang === "ta" ? "இந்த பொருளை நீக்கவா?" : "Delete this product?",
      )
    )
      return;
    try {
      await customFetch.delete(`/product/${id}`);
      toast.success(
        lang === "ta" ? "வெற்றிகரமாக நீக்கப்பட்டது" : "Deleted successfully",
      );
      fetchProducts();
    } catch (err) {
      console.error("handleDelete err:", err);
      toast.error(
        lang === "ta" ? "நீக்க முடியவில்லை" : "Error deleting product",
      );
    }
  };

  // -------------------------
  // Toggle product delivery
  // -------------------------
  const handleToggleDelivery = async (productId, currentState) => {
    const newState = !currentState;

    setProducts((prev) =>
      prev.map((p) =>
        p._id === productId ? { ...p, enableDelivery: newState } : p,
      ),
    );

    try {
      await customFetch.patch(`/product/${productId}/enable-delivery`, {
        enableDelivery: newState,
      });
      toast.success(
        lang === "ta"
          ? `விநியோகத்தை ${newState ? "இயலுமைப்படுத்தப்பட்டது" : "மூடப்பட்டது"}`
          : `Delivery ${newState ? "enabled" : "disabled"}`,
      );
      fetchProducts();
    } catch (err) {
      console.error("handleToggleDelivery err:", err);
      toast.error(
        lang === "ta"
          ? "விநியோகத்தை புதுப்பிக்க முடியவில்லை"
          : "Failed to update delivery",
      );
      fetchProducts();
    }
  };

  // -------------------------
  // Toggle shop delivery
  // -------------------------
  const handleShopToggle = async (shopKey, currentState) => {
    const shop = shops.find((s) => s.key === shopKey);
    if (!shop) return;
    const newState = !currentState;

    const productsToUpdate = shop.productIds
      .map((pid) => products.find((p) => p._id.toString() === pid.toString()))
      .filter(Boolean);

    if (productsToUpdate.length === 0) {
      toast.error(
        lang === "ta"
          ? "இந்த அடைப்பு காணப்படவில்லை"
          : "No products found for this shop",
      );
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        shop.productIds.includes(p._id.toString())
          ? { ...p, enableDelivery: newState }
          : p,
      ),
    );

    setShops((prev) =>
      prev.map((s) => (s.key === shopKey ? { ...s, enabled: newState } : s)),
    );

    try {
      await Promise.all(
        productsToUpdate.map((p) =>
          customFetch.patch(`/product/${p._id}/enable-delivery`, {
            enableDelivery: newState,
          }),
        ),
      );

      toast.success(
        lang === "ta"
          ? `அடைப்பகம் விநியோகம் ${
              newState ? "இயலுமைப்படுத்தப்பட்டது" : "மூடப்பட்டது"
            }`
          : `Shop delivery ${newState ? "enabled" : "disabled"}`,
      );
      fetchProducts();
    } catch (err) {
      console.error("handleShopToggle err:", err);
      toast.error(
        lang === "ta"
          ? "அடைப்பகத்தை புதுப்பிக்க முடியவில்லை"
          : "Failed to update shop delivery",
      );
      fetchProducts();
    }
  };

  // -------------------------
  // Toggle category delivery (Updated to auto toggle products delivery)
  // -------------------------

  const handleCategoryToggle = async (categoryKey, currentState) => {
    const category = categories.find((c) => c.key === categoryKey);
    if (!category) return;
    const newState = !currentState;

    //  Update category state
    setCategories((prev) =>
      prev.map((c) =>
        c.key === categoryKey ? { ...c, enabled: newState } : c,
      ),
    );

    //  Update all products belonging to this category
    setProducts((prevProducts) => {
      const updatedProducts = prevProducts.map((p) => {
        const key = makeCategoryKey(p.category);
        if (key === categoryKey) return { ...p, enableDelivery: newState };
        return p;
      });

      // Update shops based on updated products
      setShops((prevShops) =>
        prevShops.map((s) => {
          const allProductsEnabled = s.productIds.every((pid) => {
            const product = updatedProducts.find((p) => p._id === pid);
            return product ? product.enableDelivery : true;
          });
          return { ...s, enabled: allProductsEnabled };
        }),
      );

      return updatedProducts;
    });

    //  Backend update for all products in this category
    try {
      await customFetch.patch("/product/category/enable-delivery", {
        categoryName: { en: category.en, ta: category.ta },
        enabled: newState,
      });

      toast.success(
        lang === "ta"
          ? `வகை விநியோகம் ${
              newState ? "இயலுமைப்படுத்தப்பட்டது" : "மூடப்பட்டது"
            }`
          : `Category delivery ${newState ? "enabled" : "disabled"}`,
      );

      fetchProducts(); // refresh data from backend
    } catch (err) {
      console.error("handleCategoryToggle err:", err);
      toast.error(
        lang === "ta"
          ? "வகையை புதுப்பிக்க முடியவில்லை"
          : "Failed to update category delivery",
      );
      fetchProducts();
    }
  };

  // -------------------------
  // Initial fetch
  // -------------------------
  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={3}>
        <CircularProgress />
      </Box>
    );

  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory) {
        const key = makeCategoryKey(p.category);
        if (key !== selectedCategory.key) return false;
      }
      if (selectedShop) {
        const shopInProduct = shops.find((s) => s.productIds.includes(p._id));
        if (!shopInProduct || shopInProduct.key !== selectedShop.key)
          return false;
      }
      return true;
    })
    .sort((a, b) => (a.name?.en || "").localeCompare(b.name?.en || ""));

  const getField = (field) =>
    lang === "ta" ? field?.ta || field?.en || "-" : field?.en || "-";

  const headers = {
    image: lang === "ta" ? "படம்" : "Image",
    name: lang === "ta" ? "பெயர்" : "Name",
    category: lang === "ta" ? "வகை" : "Category",
    shop: lang === "ta" ? "அடைப்பகம்" : "Shop",
    unit: lang === "ta" ? "அளவு" : "Unit",
    weight: lang === "ta" ? "எடை" : "Weight",
    purchase: lang === "ta" ? "கொள்முதல் விலை" : "Purchase",
    profit: lang === "ta" ? "லாபம் %" : "Profit %",
    gst: lang === "ta" ? "GST %" : "GST %",
    selling: lang === "ta" ? "விற்பனை விலை" : "Selling Price",
    code: lang === "ta" ? "குறியீடு" : "Code",
    barcode: lang === "ta" ? "பார்கோட்" : "Barcode",
    delivery: lang === "ta" ? "விநியோகம்" : "Delivery",
    action: lang === "ta" ? "செயல்" : "Action",
  };

  return (
    <Paper sx={{ m: 2, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {lang === "ta" ? "பொருள் மேலாண்மை" : "Product Management"}
      </Typography>

      {/* Category & Shop selector */}
      <Box mb={2} display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Autocomplete
          options={categories}
          getOptionLabel={(option) =>
            lang === "ta" ? option.ta || option.en : option.en
          }
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={lang === "ta" ? "வகை" : "Category"}
              size="small"
              sx={{ width: 200 }}
            />
          )}
        />
        {selectedCategory && (
          <Card sx={{ minWidth: 180, p: 0.5 }}>
            <CardContent
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.5,
              }}
            >
              <Typography variant="body2">
                {lang === "ta"
                  ? selectedCategory.ta || selectedCategory.en
                  : selectedCategory.en}
              </Typography>
              <Switch
                checked={selectedCategory.enabled}
                onChange={() =>
                  handleCategoryToggle(
                    selectedCategory.key,
                    selectedCategory.enabled,
                  )
                }
                color="success"
                size="small"
              />
            </CardContent>
          </Card>
        )}

        <Autocomplete
          options={shops}
          getOptionLabel={(option) =>
            lang === "ta" ? option.ta || option.en : option.en
          }
          value={selectedShop}
          onChange={(e, newValue) => setSelectedShop(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={lang === "ta" ? "அடைப்பகம்" : "Shop"}
              size="small"
              sx={{ width: 220 }}
            />
          )}
        />
        {selectedShop && (
          <Card sx={{ minWidth: 180, p: 0.5 }}>
            <CardContent
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 0.5,
              }}
            >
              <Typography variant="body2">
                {lang === "ta"
                  ? selectedShop.ta || selectedShop.en
                  : selectedShop.en}
              </Typography>
              <Switch
                checked={selectedShop.enabled}
                onChange={() =>
                  handleShopToggle(selectedShop.key, selectedShop.enabled)
                }
                color="success"
                size="small"
              />
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Product Page */}
      <AndroidProductPage
        refreshList={fetchProducts}
        editProduct={editProduct}
        clearEdit={() => setEditProduct(null)}
      />

      <Button
        variant="outlined"
        size="small"
        sx={{ mt: 1, mb: 2 }}
        onClick={() => navigate("/en/admin/product/price-history/all")}
      >
        {lang === "ta" ? "அனைத்து விலை மாற்றங்கள்" : "View All Price Changes"}
      </Button>

      {/* Product Table */}
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              {Object.values(headers).map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  {lang === "ta" ? "பொருட்கள் இல்லை" : "No products"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => {
                const shopInProduct = shops.find((s) =>
                  s.productIds.includes(p._id),
                );
                return (
                  <TableRow key={p._id}>
                    <TableCell>
                      {p.images && p.images.length > 0 ? (
                        <img
                          src={p.images[0]}
                          alt="product"
                          style={{
                            width: 50,
                            height: 50,
                            objectFit: "cover",
                            borderRadius: 5,
                          }}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{getField(p.name)}</TableCell>
                    <TableCell>{getField(p.category)}</TableCell>
                    <TableCell>
                      {shopInProduct
                        ? lang === "ta"
                          ? shopInProduct.ta || shopInProduct.en
                          : shopInProduct.en
                        : "-"}
                    </TableCell>
                    <TableCell>{getField(p.unit)}</TableCell>
                    <TableCell>{p.weight ?? "-"}</TableCell>
                    <TableCell>₹{p.purchasePrice ?? 0}</TableCell>
                    <TableCell>{p.profitPercentage ?? 0}%</TableCell>
                    <TableCell>{p.gstPercentage ?? 0}%</TableCell>
                    <TableCell>₹{p.sellingPrice ?? 0}</TableCell>
                    <TableCell>{p.productCode}</TableCell>
                    <TableCell>
                      {p.productCode ? (
                        <BarcodeRenderer code={p.productCode} id={p._id} />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={p.enableDelivery}
                        onChange={() =>
                          handleToggleDelivery(p._id, p.enableDelivery)
                        }
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => setEditProduct(p)}
                        sx={{ mr: 1 }}
                      >
                        {lang === "ta" ? "திருத்து" : "Edit"}
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          navigate(`/en/admin/product/${p._id}/price-history`)
                        }
                      >
                        {lang === "ta" ? "விலை வரலாறு" : "Price History"}
                      </Button>
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(p._id)}
                        size="small"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default ProductList;
