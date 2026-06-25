import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Database } from "lucide-react";
import "./LoginPage.css";

// BUG 3 FIX: import React removed — not needed with automatic JSX transform

export default function LoginPage() {
  const { login, error, clearError } = useAuth();

  // Clear stale auth error when user navigates away from this page
  useEffect(() => () => clearError(), [clearError]);
  // BUG 1 FIX: "admin..propintel.io" → "admin@propintel.io" (double-dot, missing @)
  const [email,    setEmail]    = useState("admin@propintel.io");
  const [password, setPassword] = useState("Demo2026!");
  const [loading,  setLoading]  = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) nav("/dashboard");
  };

  return (
    <div className="login-root">

      {/* ── LEFT: BRAND PANEL ── */}
      <div className="login-brand" data-testid="login-brand-panel">

        <div className="login-brand-logo">
          <Database className="login-logo-icon" strokeWidth={1.5} aria-hidden="true" />
          <span className="login-logo-name">PropIntel</span>
        </div>

        <div className="login-brand-body">
          <div className="login-eyebrow">// Off-Market Intelligence Terminal</div>
          <h1 className="login-headline">
            Find vacant.<br />
            Find delinquent.<br />
            {/* BUG 2 FIX: #39ff14 → canonical #DEFF9A */}
            <span className="login-headline-accent">Find owners.</span>
          </h1>
          <p className="login-description">
            Aggregate municipal tax-default logs, USPS vacancy data, and ATTOM
            property records. Underwrite repair cost and ARV in one click.
            Skip-trace verified mobile lines &amp; emails. Export to Excel.
          </p>

          <div className="login-stats">
            <div className="login-stat">
              <span className="login-stat-number">52</span>
              <span className="login-stat-label">Jurisdictions</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-number">9</span>
              <span className="login-stat-label">Export Columns</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-number">3</span>
              <span className="login-stat-label">Live Data Sources</span>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          © PropIntel — Modeled on ATTOM, Endato, USPS NCOA schemas
        </div>
      </div>

      {/* ── RIGHT: FORM PANEL ── */}
      <div className="login-form-panel">
        <div className="login-form-inner" data-testid="login-form">

          <div className="login-form-eyebrow">// Access Terminal</div>
          <h2 className="login-form-title">Sign In</h2>

          <form onSubmit={submit} className="login-form">

            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                autoComplete="current-password"
              />
            </div>

            {/* BUG 5 FIX: error uses system red #FF4D4D, not text-red-600/bg-red-50 */}
            {error && (
              <div data-testid="login-error" className="login-error">
                {error}
              </div>
            )}

            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={loading}
              className="login-submit"
            >
              {loading ? "Authenticating..." : "Enter Terminal"}
            </button>
          </form>

          <div className="login-register-row">
            <span className="login-register-prompt">No account?</span>
            <Link
              to="/register"
              data-testid="goto-register-link"
              className="login-register-link"
            >
              Create one
            </Link>
          </div>

          {/* BUG 1 FIX: correct email in demo hint */}
          <div className="login-demo-hint" data-testid="demo-creds-hint">
            <span className="login-demo-label">// Demo</span>
            admin@propintel.io · Demo2026!
          </div>

        </div>
      </div>
    </div>
  );
}
