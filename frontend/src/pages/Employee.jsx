import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import customFetch from "../utils/customFetch";

const UsersManagement = () => {
  const { user } = useAuth(); // logged-in user
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const role = user?.role;

  const [form, setForm] = useState({
    name: "",
    name_ta: "",
    email: "",
    password: "",
    shopId: "",
    roleType: "user", // "user" or "subadmin"
  });

  //* Fetch all users (SubAdmins + Employees)
  const fetchUsers = async () => {
    try {
      setLoading(true);
      let allUsers = [];

      if (role === "admin") {
        // Fetch subadmins
        const subRes = await customFetch.get("/users/subadmins");
        // Fetch employees
        const empRes = await customFetch.get("/users/employees");
        allUsers = [...subRes.data.subAdmins, ...empRes.data.employees];
      } else if (role === "subadmin") {
        const empRes = await customFetch.get("/users/employees");
        allUsers = empRes.data.employees;
      }

      setUsers(allUsers);
      console.log(allUsers);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  //* Fetch shops for Admin
  const fetchShops = async () => {
    if (role === "admin") {
      try {
        const res = await customFetch.get("/shops");
        setShops(res.data);
        console.log(res.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchShops();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setForm({
      name: "",
      name_ta: "",
      email: "",
      password: "",
      shopId: "",
      roleType: "user",
    });
  };

  //* Submit SubAdmin / Employee
  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!form.shopId) {
      toast.error("Please select a shop");
      return;
    }

    try {
      setLoading(true);
      let res;

      if (form.roleType === "subadmin") {
        res = await customFetch.post("/users/subadmin", {
          subAdminName: form.name,
          subAdminName_ta: form.name_ta,
          subAdminEmail: form.email,
          subAdminPassword: form.password,
          shopId: form.shopId,
        });
      } else {
        res = await customFetch.post("/users/employee", {
          name: form.name,
          name_ta: form.name_ta,
          email: form.email,
          password: form.password,
          shopId: form.shopId,
        });
      }

      toast.success(res.data.message);
      fetchUsers();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        {role === "admin" ? "Manage SubAdmins / Employees" : "Manage Employees"}
      </Typography>

      <Button variant="contained" onClick={handleOpen} sx={{ mb: 2 }}>
        Add {role === "admin" ? "SubAdmin / Employee" : "Employee"}
      </Button>

      {loading ? (
        <CircularProgress />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name (EN)</TableCell>
              <TableCell>Name (TA)</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Shop</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u._id}>
                <TableCell>{u.name.en}</TableCell>
                <TableCell>{u.name.ta}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.shop.name.en || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add User Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add {role === "admin" ? "SubAdmin / Employee" : "Employee"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name (EN)"
            name="name"
            value={form.name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Name (TA)"
            name="name_ta"
            value={form.name_ta}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            margin="normal"
          />

          {/* Role Selection */}
          {role === "admin" && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                name="roleType"
                value={form.roleType}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="subadmin">SubAdmin</MenuItem>
                <MenuItem value="user">Employee</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Shop Selection */}
          {(role === "admin" || form.roleType === "subadmin") && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Shop</InputLabel>
              <Select
                name="shopId"
                value={form.shopId}
                onChange={handleChange}
                label="Shop"
              >
                {shops.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {loading ? <CircularProgress size={20} /> : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManagement;
