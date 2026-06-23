"import \"@/index.css\";
import { BrowserRouter, Routes, Route, Navigate } from \"react-router-dom\";
import { AuthProvider, useAuth } from \"@/context/AuthContext\";
import LoginPage from \"@/pages/LoginPage\";
import RegisterPage from \"@/pages/RegisterPage\";
import DashboardPage from \"@/pages/DashboardPage\";
import PropertyDetailPage from \"@/pages/PropertyDetailPage\";
import ListsPage from \"@/pages/ListsPage\";
import { Toaster } from \"sonner\";

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <div className=\"h-screen w-screen flex items-center justify-center text-xs font-mono-pi\">Authenticating...</div>;
  if (!user) return <Navigate to=\"/login\" replace />;
  return children;
};

const Public = ({ children }) => {
  const { user } = useAuth();
  if (user === null) return <div className=\"h-screen w-screen flex items-center justify-center text-xs font-mono-pi\">Loading...</div>;
  if (user) return <Navigate to=\"/dashboard\" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position=\"top-right\" toastOptions={{ style: { borderRadius: 0, border: \"1px solid #000\", fontSize: \"12px\" } }}/>
        <Routes>
          <Route path=\"/\" element={<Navigate to=\"/dashboard\" replace/>}/>
          <Route path=\"/login\" element={<Public><LoginPage/></Public>}/>
          <Route path=\"/register\" element={<Public><RegisterPage/></Public>}/>
          <Route path=\"/dashboard\" element={<Protected><DashboardPage/></Protected>}/>
          <Route path=\"/property/:id\" element={<Protected><PropertyDetailPage/></Protected>}/>
          <Route path=\"/lists\" element={<Protected><ListsPage/></Protected>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
"
