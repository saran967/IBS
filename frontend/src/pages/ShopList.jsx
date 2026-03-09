import React, { useEffect, useState } from "react";
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
  Button,
  TextField,
  Box,
  Modal,
  Card,
  CardContent,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useLanguage } from "../context/LanguageContext";
import customFetch from "../utils/customFetch";
import GodownForm from "../components/Admin/GodownForm"; // adjust path if needed

const ShopList = () => {
  const lang = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Shops
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Shop create/edit form (inline)
  const [selectedShop, setSelectedShop] = useState(null);
  const [formData, setFormData] = useState({ name_en: "", name_ta: "" });

  const [search, setSearch] = useState("");

  // View details modal
  const [viewShop, setViewShop] = useState(null);

  // Godown related
  const [godownModalOpen, setGodownModalOpen] = useState(false); // modal that lists godowns for a shop
  const [activeShop, setActiveShop] = useState(null); // shop for which modal is open
  const [godownList, setGodownList] = useState([]);
  const [godownFormOpen, setGodownFormOpen] = useState(false); // open GodownForm
  const [editGodown, setEditGodown] = useState(null); // godown being edited
  const [loadingGodowns, setLoadingGodowns] = useState(false);

  useEffect(() => {
    fetchShops();
  }, [lang]);

  const getLocalizedText = (value, l = "en") => {
    if (!value) return "-";
    if (typeof value === "object") {
      if (l === "both") return `${value.en || "-"} / ${value.ta || "-"}`;
      return value[l] || value.en || value.ta || "-";
    }
    return value;
  };

  // ---------- Shops ----------
  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await customFetch.get(`/shops?lang=${lang}`);
      // your backend earlier returned res.data || []
      // keep safe: check res.data.shops or res.data
      const data = res?.data?.shops ?? res?.data ?? [];
      setShops(data);
    } catch (err) {
      console.error("fetchShops error", err);
      setShops([]);
      toast.error("Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    try {
      const payload = { name: { en: formData.name_en, ta: formData.name_ta } };

      if (selectedShop?._id) {
        await customFetch.patch(`/shops/${selectedShop._id}`, payload);
        toast.success("Shop updated successfully");
      } else {
        await customFetch.post(`/shops`, payload);
        toast.success("Shop added successfully");
      }

      setFormData({ name_en: "", name_ta: "" });
      setSelectedShop(null);
      fetchShops();
    } catch (err) {
      console.error("save shop error", err);
      toast.error(err?.response?.data?.message || "Error saving shop");
    }
  };

  const handleEdit = async (shop) => {
    try {
      const res = await customFetch.get(`/shops/${shop._id}`);
      const shopData = res?.data?.shop ?? res?.data ?? shop;
      setSelectedShop(shopData);
      setFormData({
        name_en: shopData?.name?.en || "",
        name_ta: shopData?.name?.ta || "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("handleEdit err", err);
      toast.error("Failed to load shop");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await customFetch.delete(`/shops/${id}`);
      toast.success("Shop deleted successfully");
      fetchShops();
    } catch (err) {
      console.error("delete shop error", err);
      toast.error("Failed to delete shop");
    }
  };

  const handleViewDetails = async (shop) => {
    try {
      const res = await customFetch.get(`/shops/${shop._id}`);
      const shopData = res?.data?.shop ?? res?.data ?? shop;
      setViewShop(shopData);
    } catch (err) {
      console.error("view shop error", err);
      toast.error("Failed to load shop details");
    }
  };

  const handleCloseDetails = () => setViewShop(null);

  // ---------- Godowns ----------
  const loadGodowns = async (shopId) => {
    setLoadingGodowns(true);
    try {
      const res = await customFetch.get(`/godowns/shop/${shopId}`);
      const godowns = res?.data?.godowns ?? res?.data ?? [];
      setGodownList(godowns);
    } catch (err) {
      console.error("loadGodowns err", err);
      setGodownList([]);
      toast.error("Failed to load godowns");
    } finally {
      setLoadingGodowns(false);
    }
  };

  const openGodownModal = (shop) => {
    setActiveShop(shop);
    loadGodowns(shop._id);
    setGodownModalOpen(true);
  };

  const closeGodownModal = () => {
    setActiveShop(null);
    setGodownList([]);
    setGodownModalOpen(false);
  };

  const handleDeleteGodown = async (id) => {
    if (!window.confirm("Delete this godown?")) return;
    try {
      await customFetch.delete(`/godowns/${id}`);
      toast.success("Godown deleted");
      // refresh list
      if (activeShop?._id) loadGodowns(activeShop._id);
    } catch (err) {
      console.error("delete godown err", err);
      toast.error("Failed to delete godown");
    }
  };

  const filteredShops = shops.filter((s) => {
    const nameEn = s.name?.en?.toLowerCase() || "";
    const nameTa = s.name?.ta?.toLowerCase() || "";
    const q = search.toLowerCase();
    return nameEn.includes(q) || nameTa.includes(q);
  });

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}>
        <CircularProgress />
      </div>
    );

  return (
    <Paper sx={{ margin: { xs: 1, sm: 3 }, padding: { xs: 1, sm: 2 } }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          fontWeight={700}
          sx={{ color: "primary.main" }}
        >
          Shop Management
        </Typography>
      </Box>

      {/* Form - create/edit shop */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          background: "linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)",
        }}
      >
        <Typography variant="h6" fontWeight={600} mb={2}>
          {selectedShop ? "Edit Shop Details" : "Register New Shop"}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Shop Name (English)"
              name="name_en"
              value={formData.name_en}
              onChange={handleChange}
              fullWidth
              size="medium"
              placeholder="Enter shop name in English"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Shop Name (Tamil)"
              name="name_ta"
              value={formData.name_ta}
              onChange={handleChange}
              fullWidth
              size="medium"
              placeholder="Enter shop name in Tamil"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "all 0.2s",
                "&:hover": { transform: "translateY(-1px)", boxShadow: "0 6px 16px rgba(0,0,0,0.15)" }
              }}
            >
              {selectedShop ? "Save Changes" : "Create Shop"}
            </Button>
            {selectedShop && (
              <Button
                variant="outlined"
                size="large"
                onClick={() => {
                  setSelectedShop(null);
                  setFormData({ name_en: "", name_ta: "" });
                }}
                sx={{ ml: 2, px: 4, py: 1.5, borderRadius: 2 }}
              >
                Cancel
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* SEARCH AND ACTIONS */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Registered Shops ({filteredShops.length})
        </Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            width: { xs: "100%", sm: 320 },
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "#fff",
            }
          }}
          InputProps={{
            startAdornment: (
              <Box component="span" sx={{ color: "text.secondary", mr: 1, display: "flex", alignItems: "center" }}>
                🔍
              </Box>
            ),
          }}
        />
      </Box>

      {/* LIST */}
      {filteredShops.length === 0 ? (
        <Typography align="center">No shops found</Typography>
      ) : isMobile ? (
        /* MOBILE CARD VIEW */
        <Box>
          {filteredShops.map((shop) => (
            <Card key={shop._id} sx={{ mb: 2, p: 1 }}>
              <CardContent sx={{ p: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {getLocalizedText(shop.name, lang)}
                </Typography>

                <Typography sx={{ fontSize: "0.85rem", mt: 1 }}>
                  Sub Admins: {shop.subAdmins?.length ?? 0}
                </Typography>

                <Typography sx={{ fontSize: "0.85rem" }}>
                  Employees: {shop.employees?.length ?? 0}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Box
                  display="flex"
                  gap={1}
                  justifyContent="flex-end"
                  flexWrap="wrap"
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedShop(shop);
                      setFormData({
                        name_en: shop.name?.en || "",
                        name_ta: shop.name?.ta || "",
                      });
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => handleDelete(shop._id)}
                  >
                    Delete
                  </Button>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => openGodownModal(shop)}
                  >
                    Manage Godowns
                  </Button>

                  <Button
                    variant="text"
                    size="small"
                    onClick={() => handleViewDetails(shop)}
                  >
                    Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        /* DESKTOP TABLE VIEW */
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#424242" }}>
              <TableCell sx={{ color: "#fff", fontWeight: 600 }}>
                Name
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: 600 }}>
                Sub Admins
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: 600 }}>
                Employees
              </TableCell>
              <TableCell sx={{ color: "#fff", fontWeight: 600 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredShops.map((shop) => (
              <TableRow key={shop._id} hover>
                <TableCell>{getLocalizedText(shop.name, lang)}</TableCell>
                <TableCell>{shop.subAdmins?.length ?? 0}</TableCell>
                <TableCell>{shop.employees?.length ?? 0}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleEdit(shop)}>
                    <Edit />
                  </IconButton>

                  {/* <IconButton onClick={() => handleDelete(shop._id)}>
                    <Delete />
                  </IconButton> */}

                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                    onClick={() => openGodownModal(shop)}
                  >
                    Godowns
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* DETAILS MODAL */}
      <Modal open={!!viewShop} onClose={handleCloseDetails}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: "80%", md: "60%" },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: { xs: 2, sm: 4 },
            borderRadius: 2,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          {viewShop && (
            <>
              <Typography variant="h6" mb={2}>
                Shop Details
              </Typography>

              <Typography>
                <b>Shop Name:</b> {getLocalizedText(viewShop.name, lang)}
              </Typography>

              <Typography sx={{ mt: 1 }}>
                <b>ID:</b> {viewShop._id}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1">Sub Admins</Typography>
              {(viewShop.subAdmins || []).map((sa) => (
                <Typography key={sa._id} sx={{ fontSize: "0.9rem" }}>
                  • {getLocalizedText(sa.name, lang)} — {sa.email}
                </Typography>
              ))}
              {(!viewShop.subAdmins || viewShop.subAdmins.length === 0) && (
                <Typography>No Sub Admins</Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1">Employees</Typography>
              {(viewShop.employees || []).map((e) => (
                <Typography key={e._1d} sx={{ fontSize: "0.9rem" }}>
                  • {getLocalizedText(e.name, lang)} — {e.email}
                </Typography>
              ))}
              {(!viewShop.employees || viewShop.employees.length === 0) && (
                <Typography>No Employees</Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
                onClick={handleCloseDetails}
              >
                Close
              </Button>
            </>
          )}
        </Box>
      </Modal>

      {/* GODOWN MANAGEMENT MODAL */}
      <Modal open={godownModalOpen} onClose={closeGodownModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: "80%", md: "60%" },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Godowns of{" "}
            {activeShop?.name?.en ?? getLocalizedText(activeShop?.name, lang)}
          </Typography>

          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                setEditGodown(null);
                setGodownFormOpen(true);
              }}
            >
              Add Godown
            </Button>

            <Button onClick={() => loadGodowns(activeShop._id)}>Refresh</Button>
          </Box>

          {loadingGodowns ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : godownList.length === 0 ? (
            <Typography>No godowns found for this shop.</Typography>
          ) : (
            godownList.map((g) => (
              <Paper key={g._id} sx={{ p: 2, mb: 1 }}>
                <Typography fontWeight={600}>
                  {getLocalizedText(g.name, lang)}
                </Typography>

                {g.location && <Typography>Location: {g.location}</Typography>}
                {g.description && <Typography>{g.description}</Typography>}

                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditGodown(g);
                      setGodownFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDeleteGodown(g._id)}
                  >
                    Delete
                  </Button>
                </Box>
              </Paper>
            ))
          )}

          <Box sx={{ mt: 2 }}>
            <Button fullWidth onClick={closeGodownModal}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* GODOWN FORM DIALOG */}
      <GodownForm
        open={godownFormOpen}
        onClose={() => {
          setGodownFormOpen(false);
          setEditGodown(null);
        }}
        shopId={activeShop?._id}
        godown={editGodown}
        refresh={() => activeShop && loadGodowns(activeShop._id)}
      />
    </Paper>
  );
};

export default ShopList;
