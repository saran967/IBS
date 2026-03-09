// import {
//   Box,
//   Paper,
//   Typography,
//   Divider,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Button,
//   Chip,
// } from "@mui/material";
// import { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import customFetch from "../../utils/customFetch";
// import { ArrowBack } from "@mui/icons-material";

// export default function SalesDetails() {
//   const { id, lang } = useParams();
//   const navigate = useNavigate();
//   const [sale, setSale] = useState(null);

//   const fetchSaleDetails = async () => {
//     try {
//       const res = await customFetch(`/sales/${id}?lang=${lang}`);
//       if (res.data.success) {
//         setSale(res.data.data);
//       }
//     } catch (err) {
//       console.error("Error fetching sale details:", err);
//     }
//   };

//   useEffect(() => {
//     fetchSaleDetails();
//   }, [id]);

//   if (!sale) return <Typography sx={{ p: 4 }}>Loading...</Typography>;

//   const formatCurrency = (value) =>
//     value != null ? `₹${Number(value).toFixed(2)}` : "₹0.00";

//   const statusColor =
//     sale.paymentStatus === "PAID"
//       ? "success"
//       : sale.paymentStatus === "PARTIAL"
//       ? "warning"
//       : "error";

//   return (
//     <Box sx={{ p: 3 }}>
//       <Button
//         variant="outlined"
//         startIcon={<ArrowBack />}
//         sx={{ mb: 2 }}
//         onClick={() => navigate(-1)}
//       >
//         Back
//       </Button>

//       <Paper
//         sx={{
//           p: 3,
//           mb: 3,
//           borderRadius: 2,
//           boxShadow: 3,
//           backgroundColor: "#fff",
//         }}
//       >
//         {/* Header Section */}
//         <Box
//           sx={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             flexWrap: "wrap",
//           }}
//         >
//           <Box>
//             <Typography variant="h5" fontWeight="bold" mb={0.5}>
//               Invoice #{sale.invoiceNo || sale._id}
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               Date: {new Date(sale.createdAt).toLocaleDateString()}
//             </Typography>
//           </Box>
//           <Chip
//             label={sale.paymentStatus || "UNPAID"}
//             color={statusColor}
//             sx={{ fontWeight: "bold", fontSize: "0.9rem" }}
//           />
//         </Box>

//         <Divider sx={{ my: 2 }} />

//         {/* Info Grid */}
//         <Box
//           sx={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
//             gap: 2,
//           }}
//         >
//           <InfoBlock
//             title="Shop"
//             value={sale.shopId?.name?.[lang] || sale.shopId?.name?.en || "N/A"}
//           />
//           <InfoBlock
//             title="Customer"
//             value={sale.customerId?.customerName || "N/A"}
//           />
//           <InfoBlock
//             title="Mobile"
//             value={sale.customerId?.mobileNumber || "—"}
//           />
//           <InfoBlock title="Sale Type" value={sale.saleType || "N/A"} />
//           <InfoBlock title="Created By" value={sale.createdBy || "—"} />
//         </Box>

//         <Divider sx={{ my: 3 }} />

//         {/* Items Table */}
//         <Typography variant="h6" gutterBottom>
//           Items
//         </Typography>
//         <TableContainer
//           component={Paper}
//           sx={{ boxShadow: 1, borderRadius: 2, overflow: "hidden" }}
//         >
//           <Table>
//             <TableHead>
//               <TableRow sx={{ background: "#f9f9f9" }}>
//                 <TableCell>Product</TableCell>
//                 <TableCell align="center">Qty</TableCell>
//                 <TableCell align="center">Unit</TableCell>
//                 <TableCell align="center">Rate</TableCell>
//                 <TableCell align="center">Discount (%)</TableCell>
//                 <TableCell align="center">GST (%)</TableCell>
//                 <TableCell align="right">Amount</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {sale.items?.map((item, idx) => {
//                 const name = item.productName?.[lang] || item.productName?.en;
//                 const amount = item.quantity * item.pricePerUnit;
//                 const discountAmt = (amount * (item.discount || 0)) / 100;
//                 const gstAmt = (amount * (item.gst || 0)) / 100;
//                 const total = amount - discountAmt + gstAmt;

