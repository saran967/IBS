import React from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
} from "@mui/material";
import getLocalizedText from "../../../../utils/getLocalizedText";

export default function B2BAllocationTable({
  saleType,
  items,
  b2bCompanies,
  companyQtyMap,
  setCompanyQtyMap,
  isSaved,
  getText,
}) {
  if (saleType !== "B2B") return null;
  if (!b2bCompanies || b2bCompanies.length === 0) return null;
  const resolveUnitLabel = (it) => {
    if (it.isLoose && it.looseUnit) return it.looseUnit;
    if (it.soldUnit) return it.soldUnit;
    if (it.productBaseUnit) return it.productBaseUnit;
    return "";
  };

  return (
    <Box sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2, mt: 3 }}>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
        Company-wise Quantity Allocation
      </Typography>

      <TableContainer sx={{ maxHeight: 320 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={headStyle(230)}>Product</TableCell>
              <TableCell sx={headStyle(90)}>Unit</TableCell>

              {b2bCompanies.map((c) => (
                <TableCell key={c._id} align="center" sx={headStyle(140, true)}>
                  {getLocalizedText(c.companyName || c.name)}
                </TableCell>
              ))}

              <TableCell align="center" sx={headStyle(90, true)}>
                Main Qty
              </TableCell>

              <TableCell align="center" sx={headStyle(80, true)}>
                Sum
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((it) => {
              //  stable PID (supports any productId type)
              const pid = String(
                it.productId?._id ||
                  it.productId ||
                  it._pid ||
                  it.productCode ||
                  "",
              );

              const mainQty = Number(it.quantity) || 0;
              const perCompany = companyQtyMap?.[pid] || {};

              const companySum = Object.values(perCompany).reduce(
                (sum, v) => sum + (Number(v) || 0),
                0,
              );

              return (
                <TableRow key={pid}>
                  {/* Product */}
                  <TableCell sx={bodyStyle(230)}>
                    {getLocalizedText(it.name) || it.productCode}
                  </TableCell>

                  {/* Unit */}
                  <TableCell sx={bodyStyle(90)}>
                    {getLocalizedText(resolveUnitLabel(it))}
                  </TableCell>

                  {/* Company fields */}
                  {b2bCompanies.map((c) => (
                    <TableCell key={c._id} sx={bodyStyle(140)} align="center">
                      <TextField
                        size="small"
                        type="number"
                        value={companyQtyMap?.[pid]?.[c._id] ?? ""}
                        onChange={(e) => {
                          if (isSaved) return;
                          const value = Number(e.target.value) || 0;

                          setCompanyQtyMap((prev) => {
                            const updated = { ...prev };
                            if (!updated[pid]) updated[pid] = {};
                            updated[pid][c._id] = value;
                            return updated;
                          });
                        }}
                        disabled={isSaved}
                        sx={{ width: 90 }}
                      />
                    </TableCell>
                  ))}

                  {/* Main Qty */}
                  <TableCell sx={bodyStyle(90)} align="center">
                    {mainQty}
                  </TableCell>

                  {/* Sum */}
                  <TableCell
                    sx={{
                      ...bodyStyle(80),
                      color: companySum !== mainQty ? "red" : "inherit",
                      fontWeight: companySum !== mainQty ? 700 : 500,
                    }}
                    align="center"
                  >
                    {companySum}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/* ---------------- styles ---------------- */

function headStyle(minWidth, center = false) {
  return {
    minWidth,
    fontSize: 13,
    fontWeight: 700,
    backgroundColor: "#f2f2f2",
    borderBottom: "1px solid #bbb",
    whiteSpace: "nowrap",
    ...(center ? { textAlign: "center" } : {}),
  };
}

function bodyStyle(minWidth) {
  return {
    minWidth,
    fontSize: 13,
    whiteSpace: "nowrap",
    py: 0.5,
  };
}
