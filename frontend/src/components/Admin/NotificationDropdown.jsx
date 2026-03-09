import React from "react";
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Menu,
  Typography,
  Button,
} from "@mui/material";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";

export default function NotificationDropdown({
  anchorEl,
  open,
  onClose,
  notifications,
  onActionDone,
}) {
  const navigate = useNavigate();

 const markRead = async (type, id) => {
  if (!id) {
    console.warn("Notification missing refId", { type, id });
    return;
  }

  try {
    await customFetch.post("/notifications/mark-read", { type, refId: id });
    toast.success("Marked as read");
    onActionDone?.();
  } catch (err) {
    console.error("Mark read failed", err);
    toast.error("Failed to mark as read");
  }
};

  const clearAll = async () => {
    try {
      await customFetch.post("/notifications/clear-all");
      toast.info("All notifications cleared");
      onActionDone?.();
      onClose();
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  const openOrderSale = (o) => {
    onClose();
    navigate(`/en/admin/sales/create/${o._id}`);
  };

  const openTokenPrint = (t) => {
    onClose();
    navigate(`/en/admin/token/${t}/print`);
  };

  const openStockTransfer = () => {
    onClose();
    navigate("/en/admin/stock-transfer");
  };

  const approveOrder = async (id) => {
    await customFetch.put(`/orders/${id}/approve`);
    toast.success("Order approved");
    onActionDone?.();
    onClose();
  };

  const confirmOrder = async (id) => {
    await customFetch.put(`/orders/${id}/confirm`);
    toast.success("Order confirmed");
    onActionDone?.();
    onClose();
  };

 const hasNotifications =
  notifications?.orders?.length ||
  notifications?.tokens?.length ||
  notifications?.stockTransfers?.length ||
  notifications?.creditLimits?.length ||
  notifications?.overdueSales?.length ||
  notifications?.vendorCreditLimits?.length ||
  notifications?.overdueVendorPurchases?.length;   // 🔥 ADD

  return (
   <Menu
  anchorEl={anchorEl}
  open={open}
  onClose={onClose}
  PaperProps={{
    sx: {
      width: 360,
      maxHeight: 450,
      overflowY: "auto",
    },
  }}
>
      {/* Header */}
   <Box
  sx={{
    px: 2,
    py: 1,
    display: "flex",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
  }}
>
        <Box>
          <Typography variant="subtitle1">Notifications</Typography>
          <Typography variant="caption" color="text.secondary">
            {notifications?.count || 0} new
          </Typography>
        </Box>

        {notifications?.count > 0 && (
          <Button size="small" color="error" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </Box>

      <Divider />

      {/* <List dense sx={{ maxHeight: 420, overflow: "auto" }}> */}
      <List dense>
        {/* ORDERS */}
        {notifications?.orders?.map((o) => (
          <ListItem key={o._id} divider>
            <ListItemText
              primary={`Order • ${o.orderNumber}`}
              secondary={`${formatDistanceToNow(new Date(o.createdAt))} ago`}
            />
            <Box>
              {o.orderStatus === "requested" && (
                <Button size="small" onClick={() => approveOrder(o._id)}>
                  Approve
                </Button>
              )}
              <Button size="small" onClick={() => openOrderSale(o)}>
                Open
              </Button>
              <Button size="small" onClick={() => markRead("ORDER", o._id)}>
                Read
              </Button>
            </Box>
          </ListItem>
        ))}

        {/* TOKENS */}
        {notifications?.tokens?.map((t) => (
          <ListItem key={t._id} divider>
            <ListItemText
              primary={`Token • ${t.tokenNumber}`}
              secondary={`${formatDistanceToNow(new Date(t.createdAt))} ago`}
            />
            <Box>
              <Button
                size="small"
                onClick={() => openTokenPrint(t.tokenNumber)}
              >
                Print
              </Button>
              <Button size="small" onClick={() => markRead("TOKEN", t._id)}>
                Read
              </Button>
            </Box>
          </ListItem>
        ))}

        {/* STOCK TRANSFERS */}
        {notifications?.stockTransfers?.map((s) => (
          <ListItem key={s._id} divider>
            <ListItemText
              primary={`Stock Transfer • ${s.status}`}
              secondary={`${formatDistanceToNow(new Date(s.createdAt))} ago`}
            />
            <Box>
              <Button size="small" onClick={openStockTransfer}>
                View
              </Button>
              <Button
                size="small"
                onClick={() => markRead("STOCK_TRANSFER", s._id)}
              >
                Read
              </Button>
            </Box>
          </ListItem>
        ))}

{/* CREDIT LIMIT */}
{notifications?.creditLimits?.map((c) => (
  <ListItem key={c._id} divider>
    <ListItemText
      primary={`Credit Limit Exceeded - ${
  typeof c.customerName === "object"
    ? c.customerName.en
    : c.customerName
}`}
secondary={`Exposure: ₹${c.totalExposure} | Limit: ₹${c.creditLimit}`}
    />
    <Box>
      <Button size="small" onClick={() => markRead("CREDIT_LIMIT", c._id)}>
        Read
      </Button>
    </Box>
  </ListItem>
))}

{/* OVERDUE VENDOR PURCHASES */}
{notifications?.overdueVendorPurchases?.map((p) => (
  <ListItem key={p._id} divider>
    <ListItemText
      primary={`Vendor Overdue • ${
        typeof p.vendorId?.name === "object"
          ? p.vendorId?.name?.en
          : p.vendorId?.name
      }`}
      secondary={`Balance: ₹${p.remainingBalance} | Due: ${new Date(
        p.dueDate
      ).toLocaleDateString()} | By: ${
        typeof p.createdBy?.name === "object"
          ? p.createdBy?.name?.en
          : p.createdBy?.name
      }`}
    />
    <Box>
      <Button
        size="small"
        onClick={() => markRead("VENDOR_OVERDUE", p._id)}
      >
        Read
      </Button>
    </Box>
  </ListItem>
))}

{/* OVERDUE SALES */}
{notifications?.overdueSales?.map((s) => (
  <ListItem key={s._id} divider>
    <ListItemText
      primary={`Overdue Sale • ${
        typeof s.customerName === "object"
          ? s.customerName?.en
          : s.customerName
      } • ${s.invoiceNumber}`}
     secondary={`Balance: ₹${s.balanceAmount} | Due: ${new Date(
  s.dueDate
).toLocaleDateString()} | By: ${s.createdByRole} ${
  s.createdByName || ""
}`}
    />
    <Box>
      <Button size="small" onClick={() => markRead("OVERDUE", s._id)}>
        Read
      </Button>
    </Box>
  </ListItem>
))}
{/* VENDOR CREDIT LIMIT */}
{/* VENDOR CREDIT LIMIT */}
{notifications?.vendorCreditLimits?.map((v) => (
  <ListItem key={v._id} divider>
    <ListItemText
      primary={`Vendor Credit Limit Exceeded - ${
        typeof v.name === "object" ? v.name.en : v.name
      }`}
   secondary={`Purchase: ₹${v.purchaseAmount} | Limit: ₹${v.creditLimit}
By: ${
  typeof v.createdByName === "object"
    ? v.createdByName.en
    : v.createdByName || "Unknown User"
}`}
    />
    <Box>
      <Button
        size="small"
        onClick={() => markRead("VENDOR_CREDIT_LIMIT", v._id)}
      >
        Read
      </Button>
    </Box>
  </ListItem>
))}
        {!hasNotifications && (
          <ListItem>
            <ListItemText primary="No recent notifications" />
          </ListItem>
        )}
      </List>
    </Menu>
  );
}