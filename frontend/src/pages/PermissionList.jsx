import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Box,
  Tooltip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Paper,
} from "@mui/material";
import { Edit as EditIcon, Search as SearchIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import customFetch from "../utils/customFetch";

const PermissionList = ({ refreshKey }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // 🔹 Load users (excluding admin/superadmin)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await customFetch.get("/users");
        const filtered = (res.data || []).filter(
          (u) =>
            !["admin", "superadmin", "super admin"].includes(
              u.role?.toLowerCase(),
            ),
        );
        setUsers(filtered);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };
    load();
  }, [refreshKey]); //  refresh on updates

  // 🔍 Filter by User name or Role
  const filteredUsers = users.filter((u) => {
    const userName = (u.name?.en || u.email || "").toLowerCase();
    const roleName = (u.role || "").toLowerCase();
    const keyword = search.toLowerCase();
    return userName.includes(keyword) || roleName.includes(keyword);
  });

  // Mobile card view for each user
  const renderMobileCard = (user) => (
    <Paper
      key={user._id}
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {user.name?.en || user.email}
        </Typography>
        <Tooltip title="Edit Permissions">
          <IconButton
            color="primary"
            onClick={() => navigate(`/en/admin/permissions?userId=${user._id}`)}
            size="small"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box mb={1}>
        <Typography variant="body2" color="text.secondary">
          Role:
        </Typography>
        <Typography variant="body1">{user.role}</Typography>
      </Box>

      <Box>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Assigned Modules:
        </Typography>
        {user.permissions?.length ? (
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {user.permissions.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                sx={{ background: "#e0e0e0", fontSize: "0.75rem" }}
              />
            ))}
          </Box>
        ) : (
          <Chip label="No Access" size="small" color="default" />
        )}
      </Box>
    </Paper>
  );

  return (
    <Card
      sx={{
        m: { xs: 1, sm: 2, md: 3 },
        p: { xs: 1, sm: 1.5, md: 2 },
        borderRadius: 3,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <CardContent>
        <Typography
          variant={isMobile ? "h6" : "h5"}
          fontWeight={600}
          mb={3}
          sx={{
            color: "#333",
            textAlign: { xs: "center", sm: "left" },
          }}
        >
          User Permission Overview
        </Typography>

        {/* 🔍 Search Box */}
        <Box mb={3}>
          <TextField
            fullWidth
            size={isMobile ? "small" : "medium"}
            variant="outlined"
            label="Search by User or Role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "gray" }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* 📋 Table Section for Desktop */}
        {!isMobile ? (
          <Table>
            <TableHead sx={{ backgroundColor: "#424242" }}>
              <TableRow>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  User
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Role
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Assigned Modules
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ color: "#fff", fontWeight: "bold" }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <TableRow
                    key={u._id}
                    hover
                    sx={{
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <TableCell>{u.name?.en || u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      {u.permissions?.length ? (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {u.permissions.map((p) => (
                            <Chip
                              key={p}
                              label={p}
                              size="small"
                              sx={{ background: "#e0e0e0" }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Chip label="No Access" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit Permissions">
                        <IconButton
                          color="primary"
                          onClick={() =>
                            navigate(`/en/admin/permissions?userId=${u._id}`)
                          }
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">
                      No matching users found (Admins are hidden)
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          /* 📱 Mobile Card View */
          <Box>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(renderMobileCard)
            ) : (
              <Box textAlign="center" py={3}>
                <Typography color="text.secondary">
                  No matching users found (Admins are hidden)
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PermissionList;
