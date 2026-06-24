import { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = loading, false = anon, obj = user
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("pi_token");
    if (!token) { setUser(false); return; }
    api.get("/auth/me").then((res) => setUser(res.data)).catch(() => setUser(false));
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) localStorage.setItem("pi_token", data.token);
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const register = async (email, password, name) => {
    setError("");
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      if (data.token) localStorage.setItem("pi_token", data.token);
      setUser({ id: data.id, email: data.email, name: data.name, role: data.role });
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("pi_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, error, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

