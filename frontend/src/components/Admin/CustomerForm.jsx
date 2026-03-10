import React, { useState, useEffect } from "react";
import {
  Typography,
  TextField,
  Button,
  MenuItem,
  Grid,
  IconButton,
  CircularProgress,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  useTheme,
  Tooltip,
  Fab,
  Card,
  CardContent,
} from "@mui/material";
import {
  RemoveCircle,
  Business,
  Person,
  Save,
  Cancel,
  Edit,
  Add,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useRef } from "react";

import {
  addCompanyToCustomer,
  deleteCompanyFromCustomer,
  createCustomer,
  updateCustomer,
  getCustomerById,
} from "../../api/adminApi";

const CustomerForm = ({ existingCustomer, onSuccess }) => {
  const theme = useTheme();

  // ----------------------------------------------------
  // INITIAL STATE — EXTENDED FOR MULTILINGUAL FIELDS
  // ----------------------------------------------------
  const initialFormState = {
    customerType: "B2C",

    // MULTILINGUAL customer name
    customerName_en: "",
    customerName_ta: "",

    mobileNumber: "",
    email: "",

    // MULTILINGUAL address
    address_en: "",
    address_ta: "",

    // MULTILINGUAL shipping address
    shippingAddress_en: "",
    shippingAddress_ta: "",

    city: "",
    state: "",
    pincode: "",
creditLimit: 100000,
dueDays: 15,
openingBalance: 0,
  };

  const initialCompanyState = [
    {
      companyName: "",
      companyLocation: "",
      gstNumber: "",
      companyEmail: "",
      companyPhoneNumber: "",
    },
  ];
  const inputRefs = useRef([]);

  const [formData, setFormData] = useState(initialFormState);
  const [companies, setCompanies] = useState(initialCompanyState);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [errors, setErrors] = useState({});

  // ----------------------------------------------------
  // LOAD EXISTING CUSTOMER (MULTILINGUAL)
  // ----------------------------------------------------
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (existingCustomer?._id) {
        setLoading(true);
        try {
          const res = await getCustomerById(existingCustomer._id);
          const customer = res.data.customer;

          setFormData({
            customerType: customer.customerType || "B2C",

            customerName_en: customer.customerName?.en || "",
            customerName_ta: customer.customerName?.ta || "",

            mobileNumber: customer.mobileNumber || "",
            email: customer.email || "",

            address_en: customer.address?.en || "",
            address_ta: customer.address?.ta || "",

            shippingAddress_en: customer.shippingAddress?.en || "",
            shippingAddress_ta: customer.shippingAddress?.ta || "",

            city: customer.city || "",
            state: customer.state || "",
            pincode: customer.pincode || "",
            creditLimit: customer.creditLimit || 100000,
dueDays: customer.dueDays || 15,
openingBalance: customer.openingBalance || 0,
          });

          setCompanies(
            customer.companies?.length
              ? customer.companies
              : initialCompanyState
          );
          setDataLoaded(true);
        } catch {
          toast.error("Failed to fetch customer details");
        } finally {
          setLoading(false);
        }
      } else {
        setFormData(initialFormState);
        setCompanies(initialCompanyState);
        setDataLoaded(true);
      }
    };

    fetchCustomerDetails();
  }, [existingCustomer]);

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const nextInput = inputRefs.current[index + 1];

      if (nextInput) {
        nextInput.focus();
      } else {
        handleSubmit(e); // last field → submit
      }
    }
  };

  // ----------------------------------------------------
  // FIELD CHANGE HANDLER
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // ----------------------------------------------------
  // COMPANY CHANGE HANDLER
  // ----------------------------------------------------
  const handleCompanyChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...companies];
    updated[index][name] = value;
    setCompanies(updated);
  };

  const addLocalCompany = () => {
    setCompanies((prev) => [
      ...prev,
      {
        companyName: "",
        companyLocation: "",
        gstNumber: "",
        companyEmail: "",
        companyPhoneNumber: "",
      },
    ]);
  };

  const removeCompany = async (index, companyId) => {
    if (existingCustomer && companyId) {
      try {
        const res = await deleteCompanyFromCustomer(
          existingCustomer._id,
          companyId
        );
        setCompanies(res.data.customer.companies);
        toast.success("Company deleted successfully");
        if (onSuccess) onSuccess();
        return;
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to delete company");
        return;
      }
    }
    setCompanies((prev) => prev.filter((_, i) => i !== index));
  };

  // ----------------------------------------------------
  // RESET FORM
  // ----------------------------------------------------
  const resetForm = () => {
    setFormData(initialFormState);
    setCompanies(initialCompanyState);
    setErrors({});
  };

  // ----------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------
