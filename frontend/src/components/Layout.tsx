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
    { path: "/", label: "Étiquettes" },
    { path: "/agences", label: "Agences" },
    { path: "/types-document", label: "Types"},
    { path: "/recherche", label: "Recherche"},
    ...(user?.role === "admin" ? [{ path: "/utilisateurs", label: "Utilisateurs"}] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── HEADER ───────────────────────────────────────────── */}
      <header className="no-print sticky top-0 z-50 bg-header text-header-text shadow-lg">
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 lg:px-8">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 lg:flex-nowrap">
            {/* Logo */}
            <Link to="/" aria-label="Étiquettes, accueil" className="flex shrink-0 items-center gap-2.5 rounded-md transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-header-text/70 focus-visible:ring-offset-2 focus-visible:ring-offset-header motion-reduce:transition-none sm:gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-header-active font-mono text-sm font-bold shadow-md sm:h-10 sm:w-10">
                ÉT
              </div>
              <div>
                <span className="font-sans text-base font-bold tracking-tight sm:text-lg">Étiquettes</span>
                <span className="ml-2 hidden font-mono text-xs text-header-text/50 sm:inline">v1.0</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav aria-label="Navigation principale" className="order-3 flex w-full max-w-full items-center gap-1 overflow-x-auto pb-0.5 lg:order-none lg:w-auto lg:flex-1 lg:justify-center lg:overflow-visible">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(`${item.path}/`));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                    className="app-header-nav-link"
                  >
                    {/* <span aria-hidden="true" className="text-base">{item.icon}</span> */}
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Info utilisateur */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden font-mono text-xs text-header-text/50 lg:inline">
                {new Date().toLocaleDateString("fr-FR")}
              </span>
              <div className="hidden text-right leading-tight sm:block">
                <p className="max-w-36 truncate font-sans text-xs font-medium">{user?.nom}</p>
                <button type="button" onClick={logout} className="mt-0.5 rounded-sm font-mono text-[10px] text-header-text/60 transition-colors duration-150 hover:text-header-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-header-text/70 motion-reduce:transition-none">Déconnexion</button>
              </div>
              <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-header-active/30 font-mono text-sm font-bold ring-1 ring-header-text/15">
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
