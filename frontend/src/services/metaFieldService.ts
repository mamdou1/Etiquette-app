import { api } from './api';

export interface MetaField {
  id: number;
  type_document_id: number;
  name: string;
  label: string;
  field_type: string;
  position: number;
  required: boolean;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

// ─── GET /api/types-document/:typeId/meta-fields ────────────
export const getMetaFieldsByType = async (typeId: number) => {
  const response = await api.get<{ success: boolean; data: MetaField[]; count: number }>(
    `/types-document/${typeId}/meta-fields`
  );
  return response.data;
};

// ─── GET /api/meta-fields/:id ─────────────────────────────────
export const getMetaFieldById = async (id: number) => {
  const response = await api.get<{ success: boolean; data: MetaField }>(
    `/meta-fields/${id}`
  );
  return response.data;
};

// ─── POST /api/types-document/:typeId/meta-fields ─────────────
export const createMetaField = async (typeId: number, data: Partial<MetaField>) => {
  const response = await api.post<{ success: boolean; data: MetaField; message: string }>(
    `/types-document/${typeId}/meta-fields`,
    data
  );
  return response.data;
};

// ─── ✅ POST /api/types-document/:typeId/meta-fields/batch ──
export const createMetaFieldsBatch = async (typeId: number, fields: Partial<MetaField>[]) => {
  const response = await api.post<{ success: boolean; count: number; data: MetaField[]; message: string }>(
    `/types-document/${typeId}/meta-fields/batch`,
    { fields }
  );
  return response.data;
};

// ─── PUT /api/meta-fields/:id ──────────────────────────────────
export const updateMetaField = async (id: number, data: Partial<MetaField>) => {
  const response = await api.put<{ success: boolean; data: MetaField; message: string }>(
    `/meta-fields/${id}`,
    data
  );
  return response.data;
};

// ─── DELETE /api/meta-fields/:id ──────────────────────────────
export const deleteMetaField = async (id: number) => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/meta-fields/${id}`
  );
  return response.data.success;
};

// ─── DELETE /api/meta-fields/:id/permanent ────────────────────
export const deleteMetaFieldPermanent = async (id: number) => {
  const response = await api.delete<{ success: boolean; message: string }>(
    `/meta-fields/${id}/permanent`
  );
  return response.data.success;
};