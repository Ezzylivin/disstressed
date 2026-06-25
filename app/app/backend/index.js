import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Top-level error boundary — prevents the entire app from going blank on an
// unhandled component error. Shows a minimal recovery UI instead.
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { caught: false };
  }

  static getDerivedStateFromError() {
    return { caught: true };
  }

  componentDidCatch(error, info) {
    // In production this is where you'd forward to Sentry / Datadog
    console.error("[PropIntel] Unhandled render error:", error, info);
  }

  render() {
    if (this.state.caught) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", background: "#000",
          fontFamily: "'IBM Plex Mono', monospace", color: "#333",
          gap: "16px",
        }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            // System Error — Render Failed
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#DEFF9A", color: "#000", border: "none",
              padding: "8px 20px", fontFamily: "inherit", fontSize: "10px",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Issue 1 fix: QueryClientProvider removed — React Query is imported and
// configured in the current codebase but never actually used. All data
// fetching goes through the custom api axios instance with useState/useEffect.
// Re-add if the codebase migrates to useQuery/useMutation.

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Issue 3 note: React.StrictMode removed alongside the React import.
// StrictMode is useful during development (double-invokes effects to surface
// side-effect bugs) but has no effect in production builds. Re-add wrapped
// in an env check if desired:
//
//   const tree = import.meta.env.DEV
//     ? <React.StrictMode><App /></React.StrictMode>
//     : <App />;
