// import { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   Box,
//   Typography,
//   Divider,
//   CircularProgress,
//   Paper,
//   Button,
// } from "@mui/material";
// import customFetch from "../../utils/customFetch";
// import { toast } from "react-toastify";
// import QRCode from "react-qr-code";

// export default function TokenPrint() {
//   const { tokenNumber } = useParams();
//   const navigate = useNavigate();
//   const [token, setToken] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const isPrintTriggered = useRef(false);

//   useEffect(() => {
//     const fetchTokenAndPrint = async () => {
//       try {
//         const res = await customFetch(`/token/${tokenNumber}/print`);
//         if (res.data.success) {
//           setToken(res.data.token);

//           if (!isPrintTriggered.current) {
//             isPrintTriggered.current = true;

//             setTimeout(() => {
//               window.print();
//               window.onafterprint = () => navigate(-1);
//             }, 1200);
//           }
//         } else {
//           toast.error(res.data.message || "Token not found");
//         }
//       } catch (err) {
//         toast.error("Error fetching token");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (loading) fetchTokenAndPrint();
//   }, [loading, navigate, tokenNumber]);

//   const getText = (value) => {
//     if (!value) return "-";
//     if (typeof value === "string") return value;
//     if (typeof value === "object") return value.en || value.ta || "-";
//     return String(value);
//   };

//   const shopName = getText(token?.shopId?.name);
//   const customerName = getText(token?.customerId?.customerName);

//   if (loading)
//     return (
//       <Box sx={{ textAlign: "center", mt: 5 }}>
//         <CircularProgress />
//         <Typography variant="h6" sx={{ mt: 2 }}>
//           Fetching Token...
//         </Typography>
//       </Box>
//     );

//   if (!token)
//     return (
//       <Typography
//         variant="h6"
//         color="error"
//         sx={{ mt: 3, textAlign: "center" }}
//       >
//         Token not found
//       </Typography>
//     );

//   return (
//     <Box
//       className="print-page-wrapper"
//       sx={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         py: 4,
//         backgroundColor: "#f8f8f8",
//         minHeight: "100vh",
//       }}
//     >
//       <Button
//         onClick={() => navigate(-1)}
//         variant="contained"
//         className="no-print"
//         sx={{ mb: 2 }}
//       >
//         ← Back to Sales
//       </Button>

//       <Paper
//         className="bill-content-to-print"
//         sx={{
//           width: "105mm",
//           minHeight: "148mm",
//           p: 2,
//           boxSizing: "border-box",
//           boxShadow: "0 0 10px rgba(0,0,0,0.15)",
//           background: "white",
//         }}
//       >
//         <Box sx={{ textAlign: "center", mb: 1 }}>
//           <Typography variant="h6" fontWeight="bold">
//             {shopName}
//           </Typography>
//           <Typography variant="body2" color="text.secondary">
//             Pickup Token Receipt
//           </Typography>
//         </Box>

//         <Divider sx={{ mb: 1 }} />

//         <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
//           <Typography variant="body2">
//             <b>Token No:</b> {token.tokenNumber}
//           </Typography>
//           <Typography variant="body2">
//             <b>Date:</b>{" "}
//             {new Date(token.createdAt).toLocaleDateString("en-IN", {
//               day: "2-digit",
//               month: "short",
//               year: "numeric",
//             })}
//           </Typography>
//         </Box>

//         <Typography variant="body2">
//           <b>Customer:</b> {customerName}
//         </Typography>

//         <Typography variant="body2">
//           <b>Pickup Date:</b>{" "}
//           {token.pickupDate
//             ? new Date(token.pickupDate).toLocaleString("en-IN")
//             : "—"}
//         </Typography>

//         <Typography variant="body2">
//           <b>Total Items:</b> {token.items?.length || 0}
//         </Typography>

//         <Divider sx={{ mb: 2 }} />

//         {token.notes && (
//           <Typography
//             variant="body2"
//             sx={{ mt: 1, mb: 1, fontStyle: "italic", color: "text.secondary" }}
//           >
//             {getText(token.notes)}
//           </Typography>
//         )}

//         <Box sx={{ textAlign: "center", mt: 1 }}>
//           <QRCode value={token.tokenNumber} size={70} />
//           <Typography variant="caption">{token.tokenNumber}</Typography>
//         </Box>

//         <Divider sx={{ my: 1 }} />

//         <Box
//           sx={{
//             display: "flex",
//             justifyContent: "space-between",
//             mt: 1,
//             fontSize: "12px",
//           }}
//         >
//           <Box sx={{ textAlign: "center" }}>
//             <Typography variant="body2">______________</Typography>
//             <Typography variant="caption">Issued By</Typography>
//           </Box>

//           <Box sx={{ textAlign: "center" }}>
//             <Typography variant="body2">______________</Typography>
//             <Typography variant="caption">Received By</Typography>
//           </Box>
//         </Box>

//         <Typography
//           variant="caption"
//           align="center"
//           display="block"
//           sx={{ mt: 1 }}
//         >
//           Thank you! Please bring this token during pickup.
//         </Typography>
//       </Paper>

