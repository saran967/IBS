// // src/hooks/useProducts.js
// import { useState, useEffect, useCallback } from "react";
// import customFetch from "../utils/customFetch";
// import { toast } from "react-toastify";

// export const useProducts = () => {
//   const [products, setProducts] = useState([]);
//   const [editProduct, setEditProduct] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const fetchProducts = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await customFetch.get("/product");
//       const list = res.data?.products || [];

//       const formatted = list.map((p) => ({
//         ...p,
//         _id: p._id.toString(),
//         enableDelivery: p.enableDelivery ?? false,
//         categoryDeliveryEnabled: p.categoryDeliveryEnabled ?? true,
//       }));

//       setProducts(formatted);
//     } catch {
//       toast.error("Failed to load products");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchProducts();
//   }, []);

//   const toggleProductDelivery = async (id, currentState) => {
//     const newState = !currentState;

//     setProducts((prev) =>
//       prev.map((p) => (p._id === id ? { ...p, enableDelivery: newState } : p))
//     );

//     try {
//       await customFetch.patch(`/product/${id}/enable-delivery`, {
//         enableDelivery: newState,
//       });

//       toast.success(newState ? "Delivery enabled" : "Delivery disabled");
//       fetchProducts();
//     } catch {
//       toast.error("Failed to update");
//       fetchProducts();
//     }
//   };

//   return {
//     products,
//     setProducts,
//     loading,
//     fetchProducts,
//     toggleProductDelivery,
//     deleteProduct: () => {},
//     editProduct,
//     setEditProduct,
//   };
// };


// src/hooks/useProducts.js
import { useState, useEffect, useCallback } from "react";
import customFetch from "../utils/customFetch";
import { toast } from "react-toastify";

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(10);

  const fetchProducts = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const res = await customFetch.get("/product", {
        params: { page: pageToLoad, limit },
      });
      const list = res.data?.products || [];

      const formatted = list.map((p) => ({
        ...p,
        _id: p._id.toString(),
        enableDelivery: p.enableDelivery ?? false,
        categoryDeliveryEnabled: p.categoryDeliveryEnabled ?? true,
      }));

      setProducts(formatted);
      setPage(res.data?.currentPage || pageToLoad);
      setTotalPages(res.data?.totalPages || 1);
      setTotalRecords(res.data?.totalRecords || formatted.length);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleProductDelivery = async (id, currentState) => {
    const newState = !currentState;

    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, enableDelivery: newState } : p))
    );

    try {
      await customFetch.patch(`/product/${id}/enable-delivery`, {
        enableDelivery: newState,
      });

      toast.success(newState ? "Delivery enabled" : "Delivery disabled");
      fetchProducts();
    } catch {
      toast.error("Failed to update");
      fetchProducts();
    }
  };

  const toggleProductInventory = async (id, currentState) => {
    const newState = !currentState;

    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, maintainInventory: newState } : p))
    );

    try {
      await customFetch.patch(`/product/${id}/maintain-inventory`, {
        maintainInventory: newState,
      });

      toast.success(newState ? "Inventory Tracking Enabled" : "Inventory Tracking Disabled");
      fetchProducts();
    } catch {
      toast.error("Failed to update inventory tracking");
      fetchProducts();
    }
  };

  const deleteProduct = async (id) => {
    try {
      await customFetch.delete(`/product/${id}`);
      toast.success("Product deleted");
      setProducts((prev) => prev.filter((p) => p._id !== id));
      fetchProducts(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete product");
    }
  };

  return {
    products,
    setProducts,
    loading,
    page,
    totalPages,
    totalRecords,
    limit,
    fetchProducts,
    setPage,
    toggleProductDelivery,
    toggleProductInventory,
    deleteProduct,
    editProduct,
    setEditProduct,
  };
};