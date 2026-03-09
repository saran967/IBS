import customFetch from "../utils/customFetch";

//* Create SubAdmin
export const createSubAdmin = async (data) => {
  const response = await customFetch.post("/users/subadmin", data);
  return response.data;
};

//* Get all SubAdmins (optional for listing)
export const getSubAdmins = async () => {
  const response = await customFetch.get("users/subadmins");
  return response.data;
};

//*---------- B2B and B2C Customer APIs ----------//
//* Get all customers (with optional type filter)
export const getCustomers = async (type = "") =>
  customFetch.get(`/customer${type ? `?type=${type}` : ""}`);
//* Get single customer by ID
export const getCustomerById = async (id) => customFetch.get(`/customer/${id}`);
//* Create a new customer

export const createCustomer = async (data) =>
  customFetch.post("/customer", data);

//* Update customer by ID
export const updateCustomer = async (id, data) =>
  customFetch.patch(`/customer/${id}`, data);
//* Delete customer by ID
export const deleteCustomer = async (id) =>
  customFetch.delete(`/customer/${id}`);

//* Add company to existing customer
export const addCompanyToCustomer = async (customerId, data) =>
  customFetch.post(`/customer/${customerId}/company`, data);

//* Delete company from existing customer
export const deleteCompanyFromCustomer = async (customerId, companyId) =>
  customFetch.delete(`/customer/${customerId}/company/${companyId}`);

export const recordCustomerPayment = (data) =>
  customFetch.post("/customer/payment", data);

export const getCustomerLedger = async (id) =>
  customFetch.get(`/customer/${id}/ledger`);

