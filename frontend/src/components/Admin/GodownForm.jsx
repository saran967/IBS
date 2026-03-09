import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import customFetch from "../../utils/customFetch.js";
import { toast } from "react-toastify";

/**
 * GodownForm
 * Props:
 * - open: boolean
 * - onClose: fn
 * - shopId: string (required when creating)
 * - godown: object (when editing)
 * - refresh: fn to call after successful save (create/update)
 */
const GodownForm = ({ open, onClose, shopId, godown, refresh }) => {
  const [form, setForm] = useState({
    name_en: "",
    name_ta: "",
    location: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && godown) {
      setForm({
        name_en: godown?.name?.en || "",
        name_ta: godown?.name?.ta || "",
        location: godown?.location || "",
        description: godown?.description || "",
      });
    } else if (open) {
      setForm({ name_en: "", name_ta: "", location: "", description: "" });
    }
  }, [open, godown]);

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name_en.trim()) {
      return toast.warn("Please enter Godown name (EN)");
    }
    setSaving(true);
    try {
      const payload = {
        name: { en: form.name_en, ta: form.name_ta },
        location: form.location,
        description: form.description,
        shopId,
      };

      if (godown?._id) {
        await customFetch.patch(`/godowns/${godown._id}`, payload);
        toast.success("Godown updated");
      } else {
        await customFetch.post("/godowns", payload);
        toast.success("Godown created");
      }

      refresh && refresh();
      onClose && onClose();
    } catch (err) {
      console.error("Save godown error:", err);
      toast.error(err?.response?.data?.message || "Failed to save godown");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{godown ? "Edit Godown" : "Add Godown"}</DialogTitle>

      <DialogContent>
        <TextField
          label="Godown Name (EN)"
          name="name_en"
          fullWidth
          margin="normal"
          value={form.name_en}
          onChange={handleChange}
        />
        <TextField
          label="Godown Name (TA)"
          name="name_ta"
          fullWidth
          margin="normal"
          value={form.name_ta}
          onChange={handleChange}
        />
        <TextField
          label="Location"
          name="location"
          fullWidth
          margin="normal"
          value={form.location}
          onChange={handleChange}
        />
        <TextField
          label="Description"
          name="description"
          fullWidth
          margin="normal"
          value={form.description}
          onChange={handleChange}
          multiline
          minRows={2}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {godown ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GodownForm;