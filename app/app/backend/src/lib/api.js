import axios from "axios";

// Bug 5 fix: env-aware base URL — falls back to "/api" for local dev proxy
export const API = import.meta.env.VITE_API_URL ?? "/api";

export const api = axios.create({
  baseURL: API,
  // Bug 1 fix: removed explicit `withCredentials: false` — it's the default and
  // stating it implies an intentional override, which is misleading
});

// ── REQUEST INTERCEPTOR — attach auth token ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pi_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── RESPONSE INTERCEPTOR — handle auth expiry ────────────────────────────────
// Bug 3 fix: 401s were silently swallowed. Now redirects to /login so the user
// knows their session has expired instead of seeing mysterious empty states.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("pi_token");
      // Use location.replace so the login page isn't added to browser history
      window.location.replace("/login");
    }
    return Promise.reject(error);
  }
);

// ── ERROR FORMATTER ──────────────────────────────────────────────────────────
export const formatApiError = (detail) => {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  return String(detail);
};

// ── FORMATTERS ───────────────────────────────────────────────────────────────

// Bug 2 fix: replaced isNaN (coerces strings) with explicit Number() conversion
// so string values like "50000" from the API are handled correctly
export const fmtMoney = (n) => {
  const num = Number(n);
  if (n == null || Number.isNaN(num)) return "—";
  return "$" + Math.round(num).toLocaleString();
};

export const fmtNum = (n) => (n == null ? "—" : Number(n).toLocaleString());
