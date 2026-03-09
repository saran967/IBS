import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  MenuItem,
  IconButton,
} from "@mui/material";
import { AddCircle, Delete } from "@mui/icons-material";
import AssignedShopsSection from "./AssignedShopsSection";
import customFetch from "../../../utils/customFetch";

export default function SplitPackSection({ splitPacks, setSplitPacks }) {
  const [products, setProducts] = useState([]);

  //  Load products once
  useEffect(() => {
    (async () => {
      const res = await customFetch("/product");
      setProducts(res.data?.products || []);
    })();
  }, []);

  const handleAdd = () => {
    setSplitPacks([
      ...splitPacks,
      {
        subProductId: "",
        subProductName: { en: "" },
        quantity: "",
        weightPerPack: "",
        assignedShops: [],
      },
    ]);
  };

  const handleRemove = (index) => {
    const updated = [...splitPacks];
    updated.splice(index, 1);
    setSplitPacks(updated);
  };

  const handleChange = (index, name, value) => {
    const updated = [...splitPacks];

    if (name === "subProductId") {
      const selectedProduct = products.find((p) => p._id === value);
      updated[index].subProductId = value;
      updated[index].subProductName = {
        en: selectedProduct?.name?.en || selectedProduct?.name || "",
        ta: selectedProduct?.name?.ta || "",
      };
    } else {
      updated[index][name] = value;
    }

    setSplitPacks(updated);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight="bold">
          Split Packs
        </Typography>
        <Button
          onClick={handleAdd}
          startIcon={<AddCircle />}
          variant="outlined"
        >
          Add Split Pack
        </Button>
      </Box>

      {splitPacks.map((pack, i) => (
        <Box
          key={i}
          sx={{
            border: "1px solid #ccc",
            borderRadius: 2,
            p: 2,
            mt: 2,
            backgroundColor: "#fafafa",
          }}
        >
          <Grid container spacing={2}>
            {/*  Sub Product */}
            <Grid item xs={12} sm={3}>
              <TextField
                select
                label="Sub Product"
                value={pack.subProductId}
                onChange={(e) =>
                  handleChange(i, "subProductId", e.target.value)
                }
                fullWidth
              >
                {products.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.name?.en || p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/*  Quantity */}
            <Grid item xs={12} sm={2}>
              <TextField
                label="Quantity"
                type="number"
                value={pack.quantity}
                onChange={(e) => handleChange(i, "quantity", e.target.value)}
                fullWidth
              />
            </Grid>

            {/*  Weight / Pack */}
            <Grid item xs={12} sm={2}>
              <TextField
                label="Weight / Pack (kg)"
                type="number"
                value={pack.weightPerPack}
                onChange={(e) =>
                  handleChange(i, "weightPerPack", e.target.value)
                }
                fullWidth
              />
            </Grid>

            {/*  Assigned Shops */}
            <Grid item xs={12} sm={4}>
              <AssignedShopsSection
                shopsAssigned={pack.assignedShops}
                setShopsAssigned={(as) => {
                  const updated = [...splitPacks];
                  updated[i].assignedShops = as;
                  setSplitPacks(updated);
                }}
              />
            </Grid>

            {/*  Delete */}
            <Grid item xs={12} sm={1}>
              <IconButton color="error" onClick={() => handleRemove(i)}>
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
