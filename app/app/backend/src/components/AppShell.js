
Action: file_editor create /app/frontend/src/components/AppShell.jsx --file-text "import { Link, useLocation, useNavigate } from \"react-router-dom\";
import { useAuth } from \"@/context/AuthContext\";
import { Building2, LayoutGrid, ListChecks, LogOut, Database } from \"lucide-react\";

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const navItems = [
    { to: \"/dashboard\", label: \"Intelligence\", icon: LayoutGrid },
    { to: \"/lists\", label: \"Lists & Export\", icon: ListChecks },
  ];

  const onLogout = async () => { await logout(); nav(\"/login\"); };

  return (
    <div className=\"h-screen w-screen flex flex-col bg-white\">
      {/* TOP BAR */}
      <header className=\"border-b border-black h-12 flex items-center justify-between px-4 shrink-0\" data-testid=\"top-nav\">
        <div className=\"flex items-center gap-6\">
          <Link to=\"/dashboard\" className=\"flex items-center gap-2\" data-testid=\"brand-link\">
            <Database className=\"w-5 h-5\" strokeWidth={1.5} />
            <span className=\"font-display font-black uppercase tracking-tight text-lg\">PropIntel</span>
            <span className=\"label-xs ml-1 border-l border-neutral-300 pl-2\">Off-Market Terminal</span>
          </Link>
          <nav className=\"flex items-center gap-1\">
            {navItems.map((it) => {
              const active = loc.pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link key={it.to} to={it.to}
                  data-testid={`nav-${it.label.toLowerCase().replace(/\s/g, '-')}`}
                  className={`flex items-center gap-2 px-3 h-12 text-xs uppercase tracking-[0.1em] font-bold border-l border-r border-transparent ${active ? 'bg-black text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                  <Icon className=\"w-3.5 h-3.5\" strokeWidth={1.8}/>
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className=\"flex items-center gap-4\">
          <div className=\"text-right\" data-testid=\"user-info\">
            <div className=\"text-xs font-semibold leading-none\">{user?.name || user?.email}</div>
            <div className=\"label-xs leading-none mt-0.5\">{user?.role || 'user'}</div>
          </div>
          <button data-testid=\"logout-btn\" onClick={onLogout}
            className=\"flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.1em] font-bold border border-black hover:bg-black hover:text-white\">
            <LogOut className=\"w-3.5 h-3.5\" strokeWidth={1.8}/> Logout
          </button>
        </div>
      </header>
      <main className=\"flex-1 overflow-hidden\">{children}</main>
    </div>
  );
};

export default AppShell;
"
Observation: Create successful: /app/frontend/src/components/AppShell.jsx
