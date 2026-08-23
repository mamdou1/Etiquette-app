import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LabelRecord, LabelSize, LabelValue } from "../types";
import { useSettings } from "../contexts/SettingsContext";

interface Props {
  record: LabelRecord;
  allFields: string[];
  visibleFields: string[];
  size: LabelSize;
  width?: number;
  boxNumber: string;
  isCaissier?: boolean;
}

const KEY_MAPPING: Record<string, string> = {
  boxNumber: "N° Boîte",
  box: "N° Boîte",
  boite: "N° Boîte",
  boîte: "N° Boîte",
  num_box: "N° Boîte",
  no_box: "N° Boîte",
  numero: "N° Boîte",
  numéro: "N° Boîte",
  date: "Date",
  jour: "Date",
  type: "Type",
  typ: "Type",
  caissier: "Caissiers",
  caissiers: "Caissiers",
  caissiere: "Caissiers",
  preparateur: "Caissiers",
  prep: "Caissiers",
  observation: "Observation",
  obs: "Observation",
  remarque: "Observation",
  note: "Note",
  annee: "Année",
  année: "Année",
  agence: "Nom de l'Agence",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findValue(record: LabelRecord, possibleKeys: string[]): LabelValue | undefined {
  for (const key of possibleKeys) {
    const normalizedKey = normalizeText(key);
    for (const recordKey of Object.keys(record)) {
      if (normalizeText(recordKey) === normalizedKey) {
        const val = record[recordKey];
        if (val !== undefined && val !== null && val !== "") {
          return val;
        }
      }
    }
  }
  return undefined;
}

function getValue(record: LabelRecord, key: string): LabelValue | undefined {
  if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
    return record[key];
  }

  const displayName = KEY_MAPPING[key];
  if (displayName) {
    const found = findValue(record, [displayName]);
    if (found !== undefined) return found;
  }

  const normalized = normalizeText(key);
  for (const recordKey of Object.keys(record)) {
    if (normalizeText(recordKey) === normalized) {
      const val = record[recordKey];
      if (val !== undefined && val !== null && val !== "") {
        return val;
      }
    }
  }

  return undefined;
}

function formatValue(value: LabelValue): string {
  if (Array.isArray(value)) {
    return value.filter(v => v && v.toString().trim()).join(", ");
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return String(value);
}

function getDisplayKey(rawKey: string): string {
  return KEY_MAPPING[normalizeText(rawKey)] || rawKey;
}

function getDisplayFields(record: LabelRecord, visibleFields: string[]): { key: string; label: string; value: string }[] {
  const result: { key: string; label: string; value: string }[] = [];

  for (const field of visibleFields) {
    const value = getValue(record, field);
    if (value !== undefined && value !== null && value !== "") {
      result.push({
        key: field,
        label: getDisplayKey(field),
        value: formatValue(value),
      });
    }
  }

  return result;
}

const LabelCard: React.FC<Props> = ({
  record,
  allFields,
  visibleFields,
  size,
  width,
  boxNumber,
  isCaissier = false,
}) => {
  const { fontSize, fontStyle } = useSettings();

  const displayFields = useMemo(() => {
    return getDisplayFields(record, visibleFields);
  }, [record, visibleFields]);

  const qrData = useMemo(() => {
    const lines: string[] = [`N° Boîte: ${boxNumber}`];
    for (const field of allFields) {
      const value = getValue(record, field);
      if (value !== undefined && value !== null && value !== "") {
        lines.push(`${getDisplayKey(field)}: ${formatValue(value)}`);
      }
    }
    return lines.join(" | ");
  }, [record, allFields, boxNumber]);

  const hasData = displayFields.length > 0;
  const fieldCount = displayFields.length;

  // ─── Tailles dynamiques ──────────────────────────────────────
  const getLabelSize = () => {
    if (fieldCount <= 2) return `${fontSize.labelSize + 6}px`;
    if (fieldCount <= 4) return `${fontSize.labelSize + 4}px`;
    return `${fontSize.labelSize}px`;
  };

  const getValueSize = () => {
    if (fieldCount <= 2) return `${fontSize.valueSize + 8}px`;
    if (fieldCount <= 4) return `${fontSize.valueSize + 4}px`;
    return `${fontSize.valueSize}px`;
  };

  const qrSize = fieldCount <= 2 ? fontSize.qrSize + 20 : fieldCount <= 4 ? fontSize.qrSize + 10 : fontSize.qrSize;

  const labelSize = getLabelSize();
  const valueSize = getValueSize();

  // ─── Styles de police ──────────────────────────────────────
  const labelWeightClass = fontStyle.labelWeight === 'bold' ? 'font-bold' : fontStyle.labelWeight === 'semibold' ? 'font-semibold' : 'font-normal';
  const valueWeightClass = fontStyle.valueWeight === 'bold' ? 'font-bold' : fontStyle.valueWeight === 'semibold' ? 'font-semibold' : 'font-normal';
  const labelItalicClass = fontStyle.labelItalic ? 'italic' : '';
  const valueItalicClass = fontStyle.valueItalic ? 'italic' : '';

  const labelColors = [
    { bg: "bg-blue-50", border: "border-blue-200" },
    { bg: "bg-green-50", border: "border-green-200" },
    { bg: "bg-purple-50", border: "border-purple-200" },
    { bg: "bg-amber-50", border: "border-amber-200" },
  ];

  const colorIndex = Math.min(fieldCount - 1, labelColors.length - 1);
  const color = labelColors[Math.max(0, colorIndex)];

  return (
    <div
      className={`label-card ${isCaissier ? "border-emerald-500 border-2 shadow-lg" : ""} ${color.bg} ${color.border}`}
      style={width ? { width } : undefined}
    >
      <div className="mb-2 pb-2 border-b-2 border-border flex items-center justify-between">
        <span className="font-mono font-extrabold text-primary text-xl tracking-tight">
          N° de la boîte: {boxNumber}
        </span>
        <div className="flex items-center gap-2">
          {isCaissier && (
            <span className="bg-emerald-500 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shadow-sm">
              👤 Caissier
            </span>
          )}
        </div>
      </div>

      {!hasData ? (
        <p className="font-mono text-sm text-muted italic text-center py-6">
          Aucune donnée disponible
        </p>
      ) : (
        <>
          <div className="flex-1 space-y-1.5 py-1">
            {displayFields.map(({ key, label, value }) => (
              <div
                key={key}
                className="font-mono flex items-baseline gap-1.5 min-w-0 p-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
              >
                <span
                  className={`text-muted ${labelWeightClass} ${labelItalicClass} flex-shrink-0`}
                  style={{ fontSize: labelSize, letterSpacing: "0.09em" }}
                >
                  {label}:
                </span>
                <span
                  className={`text-primary ${valueWeightClass} ${valueItalicClass}`}
                  style={{ fontSize: valueSize, whiteSpace: "normal", wordBreak: "break-word" }}
                >
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-1 flex justify-end">
            <div className="bg-white p-1 rounded shadow-sm border border-border/30">
              <QRCodeSVG
                value={qrData}
                size={qrSize}
                fgColor="#1a1a2e"
                bgColor="#ffffff"
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-1 pt-1 border-t border-dashed border-border/60 flex justify-between items-center">
        <span className="font-mono text-muted/50 font-bold" style={{ fontSize: "0.5rem", letterSpacing: "0.05em" }}>
          {boxNumber}
        </span>
        <span className="font-mono text-muted/40" style={{ fontSize: "0.45rem" }}>
          {new Date().toLocaleDateString("fr-FR")}
        </span>
      </div>
    </div>
  );
};

export default LabelCard;