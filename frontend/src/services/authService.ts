import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export interface AuthUser {
  id: number;
  nom: string;
  email: string;
  role: string;
}

interface AuthResponse {
  success: boolean;
  user: AuthUser;
  token: string;
}

export const loginRequest = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, { email, password });
  return response.data;
};

export const registerRequest = async (nom: string, email: string, password: string): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/auth/register`, { nom, email, password });
  return response.data;
};

export const getCurrentUser = async (): Promise<AuthUser> => {
  const response = await axios.get<{ success: boolean; user: AuthUser }>(`${API_URL}/auth/me`);
  return response.data.user;
};
