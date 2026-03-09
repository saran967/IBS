import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Divider,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";

export default function SalesBill() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [godowns, setGodowns] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customFetch.get(`/sales/${id}`);
        if (!res.data.success) {
          toast.error("Failed to load sale");
          return;
        }
        setSale(res.data.data);
      } catch (err) {
        toast.error("Failed to load bill");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const fetchShopDetails = async () => {
    try {
      const res = await customFetch.get("/godowns");
      setGodowns(res.data.godowns || []);
    } catch (error) {
      toast.error("Failed to load shop details");
    }
  };

  useEffect(() => {
    fetchShopDetails();
  }, []);

  const getShopName = (item) => {
    // Case 1: Shop directly on item
    if (item.shopId?.name?.en) {
      return item.shopId.name.en;
    }

    // Case 2: Resolve via godown
    if (item.godownId?._id && godowns.length > 0) {
      const matchedGodown = godowns.find((g) => g._id === item.godownId._id);
      if (matchedGodown?.shopId?.name?.en) {
        return matchedGodown.shopId.name.en;
      }
    }

    return "-";
  };

  useEffect(() => {
    if (!loading && sale) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [loading, sale]);

  // ---------------------------------------------
  // PRINT CONDITION (ANY TRUE → PRINT ITEM)
  // ---------------------------------------------
  const canPrint = (item) => {
    const p = item.productId;
    if (!p) return false;
    return p.enableDelivery === true || p.categoryDeliveryEnabled === true;
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );

  if (!sale)
    return (
      <Typography align="center" sx={{ mt: 5 }}>
        Bill Not Found
      </Typography>
    );

  const deliverableItems = sale.items.filter((i) => canPrint(i));

  const formatDate = (d) => {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}-${String(
      dt.getMonth() + 1,
    ).padStart(2, "0")}-${dt.getFullYear()}`;
  };

  //  Transport details safely
  // Transport details (safe extraction)
  const transport = sale.transportDetails || {};

  const transportOffice = transport.transportOffice || "";
  const startPlace = transport.startPlace || "";
  const destination = transport.destination || "";
  const driverPhone = transport.driverPhone || "";

  //  Packed / Checked (from sale)
  const packedBy = sale.packedBy || "";
  const checkedBy = sale.checkedBy || "";

  // ---------------------------------------------
  //  THERMAL BILL COMPONENT (72mm)
  // ---------------------------------------------
  const renderThermal = (item, index) => (
    <Box
      key={index}
      sx={{
        width: "100%",
        background: "#fff",
        p: "6px",
        mb: "8px",
        fontFamily: "'Courier New', monospace",
        fontSize: "12px",
        textAlign: "center",
        borderBottom: "1px dashed #000",
        pageBreakInside: "avoid",
      }}
    >
      <Typography sx={{ fontSize: "14px", fontWeight: "bold" }}>
        DELIVERY BILL
      </Typography>

      <Typography sx={{ fontSize: "12px" }}>~~~~~~~~~~~~~~~~~~~~</Typography>

      {/*  Invoice + Date */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 1,
          fontSize: "12px",
        }}
      >
        <span>No: {sale.invoiceNumber}</span>
        <span>Date: {formatDate(sale.saleDate)}</span>
      </Box>

      {/*  Product + Qty */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 1,
          fontSize: "12px",
        }}
      >
        <span style={{ textAlign: "left", maxWidth: "55%" }}>
          {item.productName?.en || item.productName}
        </span>

        <span style={{ textAlign: "right", maxWidth: "45%" }}>
          {item.quantity} {item.productId?.unit?.en || ""} {getShopName(item)}
        </span>
      </Box>

      {/*  Transport Details */}
      {(transportOffice || startPlace || destination || driverPhone) && (
        <>
          <Divider sx={{ my: 0.8, borderColor: "#000" }} />

          <Box sx={{ fontSize: "11px" }}>
            {/* Line 1 */}
            {(transportOffice || driverPhone) && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {transportOffice && (
                    <>
                      <b>Office:</b> {transportOffice}
                    </>
                  )}
                </span>

                <span>
                  {driverPhone && (
                    <>
                      <b>Driver Ph:</b> {driverPhone}
                    </>
                  )}
                </span>
              </Box>
            )}

            {/* Line 2 */}
            {(startPlace || destination) && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 0.3,
                }}
              >
                <span>
                  {startPlace && (
                    <>
                      <b>From:</b> {startPlace}
                    </>
                  )}
                </span>

                <span>
                  {destination && (
                    <>
                      <b>To:</b> {destination}
                    </>
                  )}
                </span>
              </Box>
            )}
          </Box>
        </>
      )}

      {/*  Packed / Checked Alignment */}
      <Divider sx={{ my: 0.8, borderColor: "#000" }} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 1,
          fontSize: "11px",
        }}
      >
        <Box sx={{ width: "48%", textAlign: "center" }}>
          <Typography sx={{ fontSize: "11px" }}>
            {packedBy ? packedBy : "______________"}
          </Typography>
          <Typography sx={{ fontSize: "10px" }}>Packed By</Typography>
        </Box>

        <Box sx={{ width: "48%", textAlign: "center" }}>
          <Typography sx={{ fontSize: "11px" }}>
            {checkedBy ? checkedBy : "______________"}
          </Typography>
          <Typography sx={{ fontSize: "10px" }}>Checked By</Typography>
        </Box>
      </Box>

      <Typography
        sx={{
          textAlign: "right",
          fontWeight: "bold",
          mt: 1,
          fontSize: "12px",
        }}
      >
        நன்றி! மீண்டும் வருக!!
      </Typography>
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: 2,
          textAlign: "center",
        }}
        className="no-print"
      >
        <Button variant="outlined" sx={{ mr: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>

        <Button variant="contained" onClick={() => window.print()}>
          Print Delivery Bill
        </Button>
      </Box>

      <Box
        id="print-area"
        sx={{
          mt: 2,
          width: "72mm",
          mx: "auto",
        }}
      >
        {deliverableItems.length === 0 ? (
          <Typography
            sx={{
              textAlign: "center",
              fontSize: "12px",
              mt: 3,
              color: "red",
              fontWeight: "bold",
            }}
          >
            ⚠ No items available for delivery
          </Typography>
        ) : (
          deliverableItems.map((item, i) => renderThermal(item, i))
        )}
      </Box>

      {/*  THERMAL PRINT CSS */}
      <style>
        {`
          @page {
            size: 72mm auto;
            margin: 0;
          }

          @media print {
            html, body {
              padding: 0;
              margin: 0;
              width: 72mm;
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
              width: 72mm;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
    </>
  );
}
