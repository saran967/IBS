import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";

const SubAdminCreationForm = ({ createSubAdmin }) => {
  const [form, setForm] = useState({
    shopName: "",
    subAdminName: "",
    subAdminEmail: "",
    subAdminPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.shopName) newErrors.shopName = "Shop name is required";
    if (!form.subAdminName)
      newErrors.subAdminName = "SubAdmin name is required";
    if (!form.subAdminEmail) newErrors.subAdminEmail = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.subAdminEmail))
      newErrors.subAdminEmail = "Enter a valid email";
    if (!form.subAdminPassword)
      newErrors.subAdminPassword = "Password is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await createSubAdmin(form); // call API from props
      toast.success(response?.msg || "SubAdmin created successfully");
      setForm({
        shopName: "",
        subAdminName: "",
        subAdminEmail: "",
        subAdminPassword: "",
      });
    } catch (err) {
      toast.error(err?.message || "Failed to create SubAdmin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 6,
          p: 4,
          bgcolor: "#fafafa",
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" mb={3} fontWeight={500}>
          Create SubAdmin
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Shop Name"
            name="shopName"
            value={form.shopName}
            onChange={handleChange}
            error={Boolean(errors.shopName)}
            helperText={errors.shopName}
            margin="normal"
          />

          <TextField
            fullWidth
            label="SubAdmin Name"
            name="subAdminName"
            value={form.subAdminName}
            onChange={handleChange}
            error={Boolean(errors.subAdminName)}
            helperText={errors.subAdminName}
            margin="normal"
          />

          <TextField
            fullWidth
            label="SubAdmin Email"
            name="subAdminEmail"
            value={form.subAdminEmail}
            onChange={handleChange}
            error={Boolean(errors.subAdminEmail)}
            helperText={errors.subAdminEmail}
            margin="normal"
          />

          <TextField
            fullWidth
            label="SubAdmin Password"
            name="subAdminPassword"
            type="password"
            value={form.subAdminPassword}
            onChange={handleChange}
            error={Boolean(errors.subAdminPassword)}
            helperText={errors.subAdminPassword}
            margin="normal"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Create SubAdmin"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default SubAdminCreationForm;
