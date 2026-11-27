import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider } from "./contexts/SettingsContext";  // ✅ AJOUTER CET IMPORT
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AgencePage from "./pages/AgencePage";
import RecherchePage from "./pages/RecherchePage";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import UsersPage from "./pages/UsersPage";
import TypeDocumentPage from "./pages/TypeDocumentPage";
import "./styles/index.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>  {/* ✅ AJOUTER CETTE LIGNE */}
          <Routes>
            {/* Routes publiques */}
            <Route path="/connexion" element={<AuthPage mode="login" />} />
            <Route path="/inscription" element={<AuthPage mode="register" />} />

            {/* Routes protégées avec Layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout><Home /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/agences" element={
              <ProtectedRoute>
                <Layout><AgencePage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/types-document" element={
              <ProtectedRoute>
                <Layout><TypeDocumentPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/recherche" element={
              <ProtectedRoute>
                <Layout><RecherchePage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/utilisateurs" element={
              <ProtectedRoute>
                <Layout><UsersPage /></Layout>
              </ProtectedRoute>
            } />

            {/* Redirection 404 vers Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>  {/* ✅ AJOUTER CETTE LIGNE */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;