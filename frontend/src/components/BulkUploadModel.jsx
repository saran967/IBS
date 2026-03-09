import React, { useState } from "react";
import {
  Box,
  Button,
  Modal,
  Typography,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../utils/customFetch.js";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 450,
  bgcolor: "background.paper",
  borderRadius: "8px",
  boxShadow: 24,
  p: 3,
};

export default function BulkUploadModal({ open, onClose, refreshList }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file");

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await customFetch.post("/product/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        `Uploaded: ${res.data.successCount}, Failed: ${res.data.failedCount}`
      );

      if (res.data.failedCount > 0) {
        console.log("Failed Rows:", res.data.failed);
      }

      setFile(null);
      onClose();
      refreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" mb={2}>
          Bulk Upload Products (XLS/XLSX)
        </Typography>

        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />

        <Box mt={3} display="flex" justifyContent="right" gap={2}>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? <CircularProgress size={22} /> : "Upload"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
