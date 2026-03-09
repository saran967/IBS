import React, { useEffect, useState } from "react";
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
  IconButton,
  Button,
  FormControl,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../../../utils/customFetch";

export default function SalesItemsTable({
  items = [],
  setItems,
  combinedLocations = [],

  productSearchOptions = {}, //  NOW STORES OPTIONS USING rowKey (or fallback index)
  setProductSearchText,

  products = [],
  isSaved,
  billType,
  refs,

  handleItemChange,
  handleProductCodeChange,
  handleDeleteRow,
  handleAddRow,
  focusField,
  focusNextLogicalField,
  handleEnterInField,
  handleSkuFunctionKey,
  getText,

  includeHandling,
  includeTransport,
  onQuickPurchase,
}) {
  const [activeRow, setActiveRow] = useState(0);
  const [unitOpenRow, setUnitOpenRow] = useState(null);
  /* ---------------- Styles ---------------- */

  //  Classic header style
  const headCellStyle = (w = 120) => ({
    fontWeight: 800,
    fontSize: 13,
    background: "#F4F6FB",
    borderBottom: "2px solid #E3E8F7",
    whiteSpace: "nowrap",
    width: w,
    minWidth: w,
    textAlign: "center",
    py: 0.7,
  });

  //  Classic body cell style (grid lines like billing software)
  const bodyCellStyle = (w = 120) => ({
    fontSize: 13,
    whiteSpace: "nowrap",
    width: w,
    minWidth: w,
    textAlign: "center",
    py: 0,
    px: 0,
  });

  const moneyCell = { fontWeight: 900, fontSize: 13 };

  //  Borderless classic input style (no textbox borders)
  const classicInputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 0,
      background: "transparent",
      padding: 0,
      "& fieldset": { border: "none" },
      "&:hover fieldset": { border: "none" },
      "&.Mui-focused fieldset": { border: "none" },
    },
    "& input": {
      padding: "6px 6px",
      fontSize: 13,
    },
  };

  //  active row highlight (like billing software)
  const rowHighlight = (index) => ({
    backgroundColor: activeRow === index ? "#b2ebf2" : "#ffffff",
  });

  /* ---------------- Helpers ---------------- */

  const getLocId = (item) => {
    // 1️⃣ locationObj always wins
    if (item?.locationObj?._id) return item.locationObj._id;

    // 2️⃣ godownId may be object or string
    if (item?.godownId) {
      return typeof item.godownId === "object"
        ? item.godownId._id
        : item.godownId;
    }

    // 3️⃣ shopId may be object or string
    if (item?.shopId) {
      return typeof item.shopId === "object" ? item.shopId._id : item.shopId;
    }

    return "";
  };

  useEffect(() => {
    if (!combinedLocations.length) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.locationObj) return it;

        const locId =
          typeof it.shopId === "object"
            ? it.shopId?._id
            : it.godownId || it.shopId;

        const matched = combinedLocations.find(
          (l) => String(l._id) === String(locId),
        );

        if (matched) {
          console.log("AUTO-FIXED LOCATION", matched.name);
          return { ...it, locationObj: matched };
        }

        return it;
      }),
    );
  }, [combinedLocations]);

  //  Qty validation block
  const validateQty = (row, index) => {
    if (!row.productId && !(row.productCode || "").trim()) return true;

    const qtyNum = Number(row.quantity || 0);
    if (qtyNum <= 0) {
      toast.error("Quantity is zero / empty");
      setTimeout(() => refs.current[`qty_${index}`]?.focus(), 0);
      return false;
    }
    return true;
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>
        Product Items
      </Typography>

      <TableContainer
        sx={{
          border: "1px solid #9e9e9e",
          borderRadius: 1,
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "45vh",

          "&::-webkit-scrollbar": { height: 8, width: 8 },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#aaa",
            borderRadius: 4,
          },
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            borderCollapse: "collapse",
            "& td, & th": {
              border: "1px solid #9e9e9e", //  classic grid border
            },
          }}
        >
          {/*  Header order + NO RATE column */}
          <TableHead>
            <TableRow>
              <TableCell sx={headCellStyle(60)}>S.No</TableCell>
              <TableCell sx={headCellStyle(170)}>Shop / Godown</TableCell>
              <TableCell sx={headCellStyle(160)}>Product Code</TableCell>
              <TableCell sx={headCellStyle(240)}>Product Name</TableCell>
              <TableCell sx={headCellStyle(80)}>Tier</TableCell>
              <TableCell sx={headCellStyle(160)}>Batch</TableCell>
              <TableCell sx={headCellStyle(120)}>Unit</TableCell>
              <TableCell sx={headCellStyle(90)}>
                Qty ({getText(items?.[0]?.soldUnit || "")})
              </TableCell>
              <TableCell sx={headCellStyle(140)}>Selling Price</TableCell>
              <TableCell sx={headCellStyle(150)}>Amount</TableCell>
              <TableCell sx={headCellStyle(80)}>CGST%</TableCell>
              <TableCell sx={headCellStyle(80)}>SGST%</TableCell>
              <TableCell sx={headCellStyle(100)}>HSN</TableCell>
              <TableCell sx={headCellStyle(70)}>Del</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, index) => {
              const locId = getLocId(item);

              //  IMPORTANT FIX: stable key for search/options (prevents overwrite between same product with different SKU)
              const key = item.rowKey || index;
              const isBaseOnly = !item.skuId && !item.isLoose;

              const baseAvailable = Boolean(item.productBaseUnit);

              const looseAvailable = ["kg", "l", "ltr"].includes(
                String(item.productBaseUnit || "").toLowerCase(),
              );

              const skuValues = (Array.isArray(item.skuList) ? item.skuList : [])
                .filter((s) => s && s._id && s.sellUnit)
                .map((s) => String(s._id));

              let safeUnitValue = item.isLoose
                ? "LOOSE"
                : item.skuId
                  ? String(item.skuId)
                  : "__BASE__";

              // if option not present, fallback to empty
              if (safeUnitValue === "__BASE__" && !baseAvailable) safeUnitValue = "";
              if (safeUnitValue === "LOOSE" && !looseAvailable) safeUnitValue = "";

              if (
                safeUnitValue &&
                safeUnitValue !== "__BASE__" &&
                safeUnitValue !== "LOOSE" &&
                !skuValues.includes(safeUnitValue)
              ) {
                safeUnitValue = "";
              }


              const noStock =
                item.isLoose || isBaseOnly
                  ? item.availableWeight === 0
                  : item.availablePacks === 0;

              const loadingStock =
                item.availableWeight === null || item.availablePacks === null;
              return (
                <TableRow
                  key={key}
                  sx={rowHighlight(index)}
                  onClick={() => setActiveRow(index)}
                >
                  {/*  S.No */}
                  <TableCell sx={bodyCellStyle(60)}>
                    <Typography fontWeight={900}>{index + 1}</Typography>
                  </TableCell>

                  {/*  Shop / Godown */}
                  <TableCell sx={bodyCellStyle(170)}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={locId || ""}
                        disabled={isSaved}
                        displayEmpty
                        sx={{
                          ...classicInputSx,
                          "& .MuiSelect-select": { padding: "6px 6px" },
                        }}


                        onChange={async (e) => {
                          if (isSaved) return;

                          const selectedLoc = combinedLocations.find(
                            (l) => String(l._id) === String(e.target.value),
                          );

                          const shopId =
                            selectedLoc?.type === "Shop"
                              ? selectedLoc._id
                              : selectedLoc?.shopId || "";

                          const godownId =
                            selectedLoc?.type === "Godown"
                              ? selectedLoc._id
                              : "";

                          // ✅ Update location + RESET stock first
                          setItems((prev) => {
                            const copy = [...prev];

                            copy[index] = {
                              ...copy[index],
                              shopId,
                              godownId,
                              locationObj: selectedLoc || null,

                              // reset stock before refetch
                              availablePacks: null,
                              availableWeight: null,
                            };

                            return copy;
                          });

                          // Fetch stock if product exists
                          if (!item.productId) return;

                          try {
                            const res = await customFetch.get(
                              "/inventory/stock/sales",
                              {
                                params: {
                                  productId: item.productId,
                                  shopId,
                                  godownId: godownId || null,
                                },
                              },
                            );

                            const packs = Number(res.data.availablePacks || 0);
                            const weight = Number(
                              res.data.availableWeight || 0,
                            );

                            // ✅ Save stock properly
                            setItems((prev) => {
                              const copy = [...prev];

                              copy[index] = {
                                ...copy[index],
                                availablePacks: packs,
                                availableWeight: weight,
                              };

                              return copy;
                            });
                          } catch (err) {
                            console.error(err);

                            // ❗ DO NOT FORCE ZERO
                            // just show toast
                            toast.error("Stock fetch failed");
                          }
                        }}
                        inputProps={{
                          ref: (el) => (refs.current[`shop_${index}`] = el),
                        }}
                        onKeyDown={(e) => handleEnterInField(e, "shop", index)}
                      >
                        <MenuItem value="">Select</MenuItem>
                        {combinedLocations.map((loc) => (
                          <MenuItem key={loc._id} value={loc._id}>
                            {getText(
                              loc.name || loc.shopName || loc.godownName,
                            )}{" "}
                            ({loc.type})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  {/*  Product Code (Autocomplete Search + Enter fetch) */}
                  <TableCell sx={bodyCellStyle(160)}>
                    <Autocomplete
                      size="small"
                      freeSolo
                      options={productSearchOptions[key] || []} //  FIXED
                      inputValue={item.productCode ?? ""}
                      value={
                        (productSearchOptions[key] || []).find(
                          (p) => String(p._id) === String(item.productId),
                        ) ||
                        products.find(
                          (p) => String(p._id) === String(item.productId),
                        ) ||
                        null
                      }
                      isOptionEqualToValue={(o, v) =>
                        String(o?._id) === String(v?._id)
                      }
                      getOptionLabel={(p) => {
                        if (typeof p === "string") return p;
                        return `${p.productCode} - ${p.name?.en || ""}`;
                      }}
                      onInputChange={(_, value, reason) => {
                        if (reason !== "input") return;
                        if (isSaved) return;

                        const val = value ?? "";

                        setItems((prev) => {
                          const copy = [...prev];
                          copy[index] = { ...copy[index], productCode: val };
                          return copy;
                        });

                        //  FIXED: store search text using stable key
                        setProductSearchText((prev) => ({
                          ...prev,
                          [key]: val,
                        }));
                      }}
                      onChange={(_, newValue) => {
                        if (isSaved) return;

                        if (typeof newValue === "string") {
                          const typed = newValue.trim();
                          if (typed) handleProductCodeChange(index, typed);
                          return;
                        }

                        if (newValue?.productCode) {
                          handleProductCodeChange(index, newValue.productCode);
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          sx={classicInputSx}
                          disabled={isSaved}
                          onFocus={() => setActiveRow(index)}
                          inputRef={(el) =>
                            (refs.current[`productCode_${index}`] = el)
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();

                            const typed = (item.productCode ?? "").trim();
                            if (!typed) return;

                            handleProductCodeChange(index, typed);

                            setTimeout(() => {
                              focusNextLogicalField({
                                refs,
                                currentKey: `productCode_${index}`,
                                items,
                                includeHandling,
                                includeTransport,
                              });
                            }, 0);
                          }}
                        />
                      )}
                    />
                  </TableCell>

                  {/*  Product Name */}
                  <TableCell sx={bodyCellStyle(240)}>
                    <Typography fontWeight={800} sx={{ px: 1 }}>
                      {getText(item.name) || "—"}
                    </Typography>
                  </TableCell>

                  {/*  Price Tier Select */}
                  <TableCell sx={bodyCellStyle(80)}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={item.priceTier || "R"}
                        disabled={isSaved || !item.productId}
                        displayEmpty
                        sx={classicInputSx}
                        onChange={(e) => {
                          if (isSaved) return;
                          handleItemChange(index, "priceTier", e.target.value);
                        }}
                      >
                        <MenuItem value="R">R</MenuItem>
                        <MenuItem value="W">W</MenuItem>
                        <MenuItem value="SW">SW</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>

                  {/*  Batch Select */}
                  <TableCell sx={bodyCellStyle(160)}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={item.inventoryId || ""}
                        disabled={isSaved || !item.productId}
                        displayEmpty
                        sx={classicInputSx}
                        onChange={(e) => {
                          if (isSaved) return;
                          handleItemChange(index, "inventoryId", e.target.value);
                        }}
                      >
                        <MenuItem value="">
                          <Typography variant="caption" color="text.secondary">
                            Auto / FIFO
                          </Typography>
                        </MenuItem>
                        {(item.batches || []).map((b) => (
                          <MenuItem key={b._id} value={b._id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="caption" fontWeight="bold">
                                {b.batchNo || "Unknown Batch"}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                                Stock: {Number(b.remainingWeight / 1000).toFixed(2)} KG
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  <TableCell sx={bodyCellStyle(120)}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={safeUnitValue}

                        disabled={isSaved}
                        displayEmpty
                        sx={{
                          ...classicInputSx,
                          "& .MuiSelect-select": { padding: "6px 6px" },
                        }}
                        inputProps={{
                          ref: (el) => (refs.current[`unit_${index}`] = el),
                        }}
                        onChange={(e) => {
                          if (isSaved) return;
                          handleItemChange(index, "unit", e.target.value);
                          handleItemChange(index, "quantity", "");

                          setTimeout(() => {
                            refs.current[`qty_${index}`]?.focus();
                          }, 150);
                        }}
                        onKeyDownCapture={(e) => {
                          // 🔹 SKU shortcuts (F3–F7)
                          handleSkuFunctionKey(e, index);

                          // 🔹 ENTER → jump to Qty (THIS IS THE KEY)
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.stopPropagation();

                            setTimeout(() => {
                              refs.current[`qty_${index}`]?.focus();
                            }, 120);
                          }
                        }}
                      >
                        <MenuItem value="">Select</MenuItem>

                        {!!item.productBaseUnit && (
                          <MenuItem value="__BASE__">
                            {getText(item.productBaseUnit)} (Base)
                          </MenuItem>
                        )}

                        {(Array.isArray(item.skuList) ? item.skuList : [])
                          .filter((sku) => sku && sku._id && sku.sellUnit)
                          .map((sku) => (
                            <MenuItem key={sku._id} value={sku._id}>
                              {getText(sku.sellUnit)} (
                              {Number(sku.baseQty) || 0})
                            </MenuItem>
                          ))}

                        {["kg", "l", "ltr"].includes(
                          String(item.productBaseUnit || "").toLowerCase(),
                        ) && (
                            <MenuItem value="LOOSE">
                              Loose (
                              {String(item.productBaseUnit).toLowerCase() === "kg"
                                ? "g"
                                : "ml"}
                              )
                            </MenuItem>
                          )}
                      </Select>
                    </FormControl>
                  </TableCell>


                  <TableCell sx={bodyCellStyle(90)}>
                    {loadingStock ? (
                      <Typography fontSize={12}>Loading...</Typography>
                    ) : noStock ? (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => onQuickPurchase(index)}
                      >
                        Purchase
                      </Button>
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        sx={classicInputSx}
                        value={
                          item.quantity === "" ||
                            item.quantity === null ||
                            item.quantity === undefined ||
                            Number.isNaN(Number(item.quantity))
                            ? ""
                            : Number(item.quantity)
                        }

                        onChange={(e) =>
                          handleItemChange(index, "quantity", e.target.value)
                        }
                        disabled={isSaved}
                        inputRef={(el) => (refs.current[`qty_${index}`] = el)}
                        helperText={
                          item.productId
                            ? (() => {
                              const type = String(
                                item.baseUnitType || "",
                              ).toUpperCase();

                              const packs = Number(item.availablePacks || 0);
                              const weight = Number(
                                item.availableWeight || 0,
                              );

                              if (type === "G") {
                                return `Available: ${(weight / 1000).toFixed(3)} KG (${packs.toFixed(3)} packs)`;
                              }

                              if (type === "ML") {
                                return `Available: ${(weight / 1000).toFixed(3)} LTR (${packs.toFixed(3)} packs)`;
                              }

                              if (type === "PCS") {
                                return `Available: ${Math.floor(weight)} PCS (${packs.toFixed(3)} packs)`;
                              }

                              return "";
                            })()
                            : ""
                        }
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          e.preventDefault();

                          const ok = validateQty(item, index);
                          if (!ok) return;

                          setTimeout(() => {
                            focusField(refs, `sellingPrice_${index}`);
                          }, 50);
                        }}
                      />
                    )}
                  </TableCell>

                  {/*  Selling Price */}
                  <TableCell sx={bodyCellStyle(140)}>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      sx={classicInputSx}
                      value={item.sellingPrice || ""}
                      onChange={(e) =>
                        handleItemChange(index, "sellingPrice", e.target.value)
                      }
                      inputRef={(el) =>
                        (refs.current[`sellingPrice_${index}`] = el)
                      }
                      onFocus={() => setActiveRow(index)}
                      disabled={isSaved}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();

                        const ok = validateQty(item, index);
                        if (!ok) return;

                        const isLastRow = index === items.length - 1;

                        if (isLastRow) {
                          handleAddRow();
                          setTimeout(() => {
                            focusField(refs, `productCode_${index + 1}`);
                          }, 150);
                        } else {
                          setTimeout(() => {
                            focusField(refs, `productCode_${index + 1}`);
                          }, 0);
                        }
                      }}
                    />
                  </TableCell>

                  {/*  Amount */}
                  <TableCell sx={bodyCellStyle(150)}>
                    <Typography sx={{ ...moneyCell, px: 1 }}>
                      ₹ {Number(item.total || 0).toFixed(2)}
                    </Typography>
                  </TableCell>

                  {/*  CGST */}
                  <TableCell sx={bodyCellStyle(80)}>
                    <Typography fontWeight={800}>
                      {Number(item.cgstPercentage || 0)}
                    </Typography>
                  </TableCell>

                  {/*  SGST */}
                  <TableCell sx={bodyCellStyle(80)}>
                    <Typography fontWeight={800}>
                      {Number(item.sgstPercentage || 0)}
                    </Typography>
                  </TableCell>

                  {/*  HSN (AT END) */}
                  <TableCell sx={bodyCellStyle(100)}>
                    <TextField
                      size="small"
                      fullWidth
                      sx={classicInputSx}
                      value={item.hsnCode || ""}
                      onChange={(e) =>
                        handleItemChange(index, "hsnCode", e.target.value)
                      }
                      disabled={isSaved}
                      placeholder="HSN"
                    />
                  </TableCell>

                  {/*  Delete */}
                  <TableCell sx={bodyCellStyle(70)}>
                    <Tooltip title="Delete Row">
                      <span>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteRow(index)}
                          disabled={isSaved}
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/*  Add Product Button */}
      <Box display="flex" justifyContent="center" mt={2}>
        <Button
          startIcon={<Add />}
          variant="outlined"
          onClick={() => {
            if (isSaved) return;
            handleAddRow();
            setTimeout(() => {
              focusField(refs, `productCode_${items.length}`);
            }, 100);
          }}
          disabled={isSaved}
        >
          Add Product
        </Button>
      </Box>
    </Box>
  );
}
