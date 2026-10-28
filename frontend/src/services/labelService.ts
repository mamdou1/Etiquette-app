import { api } from './api';
import { LabelRecord } from '../types';

export interface StoredLabel {
  id: number;
  previousNumeroBoite?: string;
  agence_id: number;
  type_document_id: number;
  numero_boite: string;
  annee: string;
  boxField: string;
  rows: Array<Record<string, string | number | null>>;
  metaValues: Record<string, string>;
  revision: number;
  qrEnabled: boolean | null;
  qrSize: number | null;
}
export const labelToRecord = (label: StoredLabel): LabelRecord => ({
  ...label.metaValues,
  numero_boite: label.numero_boite,
  annee: label.annee,
  __labelId: String(label.id),
  __agenceId: String(label.agence_id),
  __typeId: String(label.type_document_id),
  __boxField: label.boxField,
  __sourceRows: JSON.stringify(label.rows),
  __dossierCount: String(Array.isArray(label.rows) ? label.rows.length : 1),
  __qrEnabled: label.qrEnabled === null ? '' : String(label.qrEnabled),
  __qrSize: label.qrSize === null ? '' : String(label.qrSize),
});
export async function listLabels(agencyId: number): Promise<StoredLabel[]> {
  return (await api.get('/labels', { params: { agence_id: agencyId } })).data.data;
}
export async function loadLabel(record: LabelRecord): Promise<StoredLabel> {
  if (record.__labelId) return (await api.get(`/labels/${record.__labelId}`)).data.data;
  return (await api.post('/labels/resolve', {
    agence_id: Number(record.__agenceId), type_document_id: Number(record.__typeId), numero_boite: record.numero_boite,
  })).data.data;
}
export async function saveLabel(label: StoredLabel): Promise<StoredLabel> {
  return (await api.put(`/labels/${label.id}`, {
    numero_boite: label.numero_boite, annee: label.annee, rows: label.rows,
    qrEnabled: label.qrEnabled, qrSize: label.qrSize, revision: label.revision,
  })).data.data;
}
