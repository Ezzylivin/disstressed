import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Database } from "lucide-react";
import "./RegisterPage.css";

export default function RegisterPage() {
  const { register, error, clearError } = useAuth();

  // Clear stale auth error when user navigates away from this page
  useEffect(() => () => clearError(), [clearError]);
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await register(email, password, name);
    setLoading(false);
    if (ok) nav("/dashboard");
  };

  return (
    // BUG 1 FIX: bg-white → full dark terminal background
    <div className="register-root">
      <div className="register-card" data-testid="register-card">

        {/* Card header */}
        <div className="register-card-header">
          <Database className="register-logo-icon" strokeWidth={1.5} aria-hidden="true" />
          <span className="register-logo-name">PropIntel</span>
        </div>

        {/* Card body */}
        <div className="register-card-body">
          <div className="register-eyebrow">// New Analyst</div>
          <h2 className="register-title">Create Account</h2>

          <form onSubmit={submit} className="register-form" data-testid="register-form">

            <div className="register-field">
              <label className="register-label" htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                data-testid="register-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="register-input"
                autoComplete="name"
                placeholder="Optional"
              />
            </div>

            <div className="register-field">
              <label className="register-label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                data-testid="register-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="register-input"
                autoComplete="email"
              />
            </div>

            <div className="register-field">
              <label className="register-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                data-testid="register-password-input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="register-input"
                autoComplete="new-password"
              />
              <span className="register-field-hint">Minimum 6 characters</span>
            </div>

            {/* BUG 3 FIX: error uses #FF4D4D, not text-red-600/bg-red-50 */}
            {error && (
              <div data-testid="register-error" className="register-error">
                {error}
              </div>
            )}

            <button
              data-testid="register-submit-btn"
              type="submit"
              disabled={loading}
              className="register-submit"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* BUG 4 FIX: border-neutral-300 / text-neutral-500 → system tokens */}
          <div className="register-login-row">
            <span className="register-login-prompt">Have an account?</span>
            <Link
              to="/login"
              data-testid="goto-login-link"
              className="register-login-link"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
