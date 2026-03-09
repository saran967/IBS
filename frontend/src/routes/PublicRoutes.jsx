import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PublicRoutes = ({ element }) => {
  const { user, loading } = useAuth();
  console.log(user);

  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to="/en/admin" replace />;

  return element;
};

export default PublicRoutes;
