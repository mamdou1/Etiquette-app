import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export interface Agence {
  id?: number;
  nom: string;
  code: string;
  active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface AgenceResponse {
  success: boolean;
  data: Agence[];
  count: number;
  message?: string;
}

// ─── CRUD ─────────────────────────────────────────────────────

/**
 * Récupérer toutes les agences
 */
export const getAllAgences = async (active?: boolean): Promise<AgenceResponse> => {
  const response = await axios.get<AgenceResponse>(`${API_URL}/agences`, { 
    params: { active } 
  });
  return response.data;
};

/**
 * Récupérer une agence par ID
 */
export const getAgenceById = async (id: number): Promise<Agence> => {
  const response = await axios.get<{ success: boolean; data: Agence }>(`${API_URL}/agences/${id}`);
  return response.data.data;
};

/**
 * Créer une agence
 */
export const createAgence = async (nom: string, code: string): Promise<Agence> => {
  const response = await axios.post<{ success: boolean; data: Agence; message: string }>(
    `${API_URL}/agences`, 
    { nom, code }
  );
  return response.data.data;
};

/**
 * Mettre à jour une agence
 */
export const updateAgence = async (id: number, data: Partial<Agence>): Promise<Agence> => {
  const response = await axios.put<{ success: boolean; data: Agence; message: string }>(
    `${API_URL}/agences/${id}`, 
    data
  );
  return response.data.data;
};

/**
 * Désactiver une agence (soft delete)
 */
export const deleteAgence = async (id: number): Promise<boolean> => {
  const response = await axios.delete<{ success: boolean; message: string }>(
    `${API_URL}/agences/${id}`
  );
  return response.data.success;
};

/**
 * Supprimer définitivement une agence
 */
export const deleteAgencePermanent = async (id: number): Promise<boolean> => {
  const response = await axios.delete<{ success: boolean; message: string }>(
    `${API_URL}/agences/${id}/permanent`
  );
  return response.data.success;
};