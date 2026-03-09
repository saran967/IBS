// import React, { useEffect, useState } from "react";
// import {
//   Box,
//   Typography,
//   Divider,
//   CircularProgress,
//   Button,
// } from "@mui/material";
// import { useParams, useNavigate } from "react-router-dom";
// import customFetch from "../../utils/customFetch.js";
// import { toast } from "react-toastify";

// export default function SalesBill() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [sale, setSale] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [customerBalance, setCustomerBalance] = useState(null);

//   /* =========================
//      AUTO THERMAL PRINT
//   ========================= */
//   useEffect(() => {
//     if (!loading && sale) {
//       const timer = setTimeout(() => window.print(), 500);
//       return () => clearTimeout(timer);
//     }
//   }, [loading, sale]);

//   /* =========================
//      FETCH SALE
//   ========================= */
//   useEffect(() => {
//     const fetchSale = async () => {
//       try {
//         const res = await customFetch.get(`/sales/${id}`);
//         if (res.data?.success) {
//           setSale(res.data.data);
//           fetchCustomerBalance(res.data.data.customerId?._id);
//         } else {
//           toast.error("பில் விவரம் கிடைக்கவில்லை");
//         }
//       } catch (err) {
//         toast.error("பில் பெறுவதில் பிழை");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchSale();
//   }, [id]);

//   const fetchCustomerBalance = async (customerId) => {
//     try {
//       const res = await customFetch.get(`/customer/${customerId}/ledger`);
//       setCustomerBalance(res.data?.totals?.totalBalance ?? null);
//     } catch {
//       setCustomerBalance(null);
//     }
//   };

//   const formatAmount = (value) => {
//     if (value == null) return "-";
//     return Number(value).toLocaleString("en-IN", {
//       minimumFractionDigits: 2,
//       maximumFractionDigits: 2,
//     });
//   };

//   const handlePrint = () => window.print();
//   const handleBack = () => navigate(-1);

//   /* =========================
//      HELPERS (Tamil → English fallback)
//   ========================= */
//   const t = (ta, en = "") => ta || en || "-";

//   const getProductName = (product) => {
//     if (!product?.name) return "-";
//     return t(product.name.ta, product.name.en);
//   };

//   const getUnit = (item) => {
//     const unit = item?.unit || item?.productId?.unit || item?.productId?.uom;
//     if (typeof unit === "object" && unit !== null) {
//       return unit.ta || unit.en || "";
//     }
//     return unit || "";
//   };

//   const getQuantityValue = (item) => {
//     if (item?.quantity !== undefined && item?.quantity !== null)
//       return item.quantity;
//     if (item?.qty !== undefined && item?.qty !== null) return item.qty;
//     return "";
//   };

//   const getCustomerName = (customerName) => {
//     if (!customerName) return "-";
//     if (typeof customerName === "string") return customerName;
//     return t(customerName.ta, customerName.en);
//   };

//   if (loading) {
//     return (
//       <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
//         <CircularProgress />
//       </Box>
//     );
//   }

//   if (!sale) {
//     return (
//       <Typography align="center" sx={{ mt: 5 }}>
//         பில் கிடைக்கவில்லை
//       </Typography>
//     );
//   }

//   /* =========================
//       Packed / Checked / Handling Total (API based)
//   ========================= */
//   const packedBy = sale.packedBy || "";
//   const checkedBy = sale.checkedBy || "";

//   //  From your API: handlingTotal
//   const handlingTotal = Number(sale?.handlingTotal || 0);
//   const showHandling = handlingTotal > 0;

//   return (
//     <>
//       {/* ACTION BUTTONS */}
//       <Box
//         className="no-print"
//         sx={{ display: "flex", justifyContent: "center", mt: 2, gap: 1 }}
//       >
//         <Button variant="outlined" color="secondary" onClick={handleBack}>
//           பின்னே செல்
//         </Button>

//         <Button variant="contained" onClick={handlePrint}>
//           பில் அச்சிடு
//         </Button>
//       </Box>

//       {/* PRINT AREA */}
//       <Box
//         id="print-area"
//         sx={{
//           width: "72mm",
//           margin: "auto",
//           padding: "4px",
//           background: "#fff",
//           fontFamily: "'Courier New', monospace",
//           boxSizing: "border-box",
//         }}
//       >
//         {/* HEADER */}
//         <Typography align="center" fontWeight={700} sx={{ fontSize: 14 }}>
//           ESTIMATE
//         </Typography>