//                 return (
//                   <TableRow key={idx}>
//                     <TableCell>{name}</TableCell>
//                     <TableCell align="center">{item.quantity}</TableCell>
//                     <TableCell align="center">
//                       {item.unit?.[lang] || item.unit?.en}
//                     </TableCell>
//                     <TableCell align="center">
//                       {formatCurrency(item.pricePerUnit)}
//                     </TableCell>
//                     <TableCell align="center">{item.discount || 0}</TableCell>
//                     <TableCell align="center">{item.gst || 0}</TableCell>
//                     <TableCell align="right">{formatCurrency(total)}</TableCell>
//                   </TableRow>
//                 );
//               })}
//             </TableBody>
//           </Table>
//         </TableContainer>

//         {/* Totals Section */}
//         <Box
//           sx={{
//             mt: 3,
//             p: 2,
//             borderRadius: 2,
//             backgroundColor: "#fafafa",
//             textAlign: "right",
//             lineHeight: 1.8,
//           }}
//         >
//           <Typography>Subtotal: {formatCurrency(sale.subTotal)}</Typography>
//           <Typography>GST: {formatCurrency(sale.totalGST)}</Typography>
//           <Typography>
//             Delivery: {formatCurrency(sale.deliveryCharges)}
//           </Typography>
//           <Typography>
//             Transport: {formatCurrency(sale.transportCharges)}
//           </Typography>
//           <Divider sx={{ my: 1 }} />
//           <Typography fontWeight="bold" variant="h6">
//             Grand Total: {formatCurrency(sale.grandTotal)}
//           </Typography>
//           <Typography color="green">
//             Paid: {formatCurrency(sale.paidAmount)}
//           </Typography>
//           <Typography color="error">
//             Balance: {formatCurrency(sale.balanceAmount)}
//           </Typography>
//         </Box>

//         {/* Notes */}
//         {sale.notes && sale.notes.trim() !== "" && (
//           <Box sx={{ mt: 3 }}>
//             <Typography variant="subtitle2">Notes:</Typography>
//             <Typography color="text.secondary">{sale.notes}</Typography>
//           </Box>
//         )}
//       </Paper>
//     </Box>
//   );
// }

// /* 🔹 Small helper for info sections */
// function InfoBlock({ title, value }) {
//   return (
//     <Box>
//       <Typography variant="subtitle2" color="text.secondary">
//         {title}
//       </Typography>
//       <Typography variant="body1" fontWeight="500">
//         {value}
//       </Typography>
//     </Box>
//   );
// }

