import axios from "axios";

export const API = import.meta.env.VITE_API_URL ?? "/api";

export const api = axios.create({
  baseURL: API,
});

// ── REQUEST INTERCEPTOR — attach auth token ───────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pi_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── RESPONSE INTERCEPTOR — expired session redirect ──────────────────────────
// IMPORTANT: /auth/* endpoints are excluded. A 401 on /auth/login means wrong
// credentials and must reach the catch() in AuthContext.login() so the error
// message displays. Without this guard the interceptor fires first, calls
// location.replace("/login"), and the submit button gets stuck on
// "Authenticating..." forever because setSubmitting(false) never runs.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.includes("/auth/")) {
      localStorage.removeItem("pi_token");
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

// ── ERROR FORMATTER ───────────────────────────────────────────────────────────
export const formatApiError = (detail) => {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  return String(detail);
};

// ── FORMATTERS ────────────────────────────────────────────────────────────────
export const fmtMoney = (n) => {
  const num = Number(n);
  if (n == null || Number.isNaN(num)) return "—";
  return "$" + Math.round(num).toLocaleString();
};

export const fmtNum = (n) => (n == null ? "—" : Number(n).toLocaleString());
