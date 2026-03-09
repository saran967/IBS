import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  IconButton,
} from "@mui/material";
import { AddCircle, Delete } from "@mui/icons-material";
import customFetch from "../../../utils/customFetch";

export default function AssignedShopsSection({
  shopsAssigned,
  setShopsAssigned,
}) {
  const [shops, setShops] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await customFetch("/shops");
      console.log(res.data);

      setShops(res.data);
    })();
  }, []);

  const handleAdd = () => {
    setShopsAssigned([...shopsAssigned, { shopId: "", quantityAssigned: "" }]);
  };

  const handleRemove = (index) => {
    const updated = [...shopsAssigned];
    updated.splice(index, 1);
    setShopsAssigned(updated);
  };

  const handleChange = (index, name, value) => {
    const updated = [...shopsAssigned];
    updated[index][name] = value;
    setShopsAssigned(updated);
  };

  return (
    <Box>
      <Button size="small" startIcon={<AddCircle />} onClick={handleAdd}>
        Assign Shop
      </Button>

      {shopsAssigned.map((as, i) => (
        <Grid container spacing={1} key={i} alignItems="center" mt={1}>
          <Grid item xs={6}>
            <TextField
              select
              label="Shop"
              value={as.shopId}
              onChange={(e) => handleChange(i, "shopId", e.target.value)}
              sx={{ width: 200 }}
            >
              {shops.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.shopName?.en || s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Qty"
              type="number"
              value={as.quantityAssigned}
              onChange={(e) =>
                handleChange(i, "quantityAssigned", e.target.value)
              }
              fullWidth
            />
          </Grid>
          <Grid item xs={2}>
            <IconButton color="error" onClick={() => handleRemove(i)}>
              <Delete />
            </IconButton>
          </Grid>
        </Grid>
      ))}
    </Box>
  );
}
