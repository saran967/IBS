import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Button,
  Box,
  Chip,
  IconButton,
  TableContainer,
} from "@mui/material";
import { MdWarning, MdCheckCircle, MdInventory } from "react-icons/md";

export default function DashboardProducts({ products = [] }) {
  const getStockStatus = (stock, minLevel) => {
    if (stock <= 0)
      return { label: "Out of Stock", color: "error", icon: <MdWarning /> };

    if (stock < minLevel)
      return { label: "Low Stock", color: "warning", icon: <MdWarning /> };

    return { label: "In Stock", color: "success", icon: <MdCheckCircle /> };
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
              color: "#fff",
            }}
          >
            <MdWarning size={24} />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1.125rem" }}>
              Low Stock Alerts
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Products requiring immediate reorder
            </Typography>
          </Box>
        </Box>
      </Stack>

      <TableContainer sx={{ maxHeight: 500 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: "background.paper" }}>
                Code
              </TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "background.paper" }}>
                Product Name
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 600, bgcolor: "background.paper" }}
              >
                Min Level
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 600, bgcolor: "background.paper" }}
              >
                Current Qty
              </TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: "background.paper" }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No low stock alerts at this time.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const status = getStockStatus(p.totalStock, p.minStockLevel);
                const productName =
                  typeof p.name === "object" ? p.name?.en : p.name;

                return (
                  <TableRow
                    key={p._id}
                    hover
                    sx={{
                      "&:last-child td": { border: 0 },
                      bgcolor:
                        p.totalStock <= 0
                          ? "#fee2e2"
                          : p.totalStock < p.minStockLevel
                            ? "#fffbeb"
                            : "inherit",
                    }}
                  >
                    <TableCell
                      sx={{ fontWeight: 500, fontFamily: "monospace" }}
                    >
                      {p.productCode || p._id}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 500 }}>
                      {productName || "N/A"}
                    </TableCell>

                    <TableCell align="center" sx={{ color: "text.secondary" }}>
                      {p.minStockLevel ?? 0}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: p.totalStock <= 0 ? "error.main" : "inherit",
                      }}
                    >
                      {p.totalStock ?? 0} {p.baseUnitType}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={status.label}
                        size="small"
                        color={status.color}
                        icon={status.icon}
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
