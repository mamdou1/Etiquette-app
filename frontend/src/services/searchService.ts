import { api } from './api';

export interface SearchFilters {
  agence?: string;
  type?: string;
  annee?: string;
  numero_boite?: string;
  valeur?: string;
  agence_id?: number;
  type_document_id?: number;
  rayon?: string;        // ✅ NOUVEAU
  travers?: string;      // ✅ NOUVEAU
  date_debut?: string;   // ✅ NOUVEAU - Format YYYY-MM-DD
  date_fin?: string;     // ✅ NOUVEAU - Format YYYY-MM-DD
}

export interface MetaValue {
  label: string;
  field_type: string;
  value: string;
}

export interface Boite {
  numero_boite: string;
  metaValues: Record<string, MetaValue>;
}

export interface Annee {
  annee: string;
  boites: Boite[];
  total_boites: number;
  total_documents: number;
}

export interface TypeResult {
  id: number;
  nom: string;
  annees: Annee[];
  total_boites: number;
  total_documents: number;
}

export interface AgenceResult {
  id: number;
  nom: string;
  types: TypeResult[];
  total_boites: number;
  total_documents: number;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  data: AgenceResult[];
  filters: SearchFilters;
}

export interface FilterOptions {
  agences: { id: number; nom: string }[];
  types: { id: number; nom: string }[];
  annees: string[];
  rayons: string[];      // ✅ NOUVEAU
  travers: string[];     // ✅ NOUVEAU
}

// ─── GET /api/search ──────────────────────────────────────────
export const search = async (filters: SearchFilters): Promise<SearchResponse> => {
  // ✅ Nettoyer les filtres vides avant envoi
  const cleanFilters: Record<string, any> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanFilters[key] = value;
    }
  });

  const response = await api.get<SearchResponse>('/search', { params: cleanFilters });
  return response.data;
};

// ─── GET /api/search/boite ────────────────────────────────────
export const getBoiteDetail = async (agenceId: number, typeDocumentId: number, numeroBoite: string) => {
  const response = await api.get('/search/boite', {
    params: { 
      agence_id: agenceId, 
      type_document_id: typeDocumentId, 
      numero_boite: numeroBoite 
    }
  });
  return response.data;
};

// ─── GET /api/search/filters ──────────────────────────────────
export const getFilterOptions = async (): Promise<{ success: boolean; data: FilterOptions }> => {
  const response = await api.get('/search/filters');
  return response.data;
};