//         <Typography align="center" sx={{ fontSize: 11 }}>
//           ~~~~~~~~~~~ST~~~~~~~~~~~
//         </Typography>

//         <Typography align="center" sx={{ fontSize: 11 }}>
//           8825554747
//         </Typography>

//         <Divider sx={{ my: 1 }} />

//         {/* META */}
//         <Box
//           sx={{
//             display: "flex",
//             justifyContent: "space-between",
//             fontSize: 11,
//           }}
//         >
//           <span>
//             <strong>பில் எண்:</strong> {sale.invoiceNumber || sale._id}
//           </span>

//           <span>
//             <strong>தேதி:</strong>{" "}
//             {new Date(sale.saleDate).toLocaleDateString("ta-IN")}
//           </span>
//         </Box>

//         <Typography sx={{ fontSize: 11 }}>
//           <strong>பெயர்:</strong>{" "}
//           {getCustomerName(sale.customerId?.customerName)}
//         </Typography>

//         <Typography sx={{ fontSize: 11 }}>
//           <strong>வகை:</strong> {sale.saleType || "-"}
//         </Typography>

//         {/* TABLE HEADER */}
//         <Divider sx={{ my: 1 }} />

//         <Box
//           sx={{
//             display: "grid",
//             gridTemplateColumns: "1.6fr 38px 40px minmax(70px, auto)",
//             fontSize: 11,
//             fontWeight: 700,
//             borderBottom: "1px solid #000",
//             pb: 0.5,
//           }}
//         >
//           <Box>பொருள்</Box>
//           <Box sx={{ textAlign: "right" }}>விலை</Box>
//           <Box sx={{ textAlign: "right", ml: 2 }}>அளவு</Box>
//           <Box sx={{ textAlign: "right" }}>தொகை</Box>
//         </Box>

//         {/* ITEMS */}
//         {sale.items.map((item, idx) => (
//           <Box
//             key={idx}
//             sx={{
//               display: "grid",
//               gridTemplateColumns: "1.6fr 38px 40px minmax(70px, auto)",
//               fontSize: 11,
//               borderBottom: "1px solid #ccc",
//               py: 0.5,
//             }}
//           >
//             <Box sx={{ pr: 0.5 }}>{getProductName(item.productId)}</Box>

//             <Box sx={{ textAlign: "right" }}>
//               {item.sellingPrice || item.rate}
//             </Box>

//             <Box sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
//               {getQuantityValue(item)} {getUnit(item)}
//             </Box>

//             <Box sx={{ textAlign: "right" }}>₹{formatAmount(item.total)}</Box>
//           </Box>
//         ))}

//         {/* TOTALS */}
//         <Divider sx={{ my: 1 }} />

//         <Box sx={{ fontSize: 11 }}>
//           <Box sx={{ display: "flex", justifyContent: "space-between" }}>
//             <span>மொத்தம்:</span>
//             <span>₹{formatAmount(sale.grossTotal)}</span>
//           </Box>

//           <Box sx={{ display: "flex", justifyContent: "space-between" }}>
//             <span>தள்ளுபடி:</span>
//             <span>₹{formatAmount(sale.discount)}</span>
//           </Box>

//           {/*  Handling below discount */}
//           {showHandling && (
//             <Box sx={{ display: "flex", justifyContent: "space-between" }}>
//               <span>கையாளுதல் கட்டணம்:</span>
//               <span>₹{formatAmount(handlingTotal)}</span>
//             </Box>
//           )}

//           <Box
//             sx={{
//               display: "flex",
//               justifyContent: "space-between",
//               mt: 0.5,
//             }}
//           >
//             <strong>செலுத்த வேண்டியது:</strong>
//             <strong>₹{formatAmount(sale.netTotal)}</strong>
//           </Box>
//         </Box>

//         {/*  ONLY Overall Customer Balance */}
//         {customerBalance !== null && (
//           <>
//             <Divider sx={{ my: 1 }} />
//             <Box sx={{ display: "flex", justifyContent: "space-between" }}>
//               <Typography sx={{ fontSize: 12, fontWeight: 900 }}>
//                 நிலுவை தொகை:
//               </Typography>
//               <Typography sx={{ fontSize: 12, fontWeight: 900 }}>
//                 ₹{formatAmount(customerBalance)}
//               </Typography>
//             </Box>
//           </>
//         )}

