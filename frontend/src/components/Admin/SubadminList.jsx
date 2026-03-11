// import { useEffect, useState } from "react";
// import {
//   Paper,
//   Typography,
//   CircularProgress,
//   Table,
//   TableHead,
//   TableBody,
//   TableRow,
//   TableCell,
//   IconButton,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
//   Box,
//   InputAdornment,
// } from "@mui/material";
// import { Edit, Delete, Search } from "@mui/icons-material";
// import { toast } from "react-toastify";
// import customFetch from "../../utils/customFetch.js";
// import { useLanguage } from "../../context/LanguageContext.jsx";

// const SubAdminList = ({ currentUser }) => {
//   const lang = useLanguage();
//   const [subAdmins, setSubAdmins] = useState([]);
//   const [shops, setShops] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");

//   // Edit modal state
//   const [editOpen, setEditOpen] = useState(false);
//   const [selectedSubAdmin, setSelectedSubAdmin] = useState(null);
//   const [editForm, setEditForm] = useState({
//     name: "",
//     name_ta: "",
//     email: "",
//     shopId: "",
//   });

//   const role = currentUser.role;

//   // 🚫 Subadmins & employees cannot access this component
//   if (role !== "admin") {
//     return null;
//   }

//   // Multilingual helper
//   const getLocalizedText = (value) => {
//     if (!value) return "-";

//     if (lang === "both") {
//       if (typeof value === "object")
//         return `${value.en || "-"} / ${value.ta || "-"}`;

//       return `${value} / -`;
//     }

//     if (typeof value === "object")
//       return value[lang] || value.en || value.ta || "-";

//     return value;
//   };

//   //  Fetch all subadmins (ONLY admin is allowed)
//   const fetchSubAdmins = async () => {
//     setLoading(true);
//     try {
//       const res = await customFetch.get(`/users/subadmins?lang=${lang}`);
//       setSubAdmins(res.data.subAdmins || []);
//     } catch (err) {
//       console.error("Error fetching subadmins:", err);
//       setSubAdmins([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Fetch shops
//   const fetchShops = async () => {
//     try {
//       const res = await customFetch.get("/shops?lang=" + lang);
//       setShops(res.data || []);
//     } catch (err) {
//       console.error("Error fetching shops");
//     }
//   };

//   useEffect(() => {
//     fetchShops();
//     fetchSubAdmins();
//   }, [lang]);

//   // Search filter
//   const filteredSubAdmins = subAdmins.filter((sub) => {
//     if (!searchQuery) return true;

//     const q = searchQuery.toLowerCase();

//     if (sub.name?.en?.toLowerCase().includes(q)) return true;
//     if (sub.name?.ta?.toLowerCase().includes(q)) return true;
//     if (sub.email?.toLowerCase().includes(q)) return true;

//     return false;
//   });

//   // Open edit popup
//   const handleEditOpen = (sub) => {
//     setSelectedSubAdmin(sub);
//     setEditForm({
//       name: sub.name?.en || "",
//       name_ta: sub.name?.ta || "",
//       email: sub.email,
//       shopId: sub.shop?._id,
//     });
//     setEditOpen(true);
//   };

//   const handleEditChange = (e) => {
//     setEditForm({ ...editForm, [e.target.name]: e.target.value });
//   };

//   // Update subadmin
//   const handleUpdate = async () => {
//     try {
//       const res = await customFetch.put(
//         `/users/subadmin/${selectedSubAdmin._id}`,
//         {
//           name: editForm.name,
//           name_ta: editForm.name_ta,
//           email: editForm.email,
//           shopId: editForm.shopId,
//           role: "subadmin",
//         }
//       );
//       toast.success(res.data.message || "Updated successfully");
//       setEditOpen(false);
//       fetchSubAdmins();
//     } catch (err) {
//       toast.error("Error updating subadmin");
//     }
//   };

//   // Delete subadmin
//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this subadmin?")) return;

//     try {
//       const res = await customFetch.delete(`/users/subadmin/${id}`);
//       toast.success(res.data.message || "Deleted");
//       fetchSubAdmins();
//     } catch (err) {
//       toast.error("Error deleting");
//     }
//   };

//   // UI
//   if (loading)
//     return (
//       <Box sx={{ textAlign: "center", marginTop: 40 }}>
//         <CircularProgress />
//       </Box>
//     );

//   if (filteredSubAdmins.length === 0)
//     return (
//       <Typography align="center" mt={5} variant="h6">
//         No SubAdmins Found
//       </Typography>
//     );

//   return (
//     <Paper sx={{ margin: 3, padding: 2 }}>
//       <Typography variant="h5" mb={2}>
//         SubAdmins ({lang.toUpperCase()})
//       </Typography>

