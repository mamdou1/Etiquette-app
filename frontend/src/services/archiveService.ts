// services/archiveService.ts
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ─── INTERFACES ──────────────────────────────────────────────

export interface Archive {
  id?: number;
  numero_boite: string;
  agence_id: number;
  agence_nom: string;
  agence_code?: string;  // ✅ AJOUTER CETTE LIGNE
  date_production: string;
  type_document: string;
  caissiers: string;
  annee: string;
  observation?: string;
  source: string;
  uploaded_at?: Date;
  created_at?: Date;
}

export interface ArchiveGrouped {
  numero_boite: string;
  agence_id: number;
  agence_nom: string;
  types_documents: string;
  caissiers: string;
  annees: string;
  observations: string;
  total_documents: number;
  date_debut: string;
  date_fin: string;
  archive_ids: number[];
  sources: string[];
  caissiers_list: string[];
  observations_list: string[];
  types_documents_list: string[];
  annees_list: string[];
}

export interface BoiteDetail {
  numero_boite: string;
  agence: {
    id: number;
    nom: string;
    code: string;
  };
  statistiques: {
    total_documents: number;
    types_documents: string[];
    caissiers: string[];
    annees: string[];
    periodes: {
      debut: string;
      fin: string;
    }
  };
  documents: Archive[];
  observations: string[];
}

export interface ArchiveResponse {
  success: boolean;
  data: Archive[];
  total: number;
  count: number;
}

export interface GroupedResponse {
  success: boolean;
  count: number;
  data: ArchiveGrouped[];
}

export interface SearchParams {
  type_document?: string;
  annee?: string;
  agence_nom?: string;
  numero_boite?: string;
  date_debut?: string;
  date_fin?: string;
  agence_id?: number;
}

// ─── ARCHIVES GROUPÉES ─────────────────────────────────────

export const getArchivesGrouped = async (params?: { 
  type_document?: string; 
  annee?: string; 
  agence_nom?: string;
  numero_boite?: string;
}): Promise<GroupedResponse> => {
  const response = await axios.get<GroupedResponse>(`${API_URL}/archives/grouped`, { params });
  return response.data;
};

export const getBoiteDetail = async (numeroBoite: string): Promise<{ success: boolean; data: BoiteDetail }> => {
  const response = await axios.get<{ success: boolean; data: BoiteDetail }>(`${API_URL}/archives/boite/${numeroBoite}/detail`);
  return response.data;
};

// ─── RECHERCHE ─────────────────────────────────────────────

export const searchArchives = async (params: SearchParams): Promise<ArchiveResponse> => {
  const response = await axios.get<ArchiveResponse>(`${API_URL}/archives/search`, { params });
  return response.data;
};

export const getAllArchives = async (limit?: number, offset?: number): Promise<ArchiveResponse> => {
  const response = await axios.get<ArchiveResponse>(`${API_URL}/archives`, { params: { limit, offset } });
  return response.data;
};

// ─── FILTRES ───────────────────────────────────────────────

export const getDocumentTypes = async (): Promise<string[]> => {
  const response = await axios.get<{ success: boolean; data: string[] }>(`${API_URL}/archives/types`);
  return response.data.data;
};

export const getAnnees = async (): Promise<string[]> => {
  const response = await axios.get<{ success: boolean; data: string[] }>(`${API_URL}/archives/annees`);
  return response.data.data;
};

// ─── SUPPRESSION ───────────────────────────────────────────

export const deleteArchive = async (id: number): Promise<boolean> => {
  const response = await axios.delete<{ success: boolean }>(`${API_URL}/archives/${id}`);
  return response.data.success;
};

export const deleteAllArchives = async (): Promise<boolean> => {
  const response = await axios.delete<{ success: boolean }>(`${API_URL}/archives/all`);
  return response.data.success;
};