//         {/*  Packed / Checked */}
//         <Divider sx={{ my: 1 }} />

//         <Box
//           sx={{
//             display: "flex",
//             justifyContent: "space-between",
//             mt: 0.5,
//             fontSize: "11px",
//           }}
//         >
//           <Box sx={{ width: "48%", textAlign: "center" }}>
//             <Typography sx={{ fontSize: "11px" }}>
//               {packedBy ? packedBy : "______________"}
//             </Typography>
//             <Typography sx={{ fontSize: "10px" }}>Packed By</Typography>
//           </Box>

//           <Box sx={{ width: "48%", textAlign: "center" }}>
//             <Typography sx={{ fontSize: "11px" }}>
//               {checkedBy ? checkedBy : "______________"}
//             </Typography>
//             <Typography sx={{ fontSize: "10px" }}>Checked By</Typography>
//           </Box>
//         </Box>

//         {/* FOOTER */}
//         <Divider sx={{ my: 1 }} />
//         <Typography
//           align="center"
//           sx={{ fontSize: 11, fontStyle: "italic", mt: 1 }}
//         >
//           நன்றி — மீண்டும் வருக!
//         </Typography>
//       </Box>

//       {/* THERMAL PRINT CSS */}
//       <style>{`
//         @page {
//           size: 72mm auto;
//           margin: 0;
//         }

//         @media print {
//           html, body {
//             padding: 0;
//             margin: 0;
//             width: 72mm;
//             -webkit-print-color-adjust: exact;
//           }

//           body * {
//             visibility: hidden;
//           }

//           #print-area,
//           #print-area * {
//             visibility: visible;
//           }

//           #print-area {
//             position: absolute;
//             top: 0;
//             left: 50%;
//             transform: translateX(-50%);
//             width: 72mm;
//             padding: 2mm;
//           }

//           .no-print {
//             display: none !important;
//           }
//         }
//       `}</style>
//     </>
//   );
// }
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
  Button,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";