import {
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Grid,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import customFetch from "../../utils/customFetch";
import { ArrowBack } from "@mui/icons-material";

export default function SalesDetails() {
  const { id, lang } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);

  const fetchSaleDetails = async () => {
    try {
      const res = await customFetch(`/sales/${id}?lang=${lang}`);
      if (res.data.success) {
        setSale(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching sale details:", err);
    }
  };

  useEffect(() => {
    fetchSaleDetails();
  }, [id, lang]);

  if (!sale) return <Typography sx={{ p: 4 }}>Loading...</Typography>;

  const formatCurrency = (value) =>
    value != null ? `₹${Number(value).toFixed(2)}` : "₹0.00";

  const statusColor =
    sale.paymentStatus === "PAID"
      ? "success"
      : sale.paymentStatus === "PARTIAL"
        ? "warning"
        : "error";

  //  Overall Handling Total
  const handlingTotal =
    sale.handlingTotal ??
    (Array.isArray(sale.handlingCharges)
      ? sale.handlingCharges.reduce(
          (sum, h) => sum + Number(h.totalCharge || 0),
          0,
        )
      : 0);

  //  Transport object (only if includeTransport true)
  const transport = sale.transportDetails || null;

  //  Get customer name based on lang
  const customerName =
    sale.customerId?.customerName?.[lang] ||
    sale.customerId?.customerName?.en ||
    "N/A";

  //  createdBy role display
  const createdByRole =
    sale.createdBy?.role || sale.createdByRole || sale.createdBy || "—";

  //  invoice number
  const invoiceNo = sale.invoiceNumber || sale.invoiceNo || sale._id;

  return (
    <Box sx={{ p: 3 }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
        onClick={() => navigate(-1)}
      >
        Back
      </Button>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          boxShadow: 3,
          backgroundColor: "#fff",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold" mb={0.5}>
              Invoice #{invoiceNo}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Date:{" "}
              {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
            </Typography>
          </Box>

          <Chip
            label={sale.paymentStatus || "UNPAID"}
            color={statusColor}
            sx={{ fontWeight: "bold", fontSize: "0.9rem" }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Info Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 2,
          }}
        >
          <InfoBlock title="Customer" value={customerName} />
          <InfoBlock title="Sale Type" value={sale.saleType || "—"} />
          <InfoBlock title="Bill Type" value={sale.billType || "—"} />
          <InfoBlock title="Payment Method" value={sale.paymentMethod || "—"} />
          <InfoBlock title="Created By Role" value={createdByRole} />
        </Box>

        {/*  Handling + Transport Details */}
        {(sale.includeHandling || sale.includeTransport) && (
          <>
            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Additional Details
            </Typography>

            <Grid container spacing={2}>
              {/*  Handling Charges */}
              {sale.includeHandling && (
                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2, background: "#fafafa" }}
                  >
                    <Typography fontWeight={800}>Handling Charges</Typography>
                    <Typography sx={{ mt: 1 }}>
                      Total Handling:{" "}
                      <strong>{formatCurrency(handlingTotal)}</strong>
                    </Typography>
                  </Paper>
                </Grid>
              )}

              {/*  Transport Details */}
              {sale.includeTransport && (
                <Grid item xs={12} md={6}>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2, background: "#fafafa" }}
                  >
                    <Typography fontWeight={800}>Transport Details</Typography>

                    <Box sx={{ mt: 1, lineHeight: 1.7 }}>
                      <Typography variant="body2">
                        <strong>Vehicle No:</strong>{" "}
                        {transport?.vehicleNumber || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Driver Name:</strong>{" "}
                        {transport?.driverName || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Driver Phone:</strong>{" "}
                        {transport?.driverPhone || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Agency:</strong>{" "}
                        {transport?.transportAgency || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Destination:</strong>{" "}
                        {transport?.destination || "—"}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Remarks:</strong> {transport?.remarks || "—"}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Items Table */}
        <Typography variant="h6" gutterBottom>
          Items
        </Typography>

        <TableContainer
          component={Paper}
          sx={{ boxShadow: 1, borderRadius: 2, overflow: "hidden" }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ background: "#f9f9f9" }}>
                <TableCell>Product</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="center">Unit</TableCell>
                <TableCell align="center">Shop / Godown</TableCell>
                <TableCell align="center">Rate</TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {(sale.items || []).map((item, idx) => {
                const productName =
                  item.productName?.[lang] || item.productName?.en || "—";

                const unit = item.unit?.[lang] || item.unit?.en || "—";

                const locationName =
                  item.shopId?.name?.[lang] ||
                  item.shopId?.name?.en ||
                  item.godownId?.name?.[lang] ||
                  item.godownId?.name?.en ||
                  "—";

                return (
                  <TableRow key={item._id || idx}>
                    <TableCell>{productName}</TableCell>

                    <TableCell align="center">
                      {Number(item.quantity || 0)}
                    </TableCell>

                    <TableCell align="center">{unit}</TableCell>

                    <TableCell align="center">{locationName}</TableCell>

                    <TableCell align="center">
                      {formatCurrency(item.sellingPrice || 0)}
                    </TableCell>

                    <TableCell align="right">
                      {formatCurrency(item.total || 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Totals Section */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            backgroundColor: "#fafafa",
            textAlign: "right",
            lineHeight: 1.8,
          }}
        >
          <Typography>
            Gross Total: {formatCurrency(sale.grossTotal)}
          </Typography>

          <Typography>Discount: {formatCurrency(sale.discount)}</Typography>

          {/*  Handling below Discount */}
          {sale.includeHandling && (
            <Typography>
              Handling Charges: {formatCurrency(handlingTotal)}
            </Typography>
          )}

          <Divider sx={{ my: 1 }} />

          <Typography fontWeight="bold" variant="h6">
            Net Total: {formatCurrency(sale.netTotal)}
          </Typography>

          <Typography color="green">
            Paid: {formatCurrency(sale.paidAmount)}
          </Typography>

          <Typography color="error">
            Balance: {formatCurrency(sale.balanceAmount)}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

/*  Helper block */
function InfoBlock({ title, value }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body1" fontWeight="600">
        {value}
      </Typography>
    </Box>
  );
}
