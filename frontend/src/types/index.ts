// Types partagés dans toute l'application

export interface LabelRecord {
  [key: string]: string | number;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  total: number;
  fields: string[];
  data: LabelRecord[];
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