export default function SalesBill() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerBalance, setCustomerBalance] = useState(null);

  /* =========================
     PAPER SIZE (3" / 4")
  ========================= */
  const PAPER_WIDTH = sale?.printSize === "4IN" ? "80mm" : "72mm";

  /* =========================
     AUTO PRINT
  ========================= */
  useEffect(() => {
    if (!loading && sale) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, sale]);

  /* =========================
     FETCH SALE
  ========================= */
  useEffect(() => {
    const fetchSale = async () => {
      try {
        const res = await customFetch.get(`/sales/${id}`);
        if (res.data?.success) {
          setSale(res.data.data);
          fetchCustomerBalance(res.data.data.customerId?._id);
        } else {
          toast.error("பில் கிடைக்கவில்லை");
        }
      } catch {
        toast.error("பில் பெறுவதில் பிழை");
      } finally {
        setLoading(false);
      }
    };
    fetchSale();
  }, [id]);

  const fetchCustomerBalance = async (customerId) => {
    try {
      const res = await customFetch.get(`/customer/${customerId}/ledger`);
      setCustomerBalance(res.data?.totals?.totalBalance ?? null);
    } catch {
      setCustomerBalance(null);
    }
  };

  /* =========================
     HELPERS
  ========================= */
  const formatAmount = (v) =>
    Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getProductName = (p) => p?.name?.ta || p?.name?.en || "-";

  const getUnit = (item) => item?.unit?.ta || item?.unit?.en || "";

  const getQty = (item) => item?.quantity ?? item?.qty ?? "";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sale) {
    return (
      <Typography align="center" sx={{ mt: 5, fontWeight: 900 }}>
        பில் கிடைக்கவில்லை
      </Typography>
    );
  }

  const packedBy = sale.packedBy || "";
  const checkedBy = sale.checkedBy || "";

  const handlingTotal = Number(sale.handlingTotal || 0);
  const showHandling = handlingTotal > 0;

  /* =========================
     TRANSPORT (2 LINES)
  ========================= */
  const transport = sale.transportDetails || {};
  const transportOffice = transport.transportOffice || "";
  const startPlace = transport.startPlace || "";
  const destination = transport.destination || "";
  const driverPhone = transport.driverPhone || "";

  /* =========================
     GRID TEMPLATE (CRITICAL)
     Qty column aligns EXACTLY
  ========================= */
  const ITEM_GRID = "18ch 6ch 7ch 10ch";

  return (
    <>
      {/* ACTION BUTTONS */}
      <Box
        className="no-print"
        sx={{ display: "flex", justifyContent: "center", mt: 2, gap: 1 }}
      >
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          Print
        </Button>
      </Box>

      {/* PRINT AREA */}
      <Box
        id="print-area"
        sx={{
          width: PAPER_WIDTH,
          mx: "auto",
          p: "4px",
          background: "#fff",
          fontFamily: "'Courier New', monospace",
          fontWeight: 900, // 🔥 ALL TEXT BOLD
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}
        <Typography align="center" sx={{ fontSize: 14, fontWeight: 900 }}>
          ESTIMATE
        </Typography>

        <Typography align="center" sx={{ fontSize: 11, fontWeight: 900 }}>
          ~~~~~~~~~~~ST~~~~~~~~~~~
        </Typography>

        <Divider sx={{ my: 1 }} />

        {/* META */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
          }}
        >
          <span>பில் எண்: {sale.invoiceNumber}</span>
          <span>
            தேதி: {new Date(sale.saleDate).toLocaleDateString("ta-IN")}
          </span>
        </Box>

        <Typography sx={{ fontSize: 11 }}>
          பெயர்:{" "}
          {sale.customerId?.customerName?.ta || sale.customerId?.customerName}
        </Typography>

        <Divider sx={{ my: 1 }} />

        {/* TABLE HEADER */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: ITEM_GRID,
            fontSize: 11,
            borderBottom: "2px solid #000",
            pb: 0.5,
          }}
        >
          <Box>பொருள்</Box>
          <Box sx={{ textAlign: "right" }}>விலை</Box>
          <Box sx={{ textAlign: "right" }}>அளவு</Box>
          <Box sx={{ textAlign: "right" }}>தொகை</Box>
        </Box>

        {/* ITEMS */}
        {sale.items.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              display: "grid",
              gridTemplateColumns: ITEM_GRID,
              fontSize: 11,
              borderBottom: "1px solid #000",
              py: 0.4,
            }}
          >
            <Box sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {getProductName(item.productId)}
            </Box>

            <Box sx={{ textAlign: "right" }}>
              {formatAmount(item.sellingPrice)}
            </Box>

            {/* 🔥 QTY + UNIT — PERFECTLY ALIGNED */}
            <Box
              sx={{
                textAlign: "right",
                whiteSpace: "nowrap",
                letterSpacing: "-0.9px",
              }}
            >
              {`${getQty(item)} ${getUnit(item)}`}
            </Box>

            <Box sx={{ textAlign: "right" }}>₹{formatAmount(item.total)}</Box>
          </Box>
        ))}

        {/* TOTALS */}
        <Divider sx={{ my: 1 }} />

        <Box sx={{ fontSize: 11 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>மொத்தம்:</span>
            <span>₹{formatAmount(sale.grossTotal)}</span>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>தள்ளுபடி:</span>
            <span>₹{formatAmount(sale.discount)}</span>
          </Box>

          {showHandling && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <span>கையாளுதல்:</span>
              <span>₹{formatAmount(handlingTotal)}</span>
            </Box>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}
          >
            <span>செலுத்த வேண்டியது:</span>
            <span>₹{formatAmount(sale.netTotal)}</span>
          </Box>
        </Box>

        {/* CUSTOMER BALANCE */}
        {customerBalance !== null && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <span>நிலுவை:</span>
              <span>₹{formatAmount(customerBalance)}</span>
            </Box>
          </>
        )}

        {/* PACKED / CHECKED */}
        <Divider sx={{ my: 1 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
          }}
        >
          <Box sx={{ width: "48%", textAlign: "center" }}>
            {packedBy || "______________"}
            <Typography sx={{ fontSize: 10, fontWeight: 900 }}>
              Packed By
            </Typography>
          </Box>
          <Box sx={{ width: "48%", textAlign: "center" }}>
            {checkedBy || "______________"}
            <Typography sx={{ fontSize: 10, fontWeight: 900 }}>
              Checked By
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />
        <Typography align="center" sx={{ fontSize: 11, fontWeight: 900 }}>
          நன்றி — மீண்டும் வருக!
        </Typography>
      </Box>

      {/* PRINT CSS */}
      <style>{`
        @page {
          size: auto;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
