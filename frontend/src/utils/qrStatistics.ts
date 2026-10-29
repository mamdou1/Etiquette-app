import { LabelRecord } from "../types";

export interface QrStatisticsSettings {
  hiddenColumns: string[];
  enabled: boolean;
  columns: string[];
  excluded: Record<string, string[]>;
  pairingEnabled: boolean;
  pairingLabelField: string;
  pairingValueFields: string[];
  groupedEnabled: boolean;
  groupedPrimaryField: string;
  groupedSecondaryFields: string[];
  groupedValueField: string;
}
export const defaultQrStatistics: QrStatisticsSettings = {
  hiddenColumns: [],
  enabled: false,
  columns: [],
  excluded: {},
  pairingEnabled: false,
  pairingLabelField: "",
  pairingValueFields: [],
  groupedEnabled: false,
  groupedPrimaryField: "",
  groupedSecondaryFields: [],
  groupedValueField: "",
};
export function sourceRows(
  record: LabelRecord,
): Record<string, unknown>[] | null {
  try {
    const rows = JSON.parse(String(record.__sourceRows || "null"));
    return Array.isArray(rows) &&
      rows.length &&
      rows.every((row) => row && typeof row === "object" && !Array.isArray(row))
      ? rows
      : null;
  } catch {
    return null;
  }
}
export function countValues(
  rows: Record<string, unknown>[],
  field: string,
): Array<[string, number]> {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = String(row[field] ?? "").trim();
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts].sort(([a], [b]) =>
    a.localeCompare(b, "fr", { numeric: true }),
  );
}
function fieldLabel(
  field: string,
  labels: Array<{ name: string; label: string }>,
): string {
  return labels.find((label) => label.name === field)?.label || field;
}
function pairingValue(
  value: string,
  field: string,
  labels: Array<{ name: string; label: string }>,
): string {
  const fieldName = fieldLabel(field, labels)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const compactValue = value.replace(/[\s\u00a0]/g, "");
  if (
    /montant|somme|amount/.test(fieldName) &&
    /^-?\d+(?:[.,]\d+)?$/.test(compactValue)
  ) {
    const number = Number(compactValue.replace(",", "."));
    if (Number.isFinite(number))
      return new Intl.NumberFormat("fr-FR").format(number);
  }
  return value;
}
export function pairingText(
  record: LabelRecord,
  settings: QrStatisticsSettings = defaultQrStatistics,
  labels: Array<{ name: string; label: string }> = [],
): string {
  const hiddenColumns = settings.hiddenColumns || [];
  const visibleValueFields = settings.pairingValueFields.filter(
    (field) => !hiddenColumns.includes(field),
  );
  if (
    !settings.pairingEnabled ||
    !settings.pairingLabelField ||
    hiddenColumns.includes(settings.pairingLabelField) ||
    !visibleValueFields.length
  )
    return "";
  const rows = sourceRows(record);
  if (!rows)
    return "CORRESPONDANCE : indisponible (lignes de dossiers non conservées).";
  const pairs = rows
    .map((row) => ({
      label: String(row[settings.pairingLabelField] ?? "").trim(),
      values: visibleValueFields.map((field) => ({
        field,
        value: pairingValue(String(row[field] ?? "").trim(), field, labels),
      })),
    }))
    .filter((pair) => pair.label || pair.values.some(({ value }) => value));
  if (!pairs.length) return "";
  const heading = `${fieldLabel(settings.pairingLabelField, labels)} : ${visibleValueFields.map((field) => fieldLabel(field, labels)).join(", ")}`;
  const pairLines = pairs.flatMap((pair) => {
    const label = pair.label || "(Non renseigné)";
    if (pair.values.length === 1) {
      return [`• ${label} : ${pair.values[0].value || "(Non renseigné)"}`];
    }
    return [
      `• ${label}`,
      ...pair.values.map(({ field, value }) =>
        `  - ${fieldLabel(field, labels)} : ${value || "(Non renseigné)"}`,
      ),
    ];
  });
  return [
    heading,
    ...pairLines,
  ].join("\n");
}
export function statisticsText(
  record: LabelRecord,
  settings: QrStatisticsSettings = defaultQrStatistics,
  labels: Array<{ name: string; label: string }> = [],
): string {
  if (!settings.enabled || !settings.columns.length) return "";
  const rows = sourceRows(record);
  if (!rows)
    return "STATISTIQUES : indisponibles (lignes de dossiers non conservées).";
  const sections = settings.columns
    .filter(
      (field) =>
        !(settings.hiddenColumns || []).includes(field) &&
        !field.startsWith("_") &&
        rows.some((row) => Object.prototype.hasOwnProperty.call(row, field)),
    )
    .map((field) => {
      const values = countValues(rows, field).filter(
        ([value]) => !(settings.excluded[field] || []).includes(value),
      );
      return values.length
        ? [
            fieldLabel(field, labels) + " :",
            ...values.map(
              ([value, count]) => `• ${value || "(Non renseigné)"} : ${count}`,
            ),
          ].join("\n")
        : "";
    })
    .filter(Boolean);
  return sections.length ? "STATISTIQUES\n\n" + sections.join("\n\n") : "";
}

export function groupedStatisticsText(
  record: LabelRecord,
  settings: QrStatisticsSettings = defaultQrStatistics,
  labels: Array<{ name: string; label: string }> = [],
): string {
  const hiddenColumns = settings.hiddenColumns || [];
  const primaryField = settings.groupedPrimaryField || "";
  const secondaryFields = (settings.groupedSecondaryFields || []).filter(
    (field) => !hiddenColumns.includes(field),
  );
  const valueField = settings.groupedValueField || "";
  if (
    !settings.groupedEnabled ||
    !primaryField ||
    !valueField ||
    hiddenColumns.includes(primaryField) ||
    hiddenColumns.includes(valueField)
  ) return "";

  const rows = sourceRows(record);
  if (!rows)
    return "STATISTIQUES GROUPÉES : indisponibles (lignes de dossiers non conservées).";

  const groups = new Map<string, {
    primary: string;
    secondaryValues: string[];
    values: Map<string, number>;
  }>();

  rows.forEach((row) => {
    const primary = String(row[primaryField] ?? "").trim() || "(Non renseigné)";
    const secondaryValues = secondaryFields.map(
      (field) => String(row[field] ?? "").trim() || "(Non renseigné)",
    );
    const key = JSON.stringify([primary, ...secondaryValues]);
    const value = String(row[valueField] ?? "").trim() || "(Non renseigné)";
    if (!groups.has(key)) groups.set(key, { primary, secondaryValues, values: new Map() });
    const values = groups.get(key)!.values;
    values.set(value, (values.get(value) || 0) + 1);
  });

  const sections = [...groups.values()]
    .sort((left, right) => left.primary.localeCompare(right.primary, "fr", { numeric: true }))
    .map((group) => {
      const complementary = secondaryFields.map(
        (field, index) => `${fieldLabel(field, labels)} : ${group.secondaryValues[index]}`,
      );
      const emphasizedPrimary = group.primary.toLocaleUpperCase("fr-FR");
      const values = [...group.values].sort(([left], [right]) =>
        left.localeCompare(right, "fr", { numeric: true }),
      );
      return [
        `• ${emphasizedPrimary}`,
        ...complementary.map((information) => `  - ${information}`),
        ...values.map(([value, count]) => `  - ${value} : ${count}`),
      ].join("\n");
    });

  return sections.length
    ? `STATISTIQUES PAR ${fieldLabel(primaryField, labels).toUpperCase()}\n\n${sections.join("\n\n")}`
    : "";
}
