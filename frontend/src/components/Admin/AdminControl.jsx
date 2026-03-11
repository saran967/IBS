// import React, { useEffect, useState } from "react";
// import { Button, Box, Modal, CircularProgress } from "@mui/material";

// import EmployeeList from "./EmployeeList";
// import AddSubAdminForm from "./AddSubAdminForm";
// import AddEmployeeForm from "./AddEmployeeForm";
// import SubAdminList from "./SubadminList";

// import customFetch from "../../utils/customFetch.js";

// const AdminControl = () => {
//   const [activeTab, setActiveTab] = useState("employee");
//   const [openModal, setOpenModal] = useState(false);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [loadingUser, setLoadingUser] = useState(true);

//   const handleOpen = () => setOpenModal(true);
//   const handleClose = () => setOpenModal(false);

//   //  Load current user inside this component
//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const res = await customFetch.get("/auth/current-user");
//         setCurrentUser(res.data.user);
//       } catch (err) {
//         console.error("Failed to load user", err);
//       } finally {
//         setLoadingUser(false);
//       }
//     };
//     fetchUser();
//   }, []);

//   if (loadingUser) {
//     return (
//       <Box sx={{ textAlign: "center", mt: 10 }}>
//         <CircularProgress />
//       </Box>
//     );
//   }

//   if (!currentUser) {
//     return (
//       <Box sx={{ textAlign: "center", mt: 10 }}>
//         Failed to load current user
//       </Box>
//     );
//   }

//   const role = currentUser.role;

//   const isAdmin = role === "admin";
//   const isSubAdmin = role === "subadmin";
//   const isEmployee = role === "user";

//   return (
//     <Box sx={{ padding: 3 }}>
//       {/* Tabs */}
//       <Box sx={{ display: "flex", gap: 2, marginBottom: 3 }}>
//         {/* Admin can see both tabs */}
//         {isAdmin && (
//           <Button
//             variant={activeTab === "subadmin" ? "contained" : "outlined"}
//             onClick={() => setActiveTab("subadmin")}
//           >
//             Subadmins
//           </Button>
//         )}

//         {/* Everyone can see Employees tab */}
//         <Button
//           variant={activeTab === "employee" ? "contained" : "outlined"}
//           color="secondary"
//           onClick={() => setActiveTab("employee")}
//         >
//           Employees
//         </Button>

//         <Box sx={{ flexGrow: 1 }} />

//         {/* Show Add buttons based on role */}
//         {isAdmin && (
//           <Button variant="contained" color="success" onClick={handleOpen}>
//             {activeTab === "subadmin" ? "Add Subadmin" : "Add Employee"}
//           </Button>
//         )}

//         {isSubAdmin && activeTab === "employee" && (
//           <Button variant="contained" color="success" onClick={handleOpen}>
//             Add Employee
//           </Button>
//         )}

//         {/* Employee never sees add button */}
//       </Box>

//       {/* Lists */}
//       {isAdmin && activeTab === "subadmin" && <SubAdminList currentUser={currentUser} />}

//       {/* Employee list is visible to all roles */}
//       {activeTab === "employee" && <EmployeeList currentUser={currentUser} />}

//       {/* Modal */}
//       <Modal open={openModal} onClose={handleClose}>
//         <Box
//           sx={{
//             width: 400,
//             bgcolor: "background.paper",
//             p: 3,
//             mx: "auto",
//             mt: 10,
//             borderRadius: 2,
//           }}
//         >
//           {activeTab === "subadmin" ? (
//             <AddSubAdminForm onClose={handleClose} />
//           ) : (
//             <AddEmployeeForm onClose={handleClose} currentUser={currentUser} />
//           )}
//         </Box>
//       </Modal>
//     </Box>
//   );
// };

// export default AdminControl;

import React, { useEffect, useState } from "react";
import {
  Button,
  Box,
  Modal,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import EmployeeList from "./EmployeeList";
import AddSubAdminForm from "./AddSubAdminForm";
import AddEmployeeForm from "./AddEmployeeForm";
import SubAdminList from "./SubadminList";

import customFetch from "../../utils/customFetch.js";

const AdminControl = () => {
  const [activeTab, setActiveTab] = useState("employee");
  const [openModal, setOpenModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);
  const handleCreateSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    handleClose();
  };

  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await customFetch.get("/auth/current-user");
        setCurrentUser(res.data.user);
      } catch (err) {
        console.error("Failed to load user", err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  if (loadingUser) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        Failed to load current user
      </Box>
    );
  }

  const role = currentUser.role;
  const isAdmin = role === "admin";
  const isSubAdmin = role === "subadmin";
  const isEmployee = role === "user";

  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3 },
      }}
    >
      {/* Tabs & Actions */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          marginBottom: 3,
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        {/* Tabs group */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {/* Admin can see Subadmins tab */}
          {isAdmin && (
            <Button
              fullWidth={isMobile}
              variant={activeTab === "subadmin" ? "contained" : "outlined"}
              onClick={() => setActiveTab("subadmin")}
              size={isMobile ? "small" : "medium"}
            >
              Subadmins
            </Button>
          )}

          {/* Everyone can see Employees tab */}
          <Button
            fullWidth={isMobile}
            variant={activeTab === "employee" ? "contained" : "outlined"}
            color="secondary"
            onClick={() => setActiveTab("employee")}
            size={isMobile ? "small" : "medium"}
          >
            Employees
          </Button>
        </Box>

        {/* Spacer for desktop only */}
        <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }} />

        {/* Add buttons group */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
          }}
        >
          {isAdmin && (
            <Button
              fullWidth={isMobile}
              variant="contained"
              color="success"
              onClick={handleOpen}
              size={isMobile ? "small" : "medium"}
            >
              {activeTab === "subadmin" ? "Add Subadmin" : "Add Employee"}
            </Button>
          )}

          {isSubAdmin && activeTab === "employee" && (
            <Button
              fullWidth={isMobile}
              variant="contained"
              color="success"
              onClick={handleOpen}
              size={isMobile ? "small" : "medium"}
            >
              Add Employee
            </Button>
          )}
        </Box>
      </Box>

      {/* Lists */}
      {isAdmin && activeTab === "subadmin" && (
        <SubAdminList currentUser={currentUser} refreshKey={refreshKey} />
      )}

      {activeTab === "employee" && <EmployeeList refreshKey={refreshKey} />}

      {/* Modal */}
      <Modal open={openModal} onClose={handleClose}>
        <Box
          sx={{
            width: { xs: "90%", sm: 400 },
            maxHeight: { xs: "90vh", sm: "unset" },
            overflowY: "auto",
            bgcolor: "background.paper",
            p: { xs: 2, sm: 3 },
            mx: "auto",
            mt: { xs: 6, sm: 10 },
            borderRadius: 2,
            outline: "none",
          }}
        >
          {activeTab === "subadmin" ? (
            <AddSubAdminForm
              onClose={handleClose}
              onSuccess={handleCreateSuccess}
            />
          ) : (
            <AddEmployeeForm
              onClose={handleClose}
              currentUser={currentUser}
              onSuccess={handleCreateSuccess}
            />
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default AdminControl;
