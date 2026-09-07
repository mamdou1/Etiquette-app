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
  metaFields?: Array<{ name: string; label: string; field_type: string }>;
}

const LabelCard: React.FC<Props> = ({
  record,
  allFields,
  visibleFields,
  size,
  width,
  boxNumber,
  isCaissier = false,
  metaFields = [],
}) => {
  const { fontSize, fontStyle } = useSettings();

  // ─── Helper pour récupérer la valeur ──────────────────────
  const getFieldValue = (key: string): string => {
    // 1. Direct dans record
    if (
      record[key] !== undefined &&
      record[key] !== null &&
      record[key] !== ""
    ) {
      return formatValue(record[key]);
    }

    // 2. Dans metaValues - FIX TS ICI
    const meta = record.metaValues as Record<string, any> | undefined;
    if (
      meta?.[key] !== undefined &&
      meta?.[key] !== null &&
      meta?.[key] !== ""
    ) {
      return formatValue(meta[key]);
    }

    // 3. Fallback avec normalize pour upload direct
    const val = getValue(record, key);
    return val !== undefined && val !== null && val !== ""
      ? formatValue(val)
      : "";
  };

  // ─── Récupération du nom de l'agence ──────────────────────
  const agenceValue = useMemo(() => {
    // Liste complète des noms possibles pour l'agence
    const agenceKeys = [
      "Nom de l' Agence",
      "Nom de l'Agence",
      "Nom Agence",
      "agence",
      "Agence",
      "agence_nom",
      "nom_agence",
      "nom",
      "DGEI",
      "dgei",
      "agence_nom_agence",
      "libelle_agence"
    ];
    
    // 1. Chercher par les clés exactes
    for (const key of agenceKeys) {
      const value = getFieldValue(key);
      if (value) return value;
    }
    
    // 2. Chercher dans visibleFields
    for (const field of visibleFields) {
      const lowerField = field.toLowerCase();
      if (lowerField.includes("agence") || lowerField.includes("dgei") || 
          lowerField.includes("nom") || lowerField.includes("agence")) {
        const value = getFieldValue(field);
        if (value) return value;
      }
    }
    
    // 3. Chercher dans metaFields
    if (metaFields.length > 0) {
      for (const mf of metaFields) {
        const lowerLabel = mf.label.toLowerCase();
        const lowerName = mf.name.toLowerCase();
        if (lowerLabel.includes("agence") || lowerName.includes("agence") ||
            lowerLabel.includes("dgei") || lowerName.includes("dgei") ||
            lowerLabel.includes("nom") || lowerName.includes("nom")) {
          const value = getFieldValue(mf.name) || getFieldValue(mf.label);
          if (value) return value;
        }
      }
    }
    
    // 4. Chercher dans tous les champs du record
    for (const key of Object.keys(record)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes("agence") || lowerKey.includes("dgei") || 
          lowerKey.includes("nom")) {
        const value = getFieldValue(key);
        if (value) return value;
      }
    }
    
    return "";
  }, [record, visibleFields, metaFields]);

  // ─── Récupération des valeurs (EXCLURE l'agence) ─────────
  const displayValues = useMemo(() => {
    const result: string[] = [];

    if (metaFields.length > 0) {
      for (const mf of metaFields) {
        const isVisible =
          visibleFields.includes(mf.name) || visibleFields.includes(mf.label);
        if (!isVisible) continue;

        const value = getFieldValue(mf.name) || getFieldValue(mf.label);
        
        // Vérifier si c'est l'agence
        const isAgence = value === agenceValue && agenceValue !== "" && 
          (mf.name.toLowerCase().includes("agence") || 
           mf.label.toLowerCase().includes("agence") ||
           mf.name.toLowerCase().includes("dgei") ||
           mf.label.toLowerCase().includes("dgei") ||
           mf.name.toLowerCase().includes("nom") ||
           mf.label.toLowerCase().includes("nom"));
        
        if (value && !isAgence) {
          result.push(value);
        }
      }
      return result;
    }

    for (const field of visibleFields) {
      const value = getFieldValue(field);
      const isAgence = value === agenceValue && agenceValue !== "" && 
        (field.toLowerCase().includes("agence") || 
         field.toLowerCase().includes("dgei") ||
         field.toLowerCase().includes("nom"));
      
      if (value && !isAgence) {
        result.push(value);
      }
    }

    return result;
  }, [record, visibleFields, metaFields, agenceValue]);

  // ─── Données QR ────────────────────────────────────────────
  const qrData = useMemo(() => {
    const lines: string[] = [`N° Boîte: ${boxNumber}`];

    const fieldsToUse =
      metaFields.length > 0
        ? metaFields
        : allFields.map((f) => ({ name: f, label: f, field_type: "text" }));

    for (const field of fieldsToUse) {
      const value = getFieldValue(field.name) || getFieldValue(field.label);
      if (value) {
        lines.push(`${field.label}: ${value}`);
      }
    }
    return lines.join(" | ");
  }, [record, allFields, boxNumber, metaFields]);

  const hasData = displayValues.length > 0;
  const fieldCount = displayValues.length;

  // ─── Tailles ──────────────────────────────────────────────
  const getValueSize = () => {
    if (fieldCount <= 2) return `${fontSize.valueSize + 14}px`;
    if (fieldCount <= 4) return `${fontSize.valueSize + 8}px`;
    return `${fontSize.valueSize}px`;
  };

  const qrSize =
    fieldCount <= 2
      ? fontSize.qrSize + 35
      : fieldCount <= 4
        ? fontSize.qrSize + 20
        : fontSize.qrSize;

  const valueSize = getValueSize();

  const valueWeightClass =
    fontStyle.valueWeight === "bold"
      ? "font-bold"
      : fontStyle.valueWeight === "semibold"
        ? "font-semibold"
        : "font-normal";

  const valueItalicClass = fontStyle.valueItalic ? "italic" : "";

  // ─── Couleurs ─────────────────────────────────────────────
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
      {/* NOM DE L'AGENCE en haut - Utilise agenceSize */}
      {agenceValue && (
        <div className="text-center mb-3 pb-2 border-b-2 border-border/60">
          <span
            className="font-mono font-extrabold text-primary tracking-wider"
            style={{ 
              fontSize: `${fontSize.agenceSize}px`, 
              letterSpacing: "0.15em",
              lineHeight: "1.3",
              display: "block"
            }}
          >
            {agenceValue}
          </span>
        </div>
      )}

      {!hasData ? (
        <p className="font-mono text-sm text-muted italic text-center py-6">
          Aucune donnée disponible
        </p>
      ) : (
        <>
          {/* Valeurs centrales - Utilise valueSize */}
          <div className="flex-1 space-y-1.5 py-1 text-center">
            {displayValues.map((value, index) => {
              // Vérifier si la valeur est le numéro de boîte
              // On compare avec boxNumber pour ajouter "Boite N°" devant
              const isBoxNumber = value === boxNumber;
              
              return (
                <div
                  key={index}
                  className="font-mono p-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
                >
                  <span
                    className={`text-primary ${valueWeightClass} ${valueItalicClass}`}
                    style={{
                      fontSize: valueSize,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
                    {isBoxNumber ? `Boite N° ${value}` : value || "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* QR Code en bas */}
          <div className="mt-1 flex justify-center">
            <div className="bg-white p-1 rounded shadow-sm border-border/30">
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
    </div>
  );
};

// ─── Fonctions utilitaires ────────────────────────────────
function formatValue(value: LabelValue): string {
  if (Array.isArray(value)) {
    return value.filter((v) => v && v.toString().trim()).join(", ");
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return String(value);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function getDisplayKey(rawKey: string): string {
  return KEY_MAPPING[normalizeText(rawKey)] || rawKey;
}

function findValue(
  record: LabelRecord,
  possibleKeys: string[],
): LabelValue | undefined {
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

export default LabelCard;