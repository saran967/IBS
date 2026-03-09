import customFetch from "../utils/customFetch";

// 📦 Get all products
export const getProducts = async () => {
  const response = await customFetch.get("/product");
  return response.data; // [{ _id, productName, price, gst, ... }]
};

// 📦 Get single product
export const getProductById = async (id) => {
  const response = await customFetch.get(`/product/${id}`);
  return response.data;
};

// 📦 Create new product (optional)
export const createProduct = async (data) => {
  const response = await customFetch.post("/product", data);
  return response.data;
};
