export type LabelValue = string | number | string[];

export interface LabelRecord {
  [key: string]: LabelValue;
}

export interface BoxGroup {
  boxNumber: string;
  records: LabelRecord[];
}

export interface UploadBoxResponse {
  filename: string;
  total: number;
  boxes: BoxGroup[];
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  total: number;
  fields: string[];
  data: LabelRecord[];
  savedCount?: number;
  enriched?: boolean;
  agenceTrouvees?: string[];
  nouvellesAgences?: string[];
  originalCount?: number;
  enrichedCount?: number;
}

export type ColumnCount = 2 | 3 | 4;
export type LabelSize = "sm" | "md" | "lg";

export interface FieldFilter {
  value?: string;
  from?: string;
  to?: string;
}

export type FieldFilters = Record<string, FieldFilter>;

export interface PrintSettings {
  cols: ColumnCount;
  size: LabelSize;
  visibleFields: string[];
}

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

export interface FontSize {
  labelSize: number;   // 8-24px
  valueSize: number;   // 10-36px
  qrSize: number;      // 30-120px
}

export interface FontStyle {
  labelWeight: 'normal' | 'semibold' | 'bold';
  valueWeight: 'normal' | 'semibold' | 'bold';
  labelItalic: boolean;
  valueItalic: boolean;
}