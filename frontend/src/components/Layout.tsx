import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: "/", label: "🏷️ Étiquettes" },
    { path: "/agences", label: " Agences", icon: "🏢" },
    { path: "/types-document", label: " Types", icon: "📄" },
    { path: "/recherche", label: " Recherche", icon: "🔍" },
    ...(user?.role === "admin" ? [{ path: "/utilisateurs", label: " Utilisateurs", icon: "👥" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f0ede8]">
      {/* ─── HEADER ───────────────────────────────────────────── */}
      <header className="no-print bg-primary text-white shadow-lg sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-accent w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm shadow-md">
                ÉT
              </div>
              <div>
                <span className="font-mono font-bold text-lg tracking-tight">Étiquettes</span>
                <span className="hidden sm:inline text-white/50 text-xs font-mono ml-2">v1.0</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-5 sm:gap-5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-mono text-sm transition-all flex items-center gap-2
                      ${
                        isActive
                          ? "bg-accent text-white shadow-md"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }
                    `}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Info utilisateur */}
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-xs font-mono hidden md:inline">
                {new Date().toLocaleDateString("fr-FR")}
              </span>
              <div className="hidden sm:block text-right leading-tight">
                <p className="text-xs font-mono">{user?.nom}</p>
                <button onClick={logout} className="text-[10px] font-mono text-white/50 hover:text-white">Déconnexion</button>
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center text-sm font-mono font-bold">
                {user?.nom?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── CONTENU PLEINE LARGEUR ──────────────────────────── */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
