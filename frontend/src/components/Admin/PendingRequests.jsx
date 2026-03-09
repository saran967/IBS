// src/components/Admin/PendingRequests.jsx
import React, { useEffect, useState } from "react";
import { Paper, Typography, Button, Box, Divider } from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";

const PendingRequests = ({ onActionComplete }) => {
  const [requests, setRequests] = useState([]);

  const fetchPending = async () => {
    try {
      const res = await customFetch.get("/stock-transfer/pending");
      const data = res.data?.requests || [];

      const formatted = data.map((r) => ({
        ...r,
        fromName:
          r.fromGodownId?.name?.en ||
          r.fromGodownId?.name ||
          r.fromShopId?.name?.en ||
          r.fromShopId?.name ||
          "—",

        fromType: r.fromGodownId ? "Godown" : r.fromShopId ? "Shop" : "—",

        toName:
          r.toGodownId?.name?.en ||
          r.toGodownId?.name ||
          r.toShopId?.name?.en ||
          r.toShopId?.name ||
          "—",

        toType: r.toGodownId ? "Godown" : r.toShopId ? "Shop" : "—",

        productName:
          r.productId?.name?.en ||
          r.productId?.name ||
          r.productName?.en ||
          r.productName ||
          "—",
      }));

      setRequests(formatted);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pending requests");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // APPROVE
  const handleApprove = async (reqObj) => {
    try {
      console.log(reqObj, 'log the data');
      await customFetch.post(`/stock-transfer/approve/${reqObj._id}`);
      toast.success("Request Approved!");
      fetchPending();
      onActionComplete && onActionComplete();
    } catch (err) {
      // console.log(err, 'error message')
      toast.error(err?.response?.data?.msg || "Failed to approve request");
    }
  };

  // CANCEL
  const handleCancel = async (reqObj) => {
    try {
      await customFetch.post(`/stock-transfer/cancel/${reqObj._id}`);
      toast.info("Request Cancelled");
      fetchPending();
      onActionComplete && onActionComplete();
    } catch (err) {
      toast.error(err?.response?.data?.msg || "Failed to cancel request");
    }
  };

  return (
    <Paper sx={{ p: 2, borderRadius: 2, mb: 3 }} elevation={3}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        ⏳ Pending Transfer Requests
      </Typography>

      {requests.length === 0 && (
        <Typography variant="body2" sx={{ mt: 2 }}>
          No pending requests found.
        </Typography>
      )}

      {requests.map((r, index) => (
        <Paper
          key={r._id}
          sx={{ p: 2, mb: 2, borderRadius: 2, background: "#fafafa" }}
          elevation={1}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Request #{index + 1}
          </Typography>

          <Divider sx={{ my: 1 }} />

          <Typography variant="body2">
            <strong>From:</strong> {r.fromType}: {r.fromName}
          </Typography>

          <Typography variant="body2">
            <strong>To:</strong> {r.toType}: {r.toName}
          </Typography>

          <Typography variant="body2">
            <strong>Product:</strong> {r.productName}
          </Typography>

          <Typography variant="body2">
            <strong>Quantity:</strong> {r.quantity}
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={() => handleApprove(r)}
            >
              Approve
            </Button>

            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => handleCancel(r)}
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      ))}
    </Paper>
  );
};

export default PendingRequests;
