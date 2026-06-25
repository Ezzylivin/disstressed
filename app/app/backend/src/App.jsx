import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import ListsPage from "./pages/ListsPage";
import ImportPage from "./pages/ImportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import "./App.css";

// Renders children when authenticated.
// Returns null while session is still hydrating (prevents redirect flash).
// Redirects to /login once hydration confirms no valid session.
const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Redirects already-authenticated users away from auth pages.
// Prevents a logged-in user from seeing the login/register form.
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes — redirect to dashboard if already logged in */}
          <Route path="/login"    element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />

          {/* Protected app routes */}
          <Route path="/dashboard"      element={<Protected><DashboardPage /></Protected>} />
          <Route path="/property/:id"   element={<Protected><PropertyDetailPage /></Protected>} />
          <Route path="/lists"          element={<Protected><ListsPage /></Protected>} />
          <Route path="/import"         element={<Protected><ImportPage /></Protected>} />

          {/* Root → dashboard (Protected will redirect to /login if not authed) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 fallback → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
