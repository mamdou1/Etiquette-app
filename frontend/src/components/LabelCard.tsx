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
  annee: "Année",
  année: "Année",
  agence: "Nom de l'Agence",
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

const LabelCard: React.FC<Props> = ({
  record,
  allFields,
  visibleFields,
  size,
  width,
  boxNumber,
  isCaissier = false,
}) => {
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
  const fieldCount = displayFields.length;

  // Taille du QR Code dynamique
  const qrSize = fieldCount <= 2 ? 70 : fieldCount <= 4 ? 60 : 50;

  // Styles pour les étiquettes
  const labelColors = [
    { bg: "bg-blue-50", border: "border-blue-200" },
    { bg: "bg-green-50", border: "border-green-200" },
    { bg: "bg-purple-50", border: "border-purple-200" },
    { bg: "bg-amber-50", border: "border-amber-200" },
  ];

  // Couleur basée sur le nombre de champs ou aléatoire
  const colorIndex = Math.min(fieldCount - 1, labelColors.length - 1);
  const color = labelColors[Math.max(0, colorIndex)];

  return (
    <div
      className={`label-card ${isCaissier ? "border-emerald-500 border-2 shadow-lg" : ""} ${color.bg} ${color.border}`}
      style={width ? { width } : undefined}
    >
      {/* En-tête avec N° Boîte en GROS ET GRAS */}
      <div className="mb-3 pb-2 border-b-2 border-border flex items-center justify-between">
        <span className="font-mono font-extrabold text-primary text-2xl tracking-tight">
          {boxNumber}
        </span>
        <div className="flex items-center gap-2">
          {isCaissier && (
            <span className="bg-emerald-500 text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shadow-sm">
              👤 Caissier
            </span>
          )}
          <span className="bg-accent/10 text-accent text-[9px] font-mono font-medium px-2 py-0.5 rounded-full border border-accent/20">
            {fieldCount} champs
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="font-mono text-sm text-muted italic text-center py-6">
          Aucune donnée disponible
        </p>
      ) : (
        <>
          {/* Champs visibles - TAILLE AUGMENTÉE ET STYLISÉE */}
          <div className="flex-1 space-y-2 py-2">
            {displayFields.map(({ key, label, value }) => (
              <div
                key={key}
                className="font-mono flex items-baseline gap-2 min-w-0 p-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
              >
                <span
                  className="text-muted font-semibold flex-shrink-0 text-sm tracking-wide uppercase"
                  style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}
                >
                  {label}:
                </span>
                <span
                  className="font-medium text-primary"
                  style={{ 
                    fontSize: "0.95rem",
                    whiteSpace: "normal", 
                    wordBreak: "break-word",
                    lineHeight: "1.4"
                  }}
                >
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* QR Code - Taille dynamique */}
          <div className="mt-2 flex justify-end">
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

      {/* Pied - style amélioré */}
      <div className="mt-2 pt-2 border-t-2 border-dashed border-border/60 flex justify-between items-center">
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