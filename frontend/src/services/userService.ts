import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export interface AppUser {
  id: number;
  nom: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  created_at?: string;
}

export const getUsers = async () => (await axios.get<{ data: AppUser[] }>(`${API_URL}/users`)).data.data;
export const createUser = async (data: { nom: string; email: string; password: string; role: string }) => (await axios.post<{ data: AppUser }>(`${API_URL}/users`, data)).data.data;
export const updateUser = async (id: number, data: { nom: string; email: string; password?: string; role: string }) => (await axios.put<{ data: AppUser }>(`${API_URL}/users/${id}`, data)).data.data;
export const setUserStatus = async (id: number, active: boolean) => (await axios.patch<{ data: AppUser }>(`${API_URL}/users/${id}/status`, { active })).data.data;
