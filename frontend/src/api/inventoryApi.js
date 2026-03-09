import customFetch from "../utils/customFetch";

export const getProductStock = async (shopId, productId) => {
  const res = await customFetch(`/inventory/stock/${shopId}/${productId}`);
  return res.data.data;
};
