import { api } from './api';

// ─── INTERFACES ─────────────────────────────────────────────────

export interface Agence {
  id: number;
  nom: string;
  code: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
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
  metaValues: Record<string, {
    label: string;
    field_type: string;
    value: string;
  }>;
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

// ─── CRUD AGENCES ──────────────────────────────────────────────

/**
 * Récupérer toutes les agences
 */
export const getAllAgences = async (active?: boolean): Promise<AgenceResponse> => {
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

// ─── HIÉRARCHIE ─────────────────────────────────────────────────

/**
 * Récupérer la hiérarchie complète d'une agence
 * Agence → Types → Années → Boîtes
 */
export const getAgenceHierarchy = async (id: number): Promise<{ success: boolean; data: HierarchyData }> => {
  const response = await api.get(`/agences/${id}/hierarchy`);
  return response.data;
};

// ─── BOÎTES ─────────────────────────────────────────────────────

export interface CreateBoiteData {
  agence_id: number;
  type_document_id: number;
  numero_boite: string;
  annee: string;
  meta_values: Record<string, any>;
}

/**
 * Créer une nouvelle boîte (ajout manuel)
 */
export const createBoite = async (data: CreateBoiteData): Promise<{ success: boolean; message: string; data: any }> => {
  const response = await api.post('/agences/boites', data);
  return response.data;
};

/**
 * Récupérer les boîtes d'une agence
 */
export const getBoitesByAgence = async (agenceId: number): Promise<any> => {
  const response = await api.get(`/agences/${agenceId}/boites`);
  return response.data;
};

/**
 * Récupérer les boîtes d'un type
 */
export const getBoitesByType = async (agenceId: number, typeId: number): Promise<any> => {
  const response = await api.get(`/agences/${agenceId}/types/${typeId}/boites`);
  return response.data;
};

/**
 * Supprimer une boîte
 */
export const deleteBoite = async (agenceId: number, typeId: number, numeroBoite: string): Promise<boolean> => {
  const response = await api.delete(`/agences/${agenceId}/types/${typeId}/boites/${numeroBoite}`);
  return response.data.success;
};

// ─── STATISTIQUES ──────────────────────────────────────────────

/**
 * Récupérer les statistiques d'une agence
 */
export const getAgenceStats = async (id: number): Promise<{ total_boites: number; total_documents: number }> => {
  const response = await api.get(`/agences/${id}/stats`);
  return response.data.data;
};
