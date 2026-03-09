import React from "react";
import { Box, Button } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

export default function SalesActionsBar({
  // navigation
  salesList,
  currentSaleIndex,
  handlePrevSale,
  handleNextSale,
  handleRestoreCurrent,
  tempCurrentSale,

  // actions
  handleClearForm,
  handleSubmit,
  submitting,
  isSaved,
  refs,
}) {
  const handleEditCurrentSale = () => {
    if (!savedSaleId) return toast.info("No sale selected");
    setEditSaleId(savedSaleId);
    setSavedSaleId(null); // unlock
    toast.success("Edit mode enabled");
  };

  return (
    <Box
      mt={3}
      display="flex"
      flexDirection={{ xs: "column", md: "row" }}
      gap={2}
    >
      {/* LEFT - Prev/Current/Next */}
      <Box
        display="flex"
        flexWrap="wrap"
        gap={1}
        justifyContent={{ xs: "space-between", md: "flex-start" }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handlePrevSale}
          disabled={!salesList || salesList.length === 0}
          sx={{ minWidth: 110 }}
        >
          Prev
        </Button>

        <Button
          variant="contained"
          color="success"
          onClick={handleRestoreCurrent}
          disabled={!tempCurrentSale}
          sx={{ minWidth: 110 }}
        >
          Current
        </Button>

        <Button
          variant="outlined"
          startIcon={<ArrowForward />}
          onClick={handleNextSale}
          disabled={
            !salesList ||
            salesList.length === 0 ||
            currentSaleIndex >= salesList.length - 1
          }
          sx={{ minWidth: 110 }}
        >
          Next
        </Button>
      </Box>

      {/* RIGHT - Clear + Save */}
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        gap={2}
        justifyContent="flex-end"
        flex={1}
      >
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleClearForm}
          fullWidth
          sx={{ minWidth: 200 }}
        >
          Clear Form (Ctrl + E)
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || isSaved}
          fullWidth
          sx={{ minWidth: 200 }}
          ref={(el) => (refs.current["saveBtn"] = el)}
        >
          {submitting ? "Saving..." : "Save Sale"}
        </Button>
      </Box>
    </Box>
  );
}
