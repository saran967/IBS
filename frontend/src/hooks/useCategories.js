// // src/hooks/useCategories.js
// import { useState, useCallback } from "react";
// import customFetch from "../utils/customFetch";
// import { toast } from "react-toastify";

// export const useCategories = (products, refresh) => {
//   const [categories, setCategories] = useState([]);
//   const [selectedCategory, setSelectedCategory] = useState(null);

//   const makeKey = (c) => (c?.en || "").trim().toLowerCase();

//   const buildCategories = useCallback(() => {
//     if (!products.length) return setCategories([]);

//     const map = new Map();

//     products.forEach((p) => {
//       const key = makeKey(p.category);
//       if (!map.has(key)) {
//         map.set(key, {
//           key,
//           en: p.category?.en,
//           ta: p.category?.ta || p.category?.en,
//           productIds: [],
//         });
//       }
//       map.get(key).productIds.push(p._id);
//     });

//     const final = [...map.values()].map((cat) => ({
//       ...cat,
//       enabled: cat.productIds.every((id) => {
//         const pr = products.find((p) => p._id === id);
//         return pr?.categoryDeliveryEnabled ?? true;
//       }),
//     }));

//     setCategories(final);
//   }, [products]);

//   const toggleCategory = async (cat) => {
//     const newState = !cat.enabled;

//     refresh.setProducts((prev) =>
//       prev.map((p) =>
//         makeKey(p.category) === cat.key
//           ? { ...p, categoryDeliveryEnabled: newState }
//           : p
//       )
//     );

//     setSelectedCategory({ ...cat, enabled: newState });

//     try {
//       await customFetch.patch("/product/category/enable-delivery", {
//         categoryName: { en: cat.en, ta: cat.ta },
//         enabled: newState,
//       });

//       toast.success(newState ? "Enabled" : "Disabled");
//       refresh.fetchProducts();
//     } catch {
//       toast.error("Failed");
//       refresh.fetchProducts();
//     }
//   };

//   return {
//     categories,
//     selectedCategory,
//     setSelectedCategory,
//     buildCategories,
//     toggleCategory,
//     makeCategoryKey: makeKey,
//   };
// };

import { useEffect, useState, useCallback } from "react";
import customFetch from "../utils/customFetch";
import { toast } from "react-toastify";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // --------------------------------
  // FETCH ALL CATEGORIES
  // --------------------------------
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const res = await customFetch.get("/product/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // --------------------------------
  // TOGGLE CATEGORY (UI ONLY for now)
  // --------------------------------
  const toggleCategory = (category) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.en === category.en ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  // --------------------------------
  // CATEGORY KEY (for filtering)
  // --------------------------------
  const normalize = (v) => String(v || "").trim().toLowerCase();
  const makeCategoryKey = (cat) => normalize(cat?.en || cat?.ta);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    selectedCategory,
    setSelectedCategory,
    toggleCategory,
    makeCategoryKey,
    loadingCategories,
    refetchCategories: fetchCategories,
  };
};
