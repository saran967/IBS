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

export default function QuotationPrint() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);

    /* =========================
       PAPER SIZE (3")
    ========================= */
    const PAPER_WIDTH = "72mm";

    /* =========================
       AUTO PRINT
    ========================= */
    useEffect(() => {
        if (!loading && quote) {
            const t = setTimeout(() => window.print(), 500);
            return () => clearTimeout(t);
        }
    }, [loading, quote]);

    /* =========================
       FETCH QUOTATION
    ========================= */
    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const res = await customFetch.get(`/quotations/${id}`);
                if (res.data?.success) {
                    setQuote(res.data.data);
                } else {
                    toast.error("Quote not found");
                }
            } catch {
                toast.error("Error fetching quote");
            } finally {
                setLoading(false);
            }
        };
        fetchQuote();
    }, [id]);

    /* =========================
       HELPERS
    ========================= */
    const formatAmount = (v) =>
        Number(v || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    const getProductName = (p) => p?.name?.ta || p?.name?.en || p?.name || "-";

    const getUnit = (item) => item?.unit?.ta || item?.unit?.en || item?.unit || "";

    const getQty = (item) => item?.quantity ?? item?.qty ?? "";

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!quote) {
        return (
            <Typography align="center" sx={{ mt: 5, fontWeight: 900 }}>
                Not found
            </Typography>
        );
    }

    /* =========================
       GRID TEMPLATE
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
                    Print Thermal
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
                    QUOTATION
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
                    <span>No: {quote.quotationNumber}</span>
                    <span>
                        Date: {new Date(quote.createdAt).toLocaleDateString("en-IN")}
                    </span>
                </Box>

                <Typography sx={{ fontSize: 11 }}>
                    Name: {quote.customerId?.customerName?.ta || quote.customerId?.customerName?.en || quote.customerId?.customerName || "Walk-in"}
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
                    <Box>Item</Box>
                    <Box sx={{ textAlign: "right" }}>Price</Box>
                    <Box sx={{ textAlign: "right" }}>Qty</Box>
                    <Box sx={{ textAlign: "right" }}>Total</Box>
                </Box>

                {/* ITEMS */}
                {quote.items.map((item, idx) => (
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
                        <span>Gross Total:</span>
                        <span>₹{formatAmount(quote.grossTotal)}</span>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Discount:</span>
                        <span>₹{formatAmount(quote.discount)}</span>
                    </Box>

                    <Box
                        sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}
                    >
                        <span>Net Total:</span>
                        <span>₹{formatAmount(quote.netTotal)}</span>
                    </Box>
                </Box>


                <Divider sx={{ my: 1 }} />
                <Typography align="center" sx={{ fontSize: 11, fontWeight: 900 }}>
                    This is an estimate, not a bill.
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