//       {/* PRINT CSS FOR EXACT A6 FORMAT */}
//       <style>{`
//         @page {
//           size: A6;
//           margin: 0;
//         }

//         @media print {
//           body {
//             -webkit-print-color-adjust: exact !important;
//             print-color-adjust: exact !important;
//           }

//           body * {
//             visibility: hidden;
//           }

//           .bill-content-to-print,
//           .bill-content-to-print * {
//             visibility: visible !important;
//           }

//           .bill-content-to-print {
//             position: absolute;
//             top: 0;
//             left: 0;
//             width: 105mm !important;
//             min-height: 148mm !important;
//             padding: 10px !important;
//             margin: 0 !important;
//             box-shadow: none !important;
//           }

//           .no-print {
//             display: none !important;
//           }
//         }
//       `}</style>
//     </Box>
//   );
// }

import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
  Paper,
  Button,
} from "@mui/material";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";
import QRCode from "react-qr-code";

export default function TokenPrint() {
  const { tokenNumber } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPrintTriggered = useRef(false);

  useEffect(() => {
    const fetchTokenAndPrint = async () => {
      try {
        const res = await customFetch(`/token/${tokenNumber}/print`);
        if (res.data.success) {
          setToken(res.data.token);

          if (!isPrintTriggered.current) {
            isPrintTriggered.current = true;

            setTimeout(() => {
              window.print();
              window.onafterprint = () => navigate(-1);
            }, 1200);
          }
        } else {
          toast.error(res.data.message || "Token not found");
        }
      } catch (err) {
        toast.error("Error fetching token");
      } finally {
        setLoading(false);
      }
    };

    if (loading) fetchTokenAndPrint();
  }, [loading, navigate, tokenNumber]);

  const getText = (value) => {
    if (!value) return "-";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value.en || value.ta || "-";
    return String(value);
  };

  const shopName = getText(token?.shopId?.name);
  const customerName = getText(token?.customerId?.customerName);

  //  Tamil sentence from your image
  const tamilTokenNote =
    "Token எண் பதிவு அடையாளத்திற்கு மட்டுமே தவிர, வரிசை முறை இல்லை";

  if (loading)
    return (
      <Box sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Fetching Token...
        </Typography>
      </Box>
    );

  if (!token)
    return (
      <Typography
        variant="h6"
        color="error"
        sx={{ mt: 3, textAlign: "center" }}
      >
        Token not found
      </Typography>
    );

  return (
    <Box
      className="print-page-wrapper"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 4,
        backgroundColor: "#f8f8f8",
        minHeight: "100vh",
      }}
    >
      <Button
        onClick={() => navigate(-1)}
        variant="contained"
        className="no-print"
        sx={{ mb: 2 }}
      >
        ← Back to Sales
      </Button>

      <Paper
        className="bill-content-to-print"
        sx={{
          width: "105mm",
          minHeight: "148mm",
          p: 2,
          boxSizing: "border-box",
          boxShadow: "0 0 10px rgba(0,0,0,0.15)",
          background: "white",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {shopName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pickup Token Receipt
          </Typography>
        </Box>

        <Divider sx={{ mb: 1 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2">
            <b>Token No:</b> {token.tokenNumber}
          </Typography>

          <Typography variant="body2">
            <b>Date:</b>{" "}
            {new Date(token.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Typography>
        </Box>

        <Typography variant="body2">
          <b>Customer:</b> {customerName}
        </Typography>

        <Typography variant="body2">
          <b>Pickup Date:</b>{" "}
          {token.pickupDate
            ? new Date(token.pickupDate).toLocaleString("en-IN")
            : "—"}
        </Typography>

        <Typography variant="body2">
          <b>Total Items:</b> {token.items?.length || 0}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {token.notes && (
          <Typography
            variant="body2"
            sx={{ mt: 1, mb: 1, fontStyle: "italic", color: "text.secondary" }}
          >
            {getText(token.notes)}
          </Typography>
        )}

        <Box sx={{ textAlign: "center", mt: 1 }}>
          <QRCode value={token.tokenNumber} size={70} />
          <Typography variant="caption">{token.tokenNumber}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 1,
            fontSize: "12px",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2">______________</Typography>
            <Typography variant="caption">Issued By</Typography>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2">______________</Typography>
            <Typography variant="caption">Received By</Typography>
          </Box>
        </Box>

        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{ mt: 1 }}
        >
          Thank you! Please bring this token during pickup.
        </Typography>
        {/*  Tamil Note (Added below token number) */}
        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{
            mb: 1,
            fontWeight: 700,
            color: "#000",
            fontSize: "11px",
          }}
        >
          {tamilTokenNote}
        </Typography>
      </Paper>

      {/* PRINT CSS FOR EXACT A6 FORMAT */}
      <style>{`
        @page {
          size: A6;
          margin: 0;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .bill-content-to-print,
          .bill-content-to-print * {
            visibility: visible !important;
          }

          .bill-content-to-print {
            position: absolute;
            top: 0;
            left: 0;
            width: 105mm !important;
            min-height: 148mm !important;
            padding: 10px !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </Box>
  );
}
