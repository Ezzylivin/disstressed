import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import DashboardPage from "@/pages/DashboardPage";
import PropertyDetailPage from "@/pages/PropertyDetailPage";
import ListsPage from "@/pages/ListsPage";
import ImportPage from "@/pages/ImportPage";
import LoginPage from "@/pages/LoginPage";
import "@/App.css";

// Wraps any route that requires a valid session.
// Redirects to /login if the user is not authenticated.
const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null; // AuthContext is still hydrating from localStorage
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/property/:id" element={<Protected><PropertyDetailPage /></Protected>} />
          <Route path="/lists" element={<Protected><ListsPage /></Protected>} />
          <Route path="/import" element={<Protected><ImportPage /></Protected>} />

          {/* Default: redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