//       {/* Search box */}
//       <Box mb={2}>
//         <TextField
//           fullWidth
//           placeholder="Search by name or email..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <Search />
//               </InputAdornment>
//             ),
//           }}
//         />
//       </Box>

//       {/* Table */}
//       <Table>
//         <TableHead>
//           <TableRow sx={{ backgroundColor: "#424242" }}>
//             <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
//               Name
//             </TableCell>
//             <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
//               Email
//             </TableCell>
//             <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
//               Shop
//             </TableCell>
//             <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
//               Actions
//             </TableCell>
//           </TableRow>
//         </TableHead>

//         <TableBody>
//           {filteredSubAdmins.map((sub) => (
//             <TableRow key={sub._id}>
//               <TableCell>{getLocalizedText(sub.name)}</TableCell>
//               <TableCell>{sub.email}</TableCell>
//               <TableCell>{getLocalizedText(sub.shop?.name)}</TableCell>

//               <TableCell>
//                 <IconButton onClick={() => handleEditOpen(sub)}>
//                   <Edit />
//                 </IconButton>
//                 <IconButton onClick={() => handleDelete(sub._id)}>
//                   <Delete />
//                 </IconButton>
//               </TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>

//       {/* Edit Modal */}
//       <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
//         <DialogTitle>Edit SubAdmin</DialogTitle>

//         <DialogContent>
//           <TextField
//             label="Name (EN)"
//             name="name"
//             value={editForm.name}
//             fullWidth
//             margin="normal"
//             onChange={handleEditChange}
//           />
//           <TextField
//             label="Name (TA)"
//             name="name_ta"
//             value={editForm.name_ta}
//             fullWidth
//             margin="normal"
//             onChange={handleEditChange}
//           />

//           <TextField
//             label="Email"
//             name="email"
//             value={editForm.email}
//             fullWidth
//             margin="normal"
//             onChange={handleEditChange}
//           />

//           {/* Shop dropdown */}
//           <FormControl fullWidth margin="normal">
//             <InputLabel>Shop</InputLabel>
//             <Select
//               name="shopId"
//               value={editForm.shopId}
//               label="Shop"
//               onChange={handleEditChange}
//             >
//               {shops.map((shop) => (
//                 <MenuItem key={shop._id} value={shop._id}>
//                   {getLocalizedText(shop.name)}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         </DialogContent>

//         <DialogActions>
//           <Button onClick={() => setEditOpen(false)}>Cancel</Button>
//           <Button variant="contained" onClick={handleUpdate}>
//             Update
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Paper>
//   );
// };

// export default SubAdminList;

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  InputAdornment,
  useMediaQuery,
  Stack,
  Divider,
} from "@mui/material";
import { Edit, Delete, Search } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch.js";
import { useLanguage } from "../../context/LanguageContext.jsx";

