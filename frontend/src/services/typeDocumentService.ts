import { api } from './api';

export interface TypeDocument {
  id: number;
  nom: string;
  code: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  agence_ids: number[];
  agence_noms: string[];
  agence_count: number;
}

// ─── GET /api/types-document ──────────────────────────────────
export const getAllTypes = async (params?: { agence_id?: number; active?: boolean }) => {
  const response = await api.get<{ success: boolean; data: TypeDocument[]; count: number }>(
    '/types-document',
    { params }
  );
  return response.data;
};

// ─── GET /api/types-document?agence_id=xxx ────────────────────
export const getTypesByAgence = async (agenceId: number): Promise<{ success: boolean; data: TypeDocument[]; count: number }> => {
  const response = await api.get('/types-document', {
    params: { agence_id: agenceId, active: true }
  });
  return response.data;
};

// ─── GET /api/types-document/:id ──────────────────────────────
export const getTypeById = async (id: number) => {
  const response = await api.get<{ success: boolean; data: TypeDocument }>(
    `/types-document/${id}`
  );
  return response.data;
};

// ─── POST /api/types-document ─────────────────────────────────
export const createType = async (data: { nom: string; code?: string; description?: string; agence_ids?: number[] }) => {
  const response = await api.post<{ success: boolean; data: TypeDocument; message: string }>(
    '/types-document',
    data
  );
  return response.data;
};

// ─── ✅ POST /api/types-document/:id/assign ──────────────────
export const assignTypeToAgences = async (id: number, agence_ids: number[]) => {
  const response = await api.post<{ success: boolean; data: TypeDocument; message: string }>(
    `/types-document/${id}/assign`,
    { agence_ids }
  );
  return response.data;
};

// ─── PUT /api/types-document/:id ──────────────────────────────
export const updateType = async (id: number, data: { nom?: string; code?: string; description?: string; active?: boolean; agence_ids?: number[] }) => {
  const response = await api.put<{ success: boolean; data: TypeDocument; message: string }>(
    `/types-document/${id}`,
    data
  );
  return response.data;
};

// ─── DELETE /api/types-document/:id ───────────────────────────
export const deleteType = async (id: number) => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/types-document/${id}`
  );
  return response.data.success;
};

// ─── DELETE /api/types-document/:id/permanent ─────────────────
export const deleteTypePermanent = async (id: number) => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/types-document/${id}/permanent`
  );
  return response.data.success;
};