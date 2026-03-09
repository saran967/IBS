import {
  Grid,
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
import {
  MdFileDownload,
  MdTrendingUp,
  MdShoppingCart,
  MdSwapHoriz,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";

const getText = (val, lang = "en") => {
  if (!val) return "—";
  if (typeof val === "object") {
    if (lang === "en") return val.en || "—";
    if (lang === "ta") return val.ta || val.en || "—";
    return `${val.en || "—"} / ${val.ta || "—"}`;
  }
  return val;
};

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "error";
    default:
      return "default";
  }
};

const TableHeader = ({ icon, title, subtitle, onExport }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ mb: 2 }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "primary.lighter",
          color: "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  </Stack>
);

export default function DashboardTables({
  latestSales = [],
  latestPurchases = [],
  stockTransfers = {},
}) {
  const navigate = useNavigate();
  return (
    <Grid container spacing={3} sx={{ width: "100%", mt: 0 }}>
      {/* SALES TABLE */}
      <Grid container spacing={2}>
        {/* STOCK TRANSFERS TABLE */}
        <Grid item xs={12} lg={6} xl={6} sx={{ width: 500 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <TableHeader
              icon={<MdSwapHoriz size={20} />}
              title="Stock Transfers"
              subtitle="Recent stock movements"
              onExport={() => console.log("Export transfers")}
            />

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Product
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      From → To
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Qty
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {!stockTransfers.transfers ||
                  stockTransfers.transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No recent transfers
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockTransfers.transfers
                      .slice(-6)
                      .reverse()
                      .map((row) => {
                        const productName = getText(row.productId?.name);

                        const fromName = getText(
                          row.fromShopId?.name || row.fromGodownId?.name,
                        );

                        const toName = getText(
                          row.toShopId?.name || row.toGodownId?.name,
                        );

                        return (
                          <TableRow
                            key={row._id}
                            hover
                            sx={{
                              "&:last-child td": { border: 0 },
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell sx={{ fontWeight: 500 }}>
                              {productName}
                            </TableCell>

                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{ display: "block" }}
                              >
                                {fromName} → {toName}
                              </Typography>
                            </TableCell>

                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {row.quantity}
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={row.status}
                                size="small"
                                color={getStatusColor(row.status)}
                                sx={{ fontSize: "0.7rem", fontWeight: 600 }}
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
        </Grid>
        {/* PURCHASES TABLE */}
        <Grid item xs={12} lg={6} xl={6} sx={{ width: 500 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
            }}
          >
            <TableHeader
              icon={<MdShoppingCart size={20} />}
              title="Latest Purchases"
              subtitle="Recent vendor invoices"
              onExport={() => console.log("Export purchases")}
            />

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Date
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Vendor
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {latestPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No purchases found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    latestPurchases
                      .slice(-6)
                      .reverse()
                      .map((row, index) => (
                        <TableRow
                          key={index}
                          hover
                          sx={{
                            "&:last-child td": { border: 0 },
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>
                            {formatDate(
                              row.purchaseDate || row.date || row.createdAt,
                            )}
                          </TableCell>

                          <TableCell>{getText(row.vendorId?.name)}</TableCell>

                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹
                            {Number(
                              row.billAmount || row.totalAmount || 0,
                            ).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* LATEST SALES (FULL RIGHT SIDE ON DESKTOP) */}
      <Grid item xs={12} md={12} lg={6} xl={7} sx={{ width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            height: "100%",
            width: "100%",
          }}
        >
          <TableHeader
            icon={<MdTrendingUp size={20} />}
            title="Latest Sales"
            subtitle="Recent sales invoices"
            onExport={() => console.log("Export sales")}
          />

          {/* FULL RESPONSIVE TABLE WRAPPER */}
          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
            }}
          >
            <TableContainer
              sx={{
                maxHeight: 400,
                minWidth: "100%",
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Invoice
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Customer
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Type
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 600, bgcolor: "background.paper" }}
                    >
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {latestSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No sales found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    latestSales
                      .slice(-6)
                      .reverse()
                      .map((row, index) => (
                        <TableRow
                          key={index}
                          hover
                          sx={{
                            "&:last-child td": { border: 0 },
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            height: "60px",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>
                            {row.invoiceNumber || row.saleId}
                          </TableCell>
                          <TableCell>
                            {getText(row.customerId?.customerName)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.billType}
                              size="small"
                              sx={{ fontSize: "0.7rem" }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ₹
                            {Number(
                              row.billAmount || row.netTotal || 0,
                            ).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* FOOTER BUTTONS */}
          <Stack
            direction="row"
            spacing={3}
            justifyContent="center"
            sx={{
              mt: 3,
              pt: 3,
              borderTop: "1px solid",
              borderColor: "divider",
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={4}>
              {/* SALES */}
              <Stack
                alignItems="center"
                spacing={0.5}
                sx={{ cursor: "pointer" }}
                onClick={() => navigate("/en/admin/ledger/sales")}
              >
                <IconButton sx={{ bgcolor: "action.hover" }}>
                  <MdTrendingUp size={20} />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Sales
                </Typography>
              </Stack>

              {/* PURCHASE */}
              <Stack
                alignItems="center"
                spacing={0.5}
                sx={{ cursor: "pointer" }}
                onClick={() => navigate("/en/admin/ledger/purchase")}
              >
                <IconButton sx={{ bgcolor: "action.hover" }}>
                  <MdShoppingCart size={20} />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Purchase
                </Typography>
              </Stack>

              {/* LEDGER */}
              <Stack
                alignItems="center"
                spacing={0.5}
                sx={{ cursor: "pointer" }}
                onClick={() => navigate("/en/admin/ledger/stock-transfer")}
              >
                <IconButton sx={{ bgcolor: "action.hover" }}>
                  <MdSwapHoriz size={20} />
                </IconButton>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Stock Transfer
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