const validateForm = () => {
  const newErrors = {};

  if (!formData.customerName_en.trim()) {
    newErrors.customerName_en = "English name is required";
  }

  if (formData.customerType === "B2B") {
    if (!companies || companies.length === 0) {
      newErrors.company = "At least one company is required for B2B";
    } else {
      const validCompanies = companies.filter(
        (c) => c.companyName && c.companyName.trim() !== ""
      );

      if (validCompanies.length === 0) {
        newErrors.company = "Please enter at least one valid company for B2B";
      }
    }
  }

  setErrors(newErrors);

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
};

  // ----------------------------------------------------
  // SUBMIT (MULTILINGUAL PAYLOAD)
  // ----------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

const { isValid, errors: validationErrors } = validateForm();

if (!isValid) {
  const firstError = Object.values(validationErrors)[0];
  toast.warn(firstError);
  return;
}

    const payload = {
      customerType: formData.customerType,

      customerName: {
        en: formData.customerName_en,
        ta: formData.customerName_ta,
      },

      mobileNumber: formData.mobileNumber,
      email: formData.email,

      address: {
        en: formData.address_en,
        ta: formData.address_ta,
      },

      shippingAddress: {
        en: formData.shippingAddress_en,
        ta: formData.shippingAddress_ta,
      },

      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      creditLimit: Number(formData.creditLimit),
dueDays: Number(formData.dueDays),
openingBalance: Number(formData.openingBalance),

      ...(formData.customerType === "B2B"
  ? {
      companies: companies.filter(
        (c) => c.companyName && c.companyName.trim() !== ""
      ),
    }
  : {}),
    };

    try {
      if (existingCustomer?._id) {
        await updateCustomer(existingCustomer._id, payload);
        toast.success("Customer updated successfully");
      } else {
        await createCustomer(payload);
        toast.success("Customer created successfully");
      }

      resetForm();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save customer");
    }
  };

  if (loading || !dataLoaded) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  // ------------------------------------------------------------------
  // UI SECTION — EXACT SAME AS YOUR ORIGINAL, JUST MULTILINGUAL FIELDS ADDED
  // ------------------------------------------------------------------
  return (
    <Box sx={{ width: "100%", px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
      {/* HEADER SECTION */}
      <Box
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "white",
          borderRadius: 3,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {existingCustomer ? (
            <Edit fontSize="large" />
          ) : (
            <Person fontSize="large" />
          )}

          <Box>
            <Typography variant="h5" fontWeight="bold">
              {existingCustomer ? "Edit Customer" : "Create New Customer"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {existingCustomer
                ? "Update customer information and company details"
                : "Add a new customer to your database"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* FORM START */}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* CUSTOMER TYPE */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.customerType}>
              <InputLabel>Customer Type</InputLabel>
              <Select
                sx={{ width: 200 }}
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                label="Customer Type"
              >
                <MenuItem value="B2C">B2C (Business to Consumer)</MenuItem>
                <MenuItem value="B2B">B2B (Business to Business)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* CUSTOMER NAME (ENGLISH) */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer Name (English) *"
              name="customerName_en"
              value={formData.customerName_en}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[0] = el)}
              onKeyDown={(e) => handleKeyDown(e, 0)}
            />
          </Grid>

          {/* CUSTOMER NAME (TAMIL) */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              sx={{ width: 200 }}
              label="Customer Name (Tamil)"
              name="customerName_ta"
              value={formData.customerName_ta}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[1] = el)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
            />
          </Grid>

          {/* MOBILE NUMBER */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Mobile Number"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              type="tel"
              inputRef={(el) => (inputRefs.current[2] = el)}
              onKeyDown={(e) => handleKeyDown(e, 2)}
            />
          </Grid>

          {/* EMAIL */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              inputRef={(el) => (inputRefs.current[3] = el)}
              onKeyDown={(e) => handleKeyDown(e, 3)}
            />
          </Grid>

          {/* ADDRESS (ENGLISH) */}
          <Grid item xs={12}>
            <TextField
              label="Address (English)"
              name="address_en"
              value={formData.address_en}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[4] = el)}
              onKeyDown={(e) => handleKeyDown(e, 4)}
            />
          </Grid>

          {/* ADDRESS (TAMIL) */}
          <Grid item xs={12}>
            <TextField
              label="Address (Tamil)"
              name="address_ta"
              value={formData.address_ta}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[5] = el)}
              onKeyDown={(e) => handleKeyDown(e, 5)}
            />
          </Grid>

          {/* SHIPPING ADDRESS (ENGLISH) */}
          <Grid item xs={12}>
            <TextField
              label="Shipping Address (English)"
              name="shippingAddress_en"
              value={formData.shippingAddress_en}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[6] = el)}
              onKeyDown={(e) => handleKeyDown(e, 6)}
            />
          </Grid>

          {/* SHIPPING ADDRESS (TAMIL) */}
          <Grid item xs={12}>
            <TextField
              label="Shipping Address (Tamil)"
              name="shippingAddress_ta"
              value={formData.shippingAddress_ta}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[7] = el)}
              onKeyDown={(e) => handleKeyDown(e, 7)}
            />
          </Grid>

          {/* CITY */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[8] = el)}
              onKeyDown={(e) => handleKeyDown(e, 8)}
            />
          </Grid>

          {/* STATE */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[9] = el)}
              onKeyDown={(e) => handleKeyDown(e, 9)}
            />
          </Grid>

          {/* PINCODE */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              inputRef={(el) => (inputRefs.current[10] = el)}
              onKeyDown={(e) => handleKeyDown(e, 10)}
            />
          </Grid>

          {/* CREDIT LIMIT */}
<Grid item xs={12} sm={4}>
  <TextField
    fullWidth
    label="Credit Limit"
    name="creditLimit"
    type="number"
    value={formData.creditLimit}
    onChange={handleChange}
  />
</Grid>

{/* DUE DAYS */}
<Grid item xs={12} sm={4}>
  <TextField
    fullWidth
    label="Due Days"
    name="dueDays"
    type="number"
    value={formData.dueDays}
    onChange={handleChange}
  />
</Grid>

{/* OPENING BALANCE */}
<Grid item xs={12} sm={4}>
  <TextField
    fullWidth
    label="Opening Balance"
    name="openingBalance"
    type="number"
    value={formData.openingBalance}
    onChange={handleChange}
  />
</Grid>

          {/* =========================== */}
          {/* B2B COMPANY SECTION */}
          {/* =========================== */}
          {formData.customerType === "B2B" && (
            <>
              <Divider sx={{ my: 3 }} />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Business color="primary" sx={{ mr: 1.5 }} />
                <Typography variant="h6" fontWeight="bold">
                  Company Details
                </Typography>

                <Tooltip title="Add Company">
                  <Fab
                    size="small"
                    color="primary"
                    onClick={addLocalCompany}
                    sx={{ ml: "auto" }}
                  >
                    <Add />
                  </Fab>
                </Tooltip>
              </Box>

              {companies.map((company, index) => (
                <Card
                  key={index}
                  elevation={1}
                  sx={{
                    mb: 3,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        Company #{index + 1}
                      </Typography>

                      <Tooltip title="Remove Company">
                        <IconButton
                          color="error"
                          onClick={() => removeCompany(index, company._id)}
                          size="small"
                        >
                          <RemoveCircle />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Company Name *"
                          name="companyName"
                          value={company.companyName}
                          onChange={(e) => handleCompanyChange(index, e)}
                          inputRef={(el) =>
                            (inputRefs.current[100 + index * 5 + 0] = el)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, 100 + index * 5 + 0)
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Company Location"
                          name="companyLocation"
                          value={company.companyLocation}
                          onChange={(e) => handleCompanyChange(index, e)}
                          inputRef={(el) =>
                            (inputRefs.current[100 + index * 5 + 1] = el)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, 100 + index * 5 + 1)
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="GST Number"
                          name="gstNumber"
                          value={company.gstNumber}
                          onChange={(e) => handleCompanyChange(index, e)}
                          inputRef={(el) =>
                            (inputRefs.current[100 + index * 5 + 2] = el)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, 100 + index * 5 + 2)
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Company Email"
                          name="companyEmail"
                          value={company.companyEmail}
                          onChange={(e) => handleCompanyChange(index, e)}
                          type="email"
                          inputRef={(el) =>
                            (inputRefs.current[100 + index * 5 + 3] = el)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, 100 + index * 5 + 3)
                          }
                        />
                      </Grid>

                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Company Phone"
                          name="companyPhoneNumber"
                          value={company.companyPhoneNumber}
                          onChange={(e) => handleCompanyChange(index, e)}
                          type="tel"
                          inputRef={(el) =>
                            (inputRefs.current[100 + index * 5 + 4] = el)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, 100 + index * 5 + 4)
                          }
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </Grid>

        {/* SUBMIT BUTTONS */}
        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Cancel />}
            onClick={resetForm}
            sx={{
              py: 1.2,
              px: 3,
              borderRadius: 2,
              fontWeight: "bold",
            }}
          >
            Reset Form
          </Button>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<Save />}
            sx={{
              py: 1.2,
              px: 4,
              borderRadius: 2,
              fontWeight: "bold",
              boxShadow: theme.shadows[4],
            }}
          >
            {existingCustomer ? "Update Customer" : "Save Customer"}
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CustomerForm;
