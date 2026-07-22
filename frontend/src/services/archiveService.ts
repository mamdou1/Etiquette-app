import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export interface Archive {
  id?: number;
  numero_boite: string;
  agence_id: number;
  agence_nom: string;
  date_production: string;
  type_document: string;
  caissiers: string;
  annee: string;
  observation?: string;
  source: string;
  uploaded_at?: Date;
  created_at?: Date;
}

export interface ArchiveResponse {
  success: boolean;
  data: Archive[];
  total: number;
  count: number;
}

export interface SearchParams {
  type_document?: string;
  annee?: string;
  agence_nom?: string;
  numero_boite?: string;
  date_debut?: string;
  date_fin?: string;
}

export const searchArchives = async (params: SearchParams): Promise<ArchiveResponse> => {
  const response = await axios.get<ArchiveResponse>(`${API_URL}/archives/search`, { params });
  return response.data;
};

export const getAllArchives = async (limit?: number, offset?: number): Promise<ArchiveResponse> => {
  const response = await axios.get<ArchiveResponse>(`${API_URL}/archives`, { params: { limit, offset } });
  return response.data;
};

export const getDocumentTypes = async (): Promise<string[]> => {
  const response = await axios.get<{ success: boolean; data: string[] }>(`${API_URL}/archives/types`);
  return response.data.data;
};

export const getAnnees = async (): Promise<string[]> => {
  const response = await axios.get<{ success: boolean; data: string[] }>(`${API_URL}/archives/annees`);
  return response.data.data;
};

export const deleteArchive = async (id: number): Promise<boolean> => {
  const response = await axios.delete<{ success: boolean }>(`${API_URL}/archives/${id}`);
  return response.data.success;
};

export const deleteAllArchives = async (): Promise<boolean> => {
  const response = await axios.delete<{ success: boolean }>(`${API_URL}/archives/all`);
  return response.data.success;
};