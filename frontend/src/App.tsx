import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AgencePage from "./pages/AgencePage";
import RecherchePage from "./pages/RecherchePage";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import UsersPage from "./pages/UsersPage";
import "./styles/index.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<AuthPage mode="login" />} />
          <Route path="/inscription" element={<AuthPage mode="register" />} />
          <Route path="/*" element={<ProtectedRoute><Layout><Routes><Route path="/" element={<Home />} /><Route path="/agences" element={<AgencePage />} /><Route path="/recherche" element={<RecherchePage />} /><Route path="/utilisateurs" element={<UsersPage />} /></Routes></Layout></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
