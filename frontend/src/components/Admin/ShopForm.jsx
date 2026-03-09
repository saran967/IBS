import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import customFetch from "../../utils/customFetch";
import { toast } from "react-toastify";

const ShopForm = ({ open, onClose, refreshList, shop }) => {
  const [formData, setFormData] = useState({
    name_en: "",
    name_ta: "",
  });

  //* Update form data whenever `shop` changes or dialog opens
  useEffect(() => {
    if (open && shop) {
      setFormData({
        name_en: shop?.name?.en || "",
        name_ta: shop?.name?.ta || "",
      });
    } else if (open && !shop) {
      setFormData({ name_en: "", name_ta: "" });
    }
  }, [shop, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: { en: formData.name_en, ta: formData.name_ta },
      };

      if (shop?._id) {
        await customFetch.patch(`/shops/${shop._id}`, payload);
        toast.success("Shop updated successfully");
      } else {
        await customFetch.post(`/shops`, payload);
        toast.success("Shop added successfully");
      }

      refreshList();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving shop");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{shop ? "Edit Shop" : "Add Shop"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Shop Name (EN)"
          name="name_en"
          value={formData.name_en}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Shop Name (TA)"
          name="name_ta"
          value={formData.name_ta}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {shop ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShopForm;
