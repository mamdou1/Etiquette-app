export type LabelValue = string | number | string[];

export interface LabelRecord {
  [key: string]: LabelValue;
}

export interface BoxGroup {
  boxNumber: string;
  records: LabelRecord[];
  year?: string; // ✅ Année de la boîte
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
  availableYears?: string[]; // ✅ AJOUT
  yearData?: { [year: string]: LabelRecord[] }; // ✅ AJOUT
  sheets?: string[]; // ✅ AJOUT
  totalRows?: number; // ✅ AJOUT
}

export type ColumnCount = 2 | 3 | 4;
export type LabelSize = "sm" | "md" | "lg";
export type LabelsPerPage = 2 | 3;

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
  labelsPerPage: LabelsPerPage;
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
  agenceSize: number;  // 20-48px
}

export interface FontStyle {
  labelWeight: 'normal' | 'semibold' | 'bold';
  valueWeight: 'normal' | 'semibold' | 'bold';
  labelItalic: boolean;
  valueItalic: boolean;
}

// ✅ NOUVEAU - Types pour la recherche / archivage physique

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