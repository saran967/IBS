import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { toast } from "react-toastify";
import customFetch from "../utils/customFetch";
import { SIDEBAR_MODULES } from "../config/sidebarModules";
import { useLocation } from "react-router-dom";

const PermissionManagement = ({ onDataUpdated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [allowedModules, setAllowedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const location = useLocation();
  const moduleFieldRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Load all users
  const loadUsers = async () => {
    try {
      const res = await customFetch.get("/users");
      const payload = res.data;
      const userList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.users)
          ? payload.users
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
      setUsers(userList);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Apply user selection when editing (via URL param)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userFromURL = params.get("userId");
    if (userFromURL) {
      setSelectedUser(userFromURL);
      setTimeout(() => {
        moduleFieldRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [location.search]);

  // Load selected user's permissions
  useEffect(() => {
    if (!selectedUser) {
      setAllowedModules([]);
      return;
    }

    const user = users.find((u) => String(u._id) === String(selectedUser));
    setAllowedModules(user?.permissions || []);
  }, [selectedUser, users]);

  // Save Permissions
  const handleSave = async () => {
    if (!selectedUser) return toast.error("Please select a user first");

    setSaving(true);
    try {
      await customFetch.put("/permissions/update", {
        userId: selectedUser,
        moduleIds: allowedModules,
      });

      toast.success("Permissions updated successfully");

      await loadUsers();

      //  Notify parent to refresh table
      onDataUpdated && onDataUpdated();

      setSelectedUser("");
      setAllowedModules([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Paper
      sx={{
        m: { xs: 1, sm: 2, md: 3 },
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: 3,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <Typography
        variant={isMobile ? "h6" : "h5"}
        fontWeight={600}
        mb={3}
        textAlign={{ xs: "center", sm: "left" }}
      >
        Sidebar Access Control
      </Typography>

      {/* User Selection */}
      <Box mb={3}>
        <Typography
          variant={isMobile ? "body2" : "subtitle1"}
          mb={1}
          fontWeight={500}
        >
          Select User:
        </Typography>
        <Select
          displayEmpty
          fullWidth
          size={isMobile ? "small" : "medium"}
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          renderValue={(value) => {
            if (!value) return "Select Employee";
            const selected = users.find((u) => String(u._id) === String(value));
            return selected
              ? `${selected.name?.en || selected.name || selected.email} (${selected.role || "user"})`
              : "Select Employee";
          }}
          sx={{
            "& .MuiSelect-select": {
              py: isMobile ? 1 : 1.5,
            },
          }}
        >
          <MenuItem value="">Select Employee</MenuItem>
          {users.map((u) => (
            <MenuItem key={u._id} value={u._id}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="body2">{u.name?.en || u.email}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.role}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* Module Access */}
      <Typography
        variant={isMobile ? "body2" : "subtitle1"}
        mb={1}
        fontWeight={500}
      >
        Allowed Sidebar Modules:
      </Typography>
      <FormControl fullWidth ref={moduleFieldRef}>
        <Select
          multiple
          size={isMobile ? "small" : "medium"}
          value={allowedModules}
          onChange={(e) => setAllowedModules(e.target.value)}
          renderValue={(selected) => (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                maxHeight: isMobile ? 80 : 100,
                overflowY: "auto",
              }}
            >
              {selected.map((id) => {
                const mod = SIDEBAR_MODULES.find((m) => m.id === id);
                return (
                  <Chip
                    key={id}
                    label={mod?.label || id}
                    size={isMobile ? "small" : "medium"}
                    sx={{ fontSize: isMobile ? "0.75rem" : "0.8125rem" }}
                  />
                );
              })}
            </Box>
          )}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: isMobile ? 300 : 400,
                width: isMobile ? "90vw" : "auto",
              },
            },
          }}
        >
          {SIDEBAR_MODULES.map((mod) => (
            <MenuItem key={mod.id} value={mod.id}>
              <Typography variant={isMobile ? "body2" : "body1"}>
                {mod.label}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        sx={{
          mt: 3,
          py: isMobile ? 1 : 1.5,
          width: { xs: "100%", sm: "auto" },
        }}
        onClick={handleSave}
        disabled={!selectedUser || saving}
        size={isMobile ? "medium" : "large"}
      >
        {saving ? "Saving..." : "Save Permissions"}
      </Button>
    </Paper>
  );
};

export default PermissionManagement;
