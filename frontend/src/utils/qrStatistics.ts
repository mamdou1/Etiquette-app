import { LabelRecord } from '../types';

export interface QrStatisticsSettings {
  enabled: boolean;
  columns: string[];
  excluded: Record<string, string[]>;
}
export const defaultQrStatistics: QrStatisticsSettings = { enabled: false, columns: [], excluded: {} };
export function sourceRows(record: LabelRecord): Record<string, unknown>[] | null {
  try {
    const rows = JSON.parse(String(record.__sourceRows || 'null'));
    return Array.isArray(rows) && rows.length && rows.every(row => row && typeof row === 'object' && !Array.isArray(row)) ? rows : null;
  } catch { return null; }
}
export function countValues(rows: Record<string, unknown>[], field: string): Array<[string, number]> {
  const counts = new Map<string, number>();
  rows.forEach(row => {
    const value = String(row[field] ?? '').trim();
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts].sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }));
}
export function statisticsText(record: LabelRecord, settings: QrStatisticsSettings = defaultQrStatistics,
  labels: Array<{ name: string; label: string }> = []): string {
  if (!settings.enabled || !settings.columns.length) return '';
  const rows = sourceRows(record);
  if (!rows) return 'STATISTIQUES : indisponibles (lignes de dossiers non conservées).';
  const sections = settings.columns.filter(field => !field.startsWith('_') && rows.some(row => Object.prototype.hasOwnProperty.call(row, field)))
    .map(field => {
      const values = countValues(rows, field).filter(([value]) => !(settings.excluded[field] || []).includes(value));
      return values.length ? [(labels.find(label => label.name === field)?.label || field) + ' :',
        ...values.map(([value, count]) => `• ${value || '(Non renseigné)'} : ${count}`)].join('\n') : '';
    }).filter(Boolean);
  return sections.length ? 'STATISTIQUES\n\n' + sections.join('\n\n') : '';
}
