import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center font-mono text-muted">Chargement de votre session…</div>;
  return user ? children : <Navigate to="/connexion" replace state={{ from: location }} />;
};

export default ProtectedRoute;
