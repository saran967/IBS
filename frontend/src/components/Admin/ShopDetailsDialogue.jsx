import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
} from "@mui/material";
import { People, SupervisorAccount } from "@mui/icons-material";

const ShopDetailsDialogue = ({ open, onClose, shop, lang }) => {
  const getLocalizedText = (value, l = "en") => {
    if (!value) return "-";
    if (typeof value === "object") {
      if (l === "both") return `${value.en || "-"} / ${value.ta || "-"}`;
      return value[l] || value.en || value.ta || "-";
    }
    return value;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Shop Details</DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          🏪 {getLocalizedText(shop.name, lang)}
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Created By:</strong> {shop.createdBy?.name || "-"}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          ID: {shop._id}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Sub Admins */}
        <Typography
          variant="subtitle1"
          sx={{ display: "flex", alignItems: "center", mb: 1 }}
        >
          <SupervisorAccount sx={{ mr: 1 }} /> Sub Admins
        </Typography>
        {shop.subAdmins?.length ? (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shop.subAdmins.map((admin) => (
                <TableRow key={admin._id}>
                  <TableCell>{getLocalizedText(admin.name, lang)}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography color="text.secondary" ml={4}>
            No Sub Admins
          </Typography>
        )}

        {/* Employees */}
        <Typography
          variant="subtitle1"
          sx={{ display: "flex", alignItems: "center", mb: 1, mt: 2 }}
        >
          <People sx={{ mr: 1 }} /> Employees
        </Typography>
        {shop.employees?.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shop.employees.map((emp) => (
                <TableRow key={emp._id}>
                  <TableCell>{getLocalizedText(emp.name, lang)}</TableCell>
                  <TableCell>{emp.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography color="text.secondary" ml={4}>
            No Employees
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShopDetailsDialogue;
