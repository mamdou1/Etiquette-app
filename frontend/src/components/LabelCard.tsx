import React, { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LabelRecord, LabelSize, LabelValue } from "../types";

interface Props {
  record: LabelRecord;
  allFields: string[];
  visibleFields: string[];
  size: LabelSize;
  width?: number;
  boxNumber: string;
  isCaissier?: boolean;
}

// ─── MAPPING clés techniques → libellés d'affichage ──
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
};

// ─── HELPERS ────────────────────────────────────────────

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
  // Recherche directe
  if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
    return record[key];
  }

  // Recherche via KEY_MAPPING
  const displayName = KEY_MAPPING[key];
  if (displayName) {
    const found = findValue(record, [displayName]);
    if (found !== undefined) return found;
  }

  // Recherche avec normalisation
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

// ─── COMPOSANT ──────────────────────────────────────────

const fontScale: Record<LabelSize, number> = { sm: 0.85, md: 1, lg: 1.15 };

const LabelCard: React.FC<Props> = ({
  record,
  allFields,
  visibleFields,
  size,
  width,
  boxNumber,
  isCaissier = false,
}) => {
  const scale = fontScale[size];

  const displayFields = useMemo(() => {
    return getDisplayFields(record, visibleFields);
  }, [record, visibleFields]);

  // QR Code = TOUS les champs (même ceux non visibles)
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

  return (
    <div
      className={`label-card ${isCaissier ? "border-emerald-500 border-2" : ""}`}
      style={width ? { width } : undefined}
    >
      {/* En-tête avec N° Boîte */}
      <div className="mb-1 pb-1 border-b border-border flex items-center justify-between">
        <span className="font-mono font-bold text-primary text-sm">{boxNumber}</span>
        {isCaissier && (
          <span className="bg-emerald-500 text-white text-[8px] font-mono px-1.5 py-0.5 rounded">
            Caissier
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="font-mono text-[10px] text-muted italic">Aucune donnée disponible</p>
      ) : (
        <>
          {/* Champs visibles */}
          {displayFields.map(({ key, label, value }) => (
            <div
              key={key}
              className="mb-0.5 font-mono text-primary leading-snug flex items-baseline gap-1 min-w-0"
              style={{ fontSize: `${0.85 * scale}rem` }}
            >
              <span
                className="text-muted font-medium flex-shrink-0"
                style={{ fontSize: "0.6rem", letterSpacing: "0.05em" }}
              >
                {label}:
              </span>
              <span className="font-medium" style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                {value || "—"}
              </span>
            </div>
          ))}

          {/* QR Code */}
          <div className="mt-1 flex justify-end">
            <QRCodeSVG
              value={qrData}
              size={size === "sm" ? 40 : size === "lg" ? 60 : 50}
              fgColor="#1a1a2e"
              bgColor="#ffffff"
              level="M"
              includeMargin={false}
            />
          </div>
        </>
      )}

      {/* Pied */}
      <div className="mt-1 pt-1 border-t border-dashed border-border flex justify-between items-center">
        <span className="font-mono text-border" style={{ fontSize: "0.5rem" }}>{boxNumber}</span>
        <span className="font-mono text-border" style={{ fontSize: "0.45rem" }}>
          {Object.keys(record).filter(k => record[k] !== "").length} champs
        </span>
      </div>
    </div>
  );
};

export default LabelCard;