import { createContext, useContext, useEffect, useState } from "react";
import customFetch from "../utils/customFetch";
import FullScreenLoader from "../components/common/FullScreenLoader";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = async () => {
    try {
      // cookie-based auth is source of truth
      const res = await customFetch.get("/auth/current-user");
      const { user, permissions } = res.data;

      setUser(user || null);
      setPermissions(permissions || []);

      sessionStorage.setItem("user", JSON.stringify(user || null));
      sessionStorage.setItem("permissions", JSON.stringify(permissions || []));
    } catch {
      // no valid cookie/session
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("permissions");
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await customFetch.post("/auth/login", credentials);
      const { user, token, permissions, msg } = res.data;

      // optional token storage (not primary auth source)
      if (token) sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user || null));
      sessionStorage.setItem("permissions", JSON.stringify(permissions || []));

      setUser(user || null);
      setPermissions(permissions || []);

      return { user, token, permissions, msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await customFetch.post("/auth/logout");
    } catch {
      // ignore and clear local state anyway
    } finally {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("permissions");
      setUser(null);
      setPermissions([]);
    }
  };

  const hasPermission = (key) => {
    if (!user) return false;
    if (user.role === "admin" || user.role === "superadmin") return true;
    return permissions.includes(key);
  };

  return (
    <AuthContext.Provider
      value={{ user, permissions, loading, login, logout, hasPermission }}
    >
      {loading ? <FullScreenLoader /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
