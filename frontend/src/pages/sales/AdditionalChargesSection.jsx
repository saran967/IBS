// AdditionalChargesSection.jsx
import React, { useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
} from "@mui/material";

const TRANSPORT_LABELS = {
  transportAgency: "Transport Agency",
  transportOffice: "Transport Office",
  startPlace: "Start Place",
  destination: "Destination",
  vehicleNumber: "Vehicle Number",
  driverName: "Driver Name",
  driverPhone: "Driver Phone",
  remarks: "Remarks",
};

export default function AdditionalChargesSection({
  tabId,
  updateTabData,
  includeTransport,
  setIncludeTransport,
  transport,
  setTransport,
  includeHandling,
  setIncludeHandling,
  handlingCharges,
  setHandlingCharges,
  items,
  recalcTotals,
  isSaved,
  refs = { current: {} },
  focusNextLogicalField = () => false,
  onFinalEnter = async () => {},
}) {
  /**
   *  FIXED: Handling must be ROW WISE
   * Use it.rowKey (unique) instead of productId
   */
  const handleHandlingChange = (
    rowKey,
    value,
    productId,
    productName,
    unit,
  ) => {
    const perPack = Number(value) || 0;

    const memorizedvalue = useMemo(() => {
      item.reduce((sum, i) => sum + i.price, 0);
    }, [items]);

    const item = items.find((i) => i.rowKey === rowKey);
    if (!item) return;

    const qty = Number(item.qty || item.quantity || 0);
    const totalCharge = perPack * qty;

    setHandlingCharges((prev) => {
      const existing = prev.find((h) => h.rowKey === rowKey);

      let updated;
      if (existing) {
        updated = prev.map((h) =>
          h.rowKey === rowKey
            ? {
                ...h,
                productId,
                productName,
                unit,
                perPackCharge: perPack,
                totalCharge,
              }
            : h,
        );
      } else {
        updated = [
          ...prev,
          {
            rowKey, //  unique per row
            productId,
            productName,
            unit,
            perPackCharge: perPack,
            totalCharge,
          },
        ];
      }

      //  recalc totals with updated charges
      recalcTotals(items, {}, updated);

      //  save in tab storage
      updateTabData(tabId, {
        handlingCharges: updated,
        includeHandling,
      });

      return updated;
    });
  };

  //  Enter navigation
  const handleEnterInChild = async (e, key) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const moved = focusNextLogicalField({
      refs,
      currentKey: key,
      items,
      includeHandling,
      includeTransport,
    });

    if (moved) return;

    await onFinalEnter();
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/*  Handling Charges */}
      <FormControlLabel
        control={
          <Switch
            checked={includeHandling}
            onChange={(e) => {
              setIncludeHandling(e.target.checked);

              //  If OFF -> clear handling charges
              if (!e.target.checked) {
                setHandlingCharges([]);
                updateTabData(tabId, {
                  includeHandling: false,
                  handlingCharges: [],
                });
                recalcTotals(items, {}, []);
              } else {
                updateTabData(tabId, { includeHandling: true });
              }
            }}
            disabled={isSaved}
          />
        }
        label="Include Handling Charges"
      />

      {includeHandling && (
        <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 3, mt: 1 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
            Handling Charges (per pack/sack)
          </Typography>

          {items.map((it, idx) => {
            if (!it.productId) return null;

            const current =
              handlingCharges.find((h) => h.rowKey === it.rowKey) || null;

            return (
              <Grid
                container
                spacing={2}
                alignItems="center"
                key={it.rowKey || idx}
                sx={{ mb: 1 }}
              >
                <Grid item xs={12} sm={4} md={3}>
                  <Typography sx={{ fontSize: 13 }}>
                    {typeof it.name === "object"
                      ? it.name?.en || it.name?.ta
                      : it.name || it.productCode}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    fullWidth
                    label="Charge per pack"
                    size="small"
                    type="number"
                    value={current?.perPackCharge || ""}
                    onChange={(e) =>
                      handleHandlingChange(
                        it.rowKey,
                        e.target.value,
                        it.productId,
                        typeof it.name === "object"
                          ? it.name?.en || it.name?.ta
                          : it.name,
                        it.unit,
                      )
                    }
                    inputRef={(el) =>
                      (refs.current[`handling_${it.rowKey}`] = el)
                    }
                    onKeyDown={(e) =>
                      handleEnterInChild(e, `handling_${it.rowKey}`)
                    }
                    disabled={isSaved}
                  />
                </Grid>

                <Grid item xs={12} sm={4} md={3}>
                  <Typography sx={{ fontSize: 13 }}>
                    Total: ₹{Number(current?.totalCharge || 0).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            );
          })}
        </Box>
      )}

      {/*  Transport */}
      <FormControlLabel
        control={
          <Switch
            checked={includeTransport}
            onChange={(e) => {
              setIncludeTransport(e.target.checked);
              updateTabData(tabId, { includeTransport: e.target.checked });
            }}
            disabled={isSaved}
          />
        }
        label="Include Transport Details"
        sx={{ mt: 3 }}
      />

      {includeTransport && (
        <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 3, mt: 1 }}>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
            Transport Details
          </Typography>

          <Grid container spacing={2}>
            {[
              "transportAgency",
              "transportOffice",
              "startPlace",
              "destination",
              "vehicleNumber",
              "driverName",
              "driverPhone",
              "remarks",
            ].map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f}>
                <TextField
                  fullWidth
                  label={TRANSPORT_LABELS[f]}
                  size="small"
                  type={f === "driverPhone" ? "tel" : "text"}
                  value={transport[f] || ""}
                  onChange={(e) =>
                    setTransport((prev) => {
                      const updated = { ...prev, [f]: e.target.value };
                      updateTabData(tabId, { transport: updated });
                      return updated;
                    })
                  }
                  inputRef={(el) => (refs.current[f] = el)}
                  onKeyDown={(e) => handleEnterInChild(e, f)}
                  disabled={isSaved}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
