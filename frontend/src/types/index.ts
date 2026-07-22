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