const SubAdminList = ({ currentUser, refreshKey = 0 }) => {
  const lang = useLanguage();
  const [subAdmins, setSubAdmins] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    name_ta: "",
    email: "",
    shopId: "",
  });

  const role = currentUser.role;

  // Responsive
  const isMobile = useMediaQuery("(max-width:600px)");

  // 🚫 Subadmins & employees cannot access this component
  if (role !== "admin") {
    return null;
  }

  // Multilingual helper
  const getLocalizedText = (value) => {
    if (!value) return "-";

    if (lang === "both") {
      if (typeof value === "object")
        return `${value.en || "-"} / ${value.ta || "-"}`;

      return `${value} / -`;
    }

    if (typeof value === "object")
      return value[lang] || value.en || value.ta || "-";

    return value;
  };

  //  Fetch all subadmins (ONLY admin is allowed)
  const fetchSubAdmins = async () => {
    setLoading(true);
    try {
      const res = await customFetch.get(`/users/subadmins?lang=${lang}`);
      setSubAdmins(res.data.subAdmins || []);
    } catch (err) {
      console.error("Error fetching subadmins:", err);
      setSubAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch shops
  const fetchShops = async () => {
    try {
      const res = await customFetch.get("/shops?lang=" + lang);
      setShops(res.data || res?.data?.shops || []);
    } catch (err) {
      console.error("Error fetching shops");
    }
  };

  useEffect(() => {
    fetchShops();
    fetchSubAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, refreshKey]);

  // Search filter
  const filteredSubAdmins = subAdmins.filter((sub) => {
    if (!searchQuery) return true;

    const q = searchQuery.toLowerCase();

    if (sub.name?.en?.toLowerCase().includes(q)) return true;
    if (sub.name?.ta?.toLowerCase().includes(q)) return true;
    if (sub.email?.toLowerCase().includes(q)) return true;

    return false;
  });

  // Open edit popup
  const handleEditOpen = (sub) => {
    setSelectedSubAdmin(sub);
    setEditForm({
      name: sub.name?.en || "",
      name_ta: sub.name?.ta || "",
      email: sub.email,
      shopId: sub.shop?._id || "",
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Update subadmin
  const handleUpdate = async () => {
    if (!selectedSubAdmin) return;

    try {
      const res = await customFetch.put(
        `/users/subadmin/${selectedSubAdmin._id}`,
        {
          name: editForm.name,
          name_ta: editForm.name_ta,
          email: editForm.email,
          shopId: editForm.shopId,
          role: "subadmin",
        },
      );
      toast.success(res.data.message || "Updated successfully");
      setEditOpen(false);
      fetchSubAdmins();
    } catch (err) {
      console.error(err);
      toast.error("Error updating subadmin");
    }
  };

  // Delete subadmin
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subadmin?")) return;

    try {
      const res = await customFetch.delete(`/users/subadmin/${id}`);
      toast.success(res.data.message || "Deleted");
      fetchSubAdmins();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting");
    }
  };

  // UI states
  if (loading)
    return (
      <Box sx={{ textAlign: "center", marginTop: isMobile ? 6 : 10 }}>
        <CircularProgress />
      </Box>
    );

  if (!subAdmins || subAdmins.length === 0)
    return (
      <Typography align="center" mt={5} variant="h6">
        No SubAdmins Found
      </Typography>
    );

  return (
    <Paper sx={{ margin: { xs: 1, sm: 3 }, padding: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        alignItems={isMobile ? "stretch" : "center"}
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant={isMobile ? "h6" : "h5"}>
          SubAdmins ({lang.toUpperCase()})
        </Typography>

        {/* Search box */}
        <TextField
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size={isMobile ? "small" : "medium"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: isMobile ? "100%" : 360 }}
        />
      </Stack>

      {/* Desktop/Tablet: Table with horizontal scroll if needed */}
      {!isMobile ? (
        <Box sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#424242" }}>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Name
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Email
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Shop
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredSubAdmins.map((sub) => (
                <TableRow key={sub._id}>
                  <TableCell>{getLocalizedText(sub.name)}</TableCell>
                  <TableCell>{sub.email}</TableCell>
                  <TableCell>{getLocalizedText(sub.shop?.name)}</TableCell>

                  <TableCell>
                    <IconButton
                      onClick={() => handleEditOpen(sub)}
                      size="large"
                      aria-label={`edit-${sub._id}`}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(sub._id)}
                      size="large"
                      aria-label={`delete-${sub._id}`}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        /* Mobile: Card list */
        <Stack spacing={2}>
          {filteredSubAdmins.map((sub) => (
            <Paper
              key={sub._id}
              elevation={1}
              sx={{ p: 2, borderRadius: 2 }}
              aria-label={`subadmin-card-${sub._id}`}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {getLocalizedText(sub.name)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {sub.email}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mt: 0.5, color: "text.secondary" }}
                  >
                    Shop: {getLocalizedText(sub.shop?.name)}
                  </Typography>
                </Box>

                <Box display="flex" flexDirection="column" gap={1}>
                  <IconButton
                    onClick={() => handleEditOpen(sub)}
                    size="small"
                    aria-label={`edit-${sub._id}`}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(sub._id)}
                    size="small"
                    aria-label={`delete-${sub._id}`}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Edit Dialog (fullScreen on mobile) */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>Edit SubAdmin</DialogTitle>

        <DialogContent>
          <Box sx={{ width: "100%", maxWidth: 600, mt: 1 }}>
            <TextField
              label="Name (EN)"
              name="name"
              value={editForm.name}
              fullWidth
              margin="normal"
              onChange={handleEditChange}
            />
            <TextField
              label="Name (TA)"
              name="name_ta"
              value={editForm.name_ta}
              fullWidth
              margin="normal"
              onChange={handleEditChange}
            />

            <TextField
              label="Email"
              name="email"
              value={editForm.email}
              fullWidth
              margin="normal"
              onChange={handleEditChange}
            />

            {/* Shop dropdown */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Shop</InputLabel>
              <Select
                name="shopId"
                value={editForm.shopId}
                label="Shop"
                onChange={handleEditChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {shops.map((shop) => (
                  <MenuItem key={shop._id} value={shop._id}>
                    {getLocalizedText(shop.name)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: isMobile ? 3 : 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default SubAdminList;
