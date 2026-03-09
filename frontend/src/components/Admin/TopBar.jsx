import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Avatar,
  Box,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { MdNotifications, MdPerson, MdMenu } from "react-icons/md";
import customFetch from "../../utils/customFetch";
import { drawerWidth, collapsedWidth } from "./Sidebar";
import NotificationDropdown from "./NotificationDropdown";

//  ADD THIS IMPORT
import LanguageSwitcher from "../LanguageSwitcher";

const Topbar = ({ open, setOpen }) => {
  const isMobile = useMediaQuery("(max-width:900px)");

  const [user, setUser] = useState(null);

  const [notifications, setNotifications] = useState({
    count: 0,
    orders: [],
    tokens: [],
    stockTransfers: [],
  });

  const [anchorEl, setAnchorEl] = useState(null);

  /* ---------------- FETCH CURRENT USER ---------------- */
  const fetchCurrentUser = async () => {
    try {
      const res = await customFetch.get("/auth/current-user");
      setUser(res.data.user);
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  };

  /* ---------------- FETCH NOTIFICATIONS (ADMIN ONLY) ---------------- */
  const fetchNotifications = async () => {
    try {
      const res = await customFetch.get("/notifications");
      if (res.data?.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Notification fetch failed", err);
    }
  };

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, [user]);

  /* ---------------- HANDLERS ---------------- */
  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  /* ---------------- UI ---------------- */
  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: "#F8FAFF",
          color: "#0B1736",
          borderBottom: "1px solid #E3E8F7",

          ...(isMobile
            ? { width: "100%", ml: 0 }
            : {
                ml: open ? `${drawerWidth}px` : `${collapsedWidth}px`,
                width: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
              }),

          transition: "all 0.3s ease",
          zIndex: 1201,
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            px: { xs: 1.5, md: 3 },
          }}
        >
          {/*  LEFT SIDE */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* ---------- Mobile Hamburger ---------- */}
            {isMobile && (
              <IconButton
                onClick={() => setOpen(true)}
                sx={{ color: "#0B1736" }}
              >
                <MdMenu size={26} />
              </IconButton>
            )}

            {/*  Language Switcher LEFT SIDE */}
            <Box sx={{ minWidth: 170 }}>
              <LanguageSwitcher />
            </Box>
          </Box>

          {/*  RIGHT SIDE */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* 🔔 Notifications (ADMIN ONLY) */}
            {user?.role === "admin" && (
              <IconButton onClick={handleOpen}>
                <Badge badgeContent={notifications.count} color="error">
                  <MdNotifications size={24} />
                </Badge>
              </IconButton>
            )}

            {/* Avatar */}
            <Avatar sx={{ bgcolor: "#1976D2", textTransform: "uppercase" }}>
              {String(
                user?.name?.en || user?.name?.ta || user?.name || "",
              ).charAt(0) || <MdPerson />}
            </Avatar>

            {/* Name / Role */}
            {!isMobile && (
              <Typography fontWeight={600}>
                {user?.name?.en || user?.name?.ta || user?.name || "User"}(
                {user?.role || "—"})
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* ---------- Notification Dropdown (ADMIN ONLY) ---------- */}
      {user?.role === "admin" && (
        <NotificationDropdown
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          notifications={notifications}
          onActionDone={fetchNotifications}
        />
      )}
    </>
  );
};

export default Topbar;
