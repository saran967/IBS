import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Paper, TextField, Typography, Button } from "@mui/material";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";

export default function CreateTokenFromSale() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pickupDate, setPickupDate] = useState("");

  const handleCreate = async () => {
    if (!pickupDate) return toast.error("Select pickup date");

    try {
      const res = await customFetch.post("/token/create", {
        saleId: id,
        pickupDate,
      });

      if (res.data.success) {
        toast.success("Token created!");
        navigate(-1);
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Failed to create token");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" mb={2}>
        Create Token
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 400 }}>
       <TextField
  fullWidth
  type="datetime-local"
  label="Pickup Date"
  value={pickupDate}
  onChange={(e) => setPickupDate(e.target.value)}
  InputLabelProps={{ shrink: true }}
  inputProps={{
    min: new Date().toISOString().slice(0, 16), // <-- ALLOW TODAY
  }}
  sx={{ mb: 3 }}
/>


        <Button variant="contained" fullWidth onClick={handleCreate}>
          Create Token
        </Button>
      </Paper>
    </Box>
  );
}
