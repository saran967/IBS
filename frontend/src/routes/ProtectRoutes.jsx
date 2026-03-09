// src/routes/ProtectedRoutes.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";

const ProtectedRoutes = ({ element }) => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );

  if (!user) return <Navigate to="/en/auth/login" replace />;

  return element || <Outlet />;
};

export default ProtectedRoutes;
