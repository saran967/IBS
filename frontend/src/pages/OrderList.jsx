import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import customFetch from "../utils/customFetch.js";
import OrderForm from "../components/Admin/OrderForm.jsx";

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const navigate = useNavigate();

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const res = await customFetch.get("/auth/current-user");
      const user = res.data.user || res.data || null;
      setCurrentUser(user);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  // Fetch all orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await customFetch.get("/orders?limit=0");
      setOrders(res.data.orders || res.data.data || res.data || []);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchOrders();
  }, []);

  // Create new order
  const handleOrderSubmit = async (orderData) => {
    try {
      await customFetch.post("/orders", orderData);
      toast.success("Order added successfully!");
      await fetchOrders();
      return true;
    } catch {
      toast.error("Failed to add order");
      return false;
    }
  };

  // Approve order
  const handleApprove = async (id) => {
    try {
      await customFetch.put(`/orders/${id}/approve`);
      toast.success("Order approved!");
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? { ...o, orderStatus: "pending" } : o)),
      );
      setTimeout(fetchOrders, 1000);
    } catch {
      toast.error("Failed to approve");
    }
  };

  //  Confirm order → navigate to sales page
  //  Confirm order → navigate to sales form
  const handleConfirm = async (id) => {
    try {
      await customFetch.put(`/orders/${id}/confirm`);
      toast.success("Order confirmed!");

      setOrders((prev) =>
        prev.map((o) =>
          o._id === id ? { ...o, orderStatus: "confirmed" } : o,
        ),
      );

      setActiveTab(currentUser?.role === "admin" ? 2 : 1);

      //  Make sure lang is defined (default to 'en')
      const langParam = currentUser?.language || "en";

      //  Navigate to sales form with the order ID
      setTimeout(() => {
        navigate(`/${langParam}/admin/sales/create/${id}`);
      }, 600);
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm order");
    }
  };

  // Cancel order
  const handleCancel = async (id) => {
    try {
      await customFetch.put(`/orders/${id}/cancel`);
      toast.info("Order cancelled!");
      setOrders((prev) =>
        prev.map((o) =>
          o._id === id ? { ...o, orderStatus: "cancelled" } : o,
        ),
      );
      setTimeout(fetchOrders, 1200);
    } catch {
      toast.error("Failed to cancel");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F5F7FA", py: 3 }}>
      <ToastContainer position="top-right" autoClose={2500} />
      <Container maxWidth="lg">
        <Paper elevation={6} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Box
            sx={{
              backgroundColor: "#1976d2",
              color: "white",
              textAlign: "center",
              py: 2,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Order Management System
            </Typography>
            <Typography variant="body2">
              Create, Approve, Confirm, or Cancel Orders
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <OrderForm
                orders={orders}
                onOrderSubmit={handleOrderSubmit}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onApprove={handleApprove}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default OrderManagement;
