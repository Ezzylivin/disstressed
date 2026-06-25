import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutGrid, ListChecks, LogOut, Database, Upload } from "lucide-react";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Intelligence", icon: LayoutGrid },
  { to: "/lists",     label: "Lists & Export", icon: ListChecks },
  { to: "/import",    label: "Import Matrix",  icon: Upload },   // FIX: distinct icon
];

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const loc = useLocation();

  return (
    <div className="shell-root">
      {/* ── COMMAND HEADER ── */}
      <header className="shell-header">

        {/* Left: logo + nav */}
        <div className="shell-header-left">
          <Link to="/dashboard" className="shell-logo">
            <Database className="shell-logo-icon" strokeWidth={2} aria-hidden="true" />
            <span className="shell-logo-name">PropIntel</span>
            <span className="shell-logo-divider" aria-hidden="true" />
            <span className="shell-logo-tag">
              Intelligence Platform <span className="shell-logo-status">// Active</span>
            </span>
          </Link>

          <nav className="shell-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`shell-nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="shell-nav-icon" aria-hidden="true" />
                  <span className="shell-nav-label">{label}</span>
                  {/* Active indicator: top border so it doesn't merge with header bottom */}
                  {active && <span className="shell-nav-pip" aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: user identity + logout */}
        <div className="shell-header-right">
          <div className="shell-user" aria-label="Logged in user">
            <span className="shell-user-role">{user?.role || "Operator"}</span>
            <span className="shell-user-name">{user?.name || user?.email}</span>
          </div>
          {/* FIX: no wrapper arrow fn needed */}
          <button
            onClick={logout}
            className="shell-logout"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="shell-main">{children}</main>
    </div>
  );
};
