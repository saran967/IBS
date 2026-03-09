import { useState, useCallback } from "react";
import customFetch from "../utils/customFetch";
import { toast } from "react-toastify";

export const useShops = () => {
  const [shops, setShops] = useState([]);

  // ------------------------------
  // LOAD SHOPS CORRECTLY
  // ------------------------------
  const buildShops = useCallback(async () => {
    try {
      const res = await customFetch.get("/shops");

      // Backend returns: { success: true, shops: [...] }
      const list = res.data || [];

      const formatted = list.map((s) => ({
        id: s._id.toString(),
        key: s._id.toString(),
        en: s.name?.en,
        ta: s.name?.ta || s.name?.en,
        enabled: s.deliveryEnabled ?? true,
      }));

      setShops(formatted);
    } catch (err) {
      console.error("buildShops error:", err);
      toast.error("Failed to load shops");
    }
  }, []);

  // ------------------------------
  // TOGGLE SHOP DELIVERY
  // ------------------------------
  const toggleShop = async (shop) => {
    const newState = !shop.enabled;

    // Update UI instantly
    setShops((prev) =>
      prev.map((s) => (s.id === shop.id ? { ...s, enabled: newState } : s))
    );

    try {
      await customFetch.patch("/shops/delivery-toggle", {
        shopId: shop.id,
        enabled: newState,
      });

      toast.success(
        newState ? "Shop delivery enabled" : "Shop delivery disabled"
      );

      // Refresh from backend after toggle
      buildShops();
    } catch (err) {
      console.error("toggleShop error:", err);
      toast.error("Failed to update shop delivery");

      // Reset UI to server state
      buildShops();
    }
  };

  return { shops, buildShops, toggleShop };
};
