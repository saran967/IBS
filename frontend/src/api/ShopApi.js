import customFetch from "../utils/customFetch";

// 🏬 Get all shops
export const getShops = async () => {
  const response = await customFetch.get("/shops");
  return response.data; // [{ _id, shopName, ownerName, ... }]
};

// 🏬 Get single shop by ID
export const getShopById = async (id) => {
  const response = await customFetch.get(`/shops/${id}`);
  return response.data;
};

// 🏬 Create new shop (if needed)
export const createShop = async (data) => {
  const response = await customFetch.post("/shops", data);
  return response.data;
};
