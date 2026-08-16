import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthUser, getCurrentUser, loginRequest, registerRequest } from "../services/authService";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nom: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "etiquettes_auth";

function applyToken(token?: string) {
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    try {
      const { token } = JSON.parse(saved);
      applyToken(token);
      getCurrentUser().then(setUser).catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        applyToken();
      }).finally(() => setLoading(false));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
    }
  }, []);

  const saveSession = (authUser: AuthUser, token: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));
    applyToken(token);
    setUser(authUser);
  };

  const login = async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    saveSession(response.user, response.token);
  };

  const register = async (nom: string, email: string, password: string) => {
    await registerRequest(nom, email, password);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    applyToken();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return context;
};
