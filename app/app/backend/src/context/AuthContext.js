import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // BUG 3 FIX: separate loading boolean instead of null/false/obj overloading
  const [user,    setUser]    = useState(null);   // null = not yet resolved
  const [loading, setLoading] = useState(true);   // true until /auth/me resolves
  const [error,   setError]   = useState("");

  // BUG 7 FIX: logout is defined before the effect so the 401 handler can call it
  // BUG 5 FIX: logout clears in-memory user state — not just localStorage
  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* best-effort */ }
    localStorage.removeItem("pi_token");
    setUser(null);
    setLoading(false);
  }, []);

  // Rehydrate session on mount
  // (401 handling lives in api.js interceptor — single source of truth)
  useEffect(() => {
    const token = localStorage.getItem("pi_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((res) => {
        // BUG 2 FIX: validate the response has the fields we actually need
        const d = res.data;
        if (d?.id && d?.email) {
          setUser({ id: d.id, email: d.email, name: d.name ?? null, role: d.role ?? "user" });
        } else {
          // Unexpected response shape — treat as logged out
          localStorage.removeItem("pi_token");
        }
      })
      .catch(() => {
        // Token is invalid or expired — clear it
        localStorage.removeItem("pi_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) localStorage.setItem("pi_token", data.token);
      setUser({ id: data.id, email: data.email, name: data.name ?? null, role: data.role ?? "user" });
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message || "Login failed");
      return false;
    }
  };

  const register = async (email, password, name) => {
    setError("");
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      if (data.token) localStorage.setItem("pi_token", data.token);
      setUser({ id: data.id, email: data.email, name: data.name ?? null, role: data.role ?? "user" });
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message || "Registration failed");
      return false;
    }
  };

  // BUG 6 FIX: expose clearError instead of raw setError — defined purpose,
  // child components should clear the error display, not set arbitrary strings
  const clearError = useCallback(() => setError(""), []);

  return (
    // BUG 7 FIX: loading now exported so Protected in App.jsx can use it
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
