import axios from "axios";
import { api } from "./api";  // ✅ Import de api pour les requêtes authentifiées

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

// ─── HIÉRARCHIE ─────────────────────────────────────────────────

export interface HierarchyBoite {
  numero_boite: string;
  total_documents: number;
  caissiers: string[];
  date_debut: string;
  date_fin: string;
}

export interface HierarchyAnnee {
  annee: string;
  boites: HierarchyBoite[];
  total_boites: number;
  total_documents: number;
}

export interface HierarchyType {
  id: number;
  nom: string;
  code: string;
  description: string | null;
  annees: HierarchyAnnee[];
  total_boites: number;
  total_documents: number;
}

export interface HierarchyData {
  agence: Agence;
  types: HierarchyType[];
  total_boites: number;
  total_documents: number;
}

// ✅ Utilise api (avec token) pour les routes protégées
export const getAgenceHierarchy = async (id: number): Promise<{ success: boolean; data: HierarchyData }> => {
  const response = await api.get(`/agences/${id}/hierarchy`);
  return response.data;
};

// ─── CRUD ─────────────────────────────────────────────────────

/**
 * Récupérer toutes les agences
 */
export const getAllAgences = async (active?: boolean): Promise<AgenceResponse> => {
  // ✅ Utiliser api au lieu de axios direct pour avoir le token
  const response = await api.get<AgenceResponse>('/agences', { 
    params: { active } 
  });
  return response.data;
};

/**
 * Récupérer une agence par ID
 */
export const getAgenceById = async (id: number): Promise<Agence> => {
  const response = await api.get<{ success: boolean; data: Agence }>(`/agences/${id}`);
  return response.data.data;
};

/**
 * Créer une agence
 */
export const createAgence = async (nom: string, code: string): Promise<Agence> => {
  const response = await api.post<{ success: boolean; data: Agence; message: string }>(
    '/agences', 
    { nom, code }
  );
  return response.data.data;
};

/**
 * Mettre à jour une agence
 */
export const updateAgence = async (id: number, data: Partial<Agence>): Promise<Agence> => {
  const response = await api.put<{ success: boolean; data: Agence; message: string }>(
    `/agences/${id}`, 
    data
  );
  return response.data.data;
};

/**
 * Désactiver une agence (soft delete)
 */
export const deleteAgence = async (id: number): Promise<boolean> => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/agences/${id}`
  );
  return response.data.success;
};

/**
 * Supprimer définitivement une agence
 */
export const deleteAgencePermanent = async (id: number): Promise<boolean> => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/agences/${id}/permanent`
  );
  return response.data.success;
};