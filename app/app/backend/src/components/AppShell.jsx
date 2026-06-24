import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutGrid, ListChecks, LogOut, Database } from "lucide-react";

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const navItems = [
    { to: "/dashboard", label: "Intelligence", icon: LayoutGrid },
    { to: "/lists", label: "Lists & Export", icon: ListChecks },
    { to: "/import", label: "Import Matrix", icon: LayoutGrid },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-black text-white font-sans selection:bg-[#DEFF9A] selection:text-black">
      {/* 2026 COMMAND HEADER */}
      <header className="border-b border-[#222] h-12 flex items-center justify-between px-4 shrink-0 bg-black">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <Database className="w-5 h-5 text-[#DEFF9A]" strokeWidth={2} />
            <span className="font-display font-black uppercase tracking-tighter text-xl">PropIntel</span>
            <div className="hidden sm:block h-4 w-[1px] bg-[#333] mx-2"></div>
            <span className="hidden sm:block font-mono-pi text-[10px] uppercase tracking-widest text-neutral-500 group-hover:text-[#DEFF9A] transition-colors">
              Terminal v2.0 // System.Active
            </span>
          </Link>
          <nav className="flex items-center h-12">
            {navItems.map((it) => {
              const active = loc.pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to}
                  className={`flex items-center px-4 h-12 text-[10px] uppercase tracking-[0.2em] font-bold transition-all border-b-2 ${active ? 'border-[#DEFF9A] text-white bg-[#111]' : 'border-transparent text-neutral-500 hover:text-white'}`}>
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <div className="font-mono-pi text-[10px] uppercase text-[#DEFF9A] leading-none">{user?.role || 'operator'}</div>
            <div className="text-[11px] font-bold text-white mt-1 uppercase tracking-tight">{user?.name || user?.email}</div>
          </div>
          <button onClick={() => logout()} className="p-2 text-neutral-500 hover:text-[#DEFF9A] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden bg-black">{children}</main>
    </div>
  );
};
