import customFetch from "../utils/customFetch";

//* Create a new sale (B2B or B2C)
export const createSale = async (data) => {
  const response = await customFetch.post("/sales", data);
  return response.data;
};

//* Update payment for a sale
export const updateSalePayment = async (id, paidNow) => {
  const response = await customFetch.put(`/sales/${id}/payment`, { paidNow });
  return response.data;
};

//* Get all sales (with filters)
export const getSales = async (params = {}) => {
  const response = await customFetch.get("/sales", { params });
  return response.data;
};

//* Get single sale details
export const getSaleById = async (id, lang = "en") => {
  const response = await customFetch.get(`/sales/${id}`, { params: { lang } });
  return response.data;
};

//* Get customer ledger
export const getCustomerLedger = async (customerId, params = {}) => {
  const response = await customFetch.get(`/sales/ledger/${customerId}`, {
    params,
  });
  return response.data;
};

//* Get shop-wise sales report
export const getSalesReport = async (shopId, params = {}) => {
  const response = await customFetch.get(`/sales/report/${shopId}`, { params });
  return response.data;
};

//* Delete a sale
export const deleteSale = async (id) => {
  const response = await customFetch.delete(`/sales/${id}`);
  return response.data;
};

//* Generate token sale
export const generateTokenSale = async (data) => {
  const response = await customFetch.post("/sales/token", data);
  return response.data;
};

//* Complete token-based sale
export const completeTokenSale = async (id, data) => {
  const response = await customFetch.post(`/sales/token/${id}/complete`, data);
  return response.data;
};
