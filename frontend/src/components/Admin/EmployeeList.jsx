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
  Box,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { toast } from "react-toastify";
import customFetch from "../../utils/customFetch";
import { useLanguage } from "../../context/LanguageContext";

const EmployeeList = () => {
  const lang = useLanguage();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Current logged user
  const [currentUser, setCurrentUser] = useState(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    name_ta: "",
    email: "",
  });

  // Responsive
  const isMobile = useMediaQuery("(max-width:600px)");

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

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const res = await customFetch.get("/auth/current-user");
      setCurrentUser(res.data.user);
    } catch (err) {
      console.error("Error fetching current user", err);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await customFetch.get(`/users/employees`);
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchEmployees();
    // if your API depends on language, add it to the endpoint or dependency list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Handle edit modal open – ONLY ADMIN CAN USE THIS
  const handleEditOpen = (employee) => {
    if (currentUser?.role !== "admin") return;

    setSelectedEmployee(employee);
    setEditForm({
      name: employee.name?.en || "",
      name_ta: employee.name?.ta || "",
      email: employee.email || "",
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  // Update employee – ONLY ADMIN
  const handleUpdate = async () => {
    if (currentUser?.role !== "admin") return;
    if (!selectedEmployee) return;

    try {
      const res = await customFetch.put(
        `/users/employee/${selectedEmployee._id}`,
        {
          name: editForm.name,
          name_ta: editForm.name_ta,
          email: editForm.email,
          role: "user",
        },
      );
      toast.success(res.data.message || "Employee updated successfully");
      setEditOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating employee");
    }
  };

  // Delete employee – ONLY ADMIN
  const handleDelete = async (id) => {
    if (currentUser?.role !== "admin") return;

    if (!window.confirm("Are you sure you want to delete this employee?"))
      return;

    try {
      const res = await customFetch.delete(`/users/employee/${id}`);
      toast.success(res.data.message || "Employee deleted successfully");
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting employee");
    }
  };

  if (loading || !currentUser)
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}>
        <CircularProgress />
      </div>
    );

  if (!employees || employees.length === 0)
    return (
      <Typography variant="h6" align="center" mt={5}>
        No Employees Found
      </Typography>
    );

  const isAdmin = currentUser.role === "admin";

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameEn = emp.name?.en?.toLowerCase() || "";
    const nameTa = emp.name?.ta?.toLowerCase() || "";
    const email = emp.email?.toLowerCase() || "";
    return nameEn.includes(q) || nameTa.includes(q) || email.includes(q);
  });

  return (
    <Paper sx={{ margin: { xs: 1, sm: 3 }, padding: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        alignItems={isMobile ? "stretch" : "center"}
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant={isMobile ? "h6" : "h5"}>Employees</Typography>

        <TextField
          size="small"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: isMobile ? "100%" : 300 }}
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

                {/* Only admins should see shop column */}
                {isAdmin && (
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    Shop
                  </TableCell>
                )}

                {isAdmin && (
                  <TableCell sx={{ color: "#fff", fontWeight: "bold" }}>
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp._id} hover>
                  <TableCell>{getLocalizedText(emp.name)}</TableCell>
                  <TableCell>{emp.email}</TableCell>

                  {isAdmin && (
                    <TableCell>{getLocalizedText(emp.shop?.name)}</TableCell>
                  )}

                  {isAdmin && (
                    <TableCell>
                      <IconButton onClick={() => handleEditOpen(emp)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(emp._id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        // Mobile: stacked cards
        <Stack spacing={2}>
          {filteredEmployees.map((emp) => (
            <Paper
              key={emp._id}
              elevation={1}
              sx={{ p: 2, borderRadius: 2 }}
              aria-label={`employee-card-${emp._id}`}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {getLocalizedText(emp.name)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {emp.email}
                  </Typography>
                  {isAdmin && (
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.5, color: "text.secondary" }}
                    >
                      Shop: {getLocalizedText(emp.shop?.name)}
                    </Typography>
                  )}
                </Box>

                {isAdmin && (
                  <Box display="flex" flexDirection="column" gap={1}>
                    <IconButton
                      onClick={() => handleEditOpen(emp)}
                      size="small"
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(emp._id)}
                      size="small"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Edit dialog – admins only; fullScreen on mobile */}
      {isAdmin && (
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          fullScreen={isMobile}
        >
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogContent>
            <Box sx={{ width: "100%", maxWidth: 600, mt: 1 }}>
              <TextField
                label="Name (EN)"
                name="name"
                fullWidth
                margin="normal"
                value={editForm.name}
                onChange={handleEditChange}
              />
              <TextField
                label="Name (TA)"
                name="name_ta"
                fullWidth
                margin="normal"
                value={editForm.name_ta}
                onChange={handleEditChange}
              />
              <TextField
                label="Email"
                name="email"
                fullWidth
                margin="normal"
                value={editForm.email}
                onChange={handleEditChange}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdate}>
              Update
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
};

export default EmployeeList;
