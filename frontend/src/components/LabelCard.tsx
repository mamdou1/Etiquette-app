import { statisticsText } from '../utils/qrStatistics';
import LabelEditorModal from './LabelEditorModal';
import { labelToRecord, StoredLabel } from '../services/labelService';
import React, { useMemo, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { isBoxField, resolveBoxNumber } from "../utils/boxField";
import { createPortal } from "react-dom";
import BoxDetailsTable from "./BoxDetailsTable";
import { LabelRecord, LabelSize, LabelValue } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import formatProductionDates from "../utils/formatProductionDates";
import { splitQrContent } from "../utils/qrParts";
import { joinLabelFieldRange } from "../utils/labelFieldRange";

interface Props {
  onLabelSaved?: (label: StoredLabel) => void;
  record: LabelRecord;
  allFields: string[];
  visibleFields: string[];
  size: LabelSize;
  width?: number;
  boxNumber: string;
  boxField?: string;
  isCaissier?: boolean;
  metaFields?: Array<{ name: string; label: string; field_type: string }>;
}

const LabelCard: React.FC<Props> = ({
  record: sourceRecord,
  onLabelSaved,
  allFields,
  visibleFields,
  size,
  width,
  boxNumber: suppliedBoxNumber,
  boxField,
  isCaissier = false,
  metaFields = [],
}) => {
  const [record, setRecord] = useState(sourceRecord);
  const [editing, setEditing] = useState(false);
  useEffect(() => setRecord(current => current === sourceRecord ? current : sourceRecord), [sourceRecord]);
  const editable = Boolean(record.__labelId || (record.__agenceId && record.__typeId));
  const boxNumber = resolveBoxNumber(record, suppliedBoxNumber);
  const isNumberField = (name: string) => {
    const field = metaFields.find(
      (field) => field.name === name || field.label === name,
    );
    return (
      isBoxField(name) ||
      Boolean(field && (isBoxField(field.name) || isBoxField(field.label))) ||
      (name === boxField && !Object.keys(record).some(isBoxField))
    );
  };
  const {
    fontSize,
    fontStyle,
    fontFamily,
    showQr: globalShowQr,
    valueSpacing,
    boxPrefix,
    fieldRange,
    qrStatistics,
  } = useSettings();
  const showQr = record.__qrEnabled === 'true' ? true : record.__qrEnabled === 'false' ? false : globalShowQr;
  const displayBoxPrefix = boxPrefix.trim() || "Boîte N°";

  // ─── Helper pour récupérer la valeur  ──────────────────────
  const getFieldValue = (key: string): string => {
    // 1. Direct dans record
    if (
      record[key] !== undefined &&
      record[key] !== null &&
      record[key] !== ""
    ) {
      return formatValue(record[key]);
    }

    // 2. Dans metaValues
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
      "Non Agence",
      "libelle_agence",
    ];

    for (const key of agenceKeys) {
      const value = getFieldValue(key);
      if (value) return value;
    }

    for (const field of visibleFields) {
      const lowerField = field.toLowerCase();
      if (
        lowerField.includes("agence") ||
        lowerField.includes("dgei") ||
        lowerField.includes("nom")
      ) {
        const value = getFieldValue(field);
        if (value) return value;
      }
    }

    if (metaFields.length > 0) {
      for (const mf of metaFields) {
        const lowerLabel = mf.label.toLowerCase();
        const lowerName = mf.name.toLowerCase();
        if (
          lowerLabel.includes("agence") ||
          lowerName.includes("agence") ||
          lowerLabel.includes("dgei") ||
          lowerName.includes("dgei") ||
          lowerLabel.includes("nom") ||
          lowerName.includes("nom")
        ) {
          const value = getFieldValue(mf.name) || getFieldValue(mf.label);
          if (value) return value;
        }
      }
    }

    for (const key of Object.keys(record)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("agence") ||
        lowerKey.includes("dgei") ||
        lowerKey.includes("nom")
      ) {
        const value = getFieldValue(key);
        if (value) return value;
      }
    }

    return "";
  }, [record, visibleFields, metaFields]);

  // ─── Récupération des valeurs (EXCLURE l'agence) ─────────
  const displayValues = useMemo(() => {
    const result: Array<{ name: string; value: string }> = [];
    const finish = () => {
      const boxFields = result.filter((field) => isNumberField(field.name));
      const preferred =
        boxFields.find(
          (field) =>
            field.name !== "numero_boite" && field.name !== "boxNumber",
        ) || boxFields[0];
      const unique = result
        .filter((field) => !isNumberField(field.name) || field === preferred)
        .map((field) =>
          isNumberField(field.name) ? { ...field, value: boxNumber } : field,
        );
      return joinLabelFieldRange(unique, fieldRange);
    };

    if (metaFields.length > 0) {
      // Respecter exactement l'ordre et les champs cochés du panneau,
      // y compris le numéro de boîte qui n'est pas toujours un MetaField.
      for (const fieldName of visibleFields) {
        const mf = metaFields.find(
          (field) => field.name === fieldName || field.label === fieldName,
        );
        const name = mf?.name || fieldName;
        const label = mf?.label || fieldName;
        const value = getFieldValue(name) || getFieldValue(label);

        const isAgence =
          value === agenceValue &&
          agenceValue !== "" &&
          (name.toLowerCase().includes("agence") ||
            label.toLowerCase().includes("agence") ||
            name.toLowerCase().includes("dgei") ||
            label.toLowerCase().includes("dgei") ||
            name.toLowerCase().includes("nom") ||
            label.toLowerCase().includes("nom"));

        if (value && !isAgence) {
          result.push({ name: fieldName, value });
        }
      }
      return finish();
    }

    for (const field of visibleFields) {
      const value = getFieldValue(field);
      const isAgence =
        value === agenceValue &&
        agenceValue !== "" &&
        (field.toLowerCase().includes("agence") ||
          field.toLowerCase().includes("dgei") ||
          field.toLowerCase().includes("nom"));

      if (value && !isAgence) {
        result.push({ name: field, value });
      }
    }

    return finish();
  }, [
    record,
    visibleFields,
    metaFields,
    agenceValue,
    fieldRange,
    boxNumber,
    boxField,
  ]);

  // ─── Données QR ────────────────────────────────────────────
  const qrData = useMemo(() => {
    const qrLabel = (name: string, label: string) => {
      const isAgence = [name, label].some((value) =>
        /^(agence|nomagence|agencenom|nomdelagence)$/.test(
          normalizeText(value).replace(/[^a-z0-9]/g, ""),
        ),
      );
      return isAgence ? "Service Producteur" : label;
    };
    const lines: string[] = [
      `• N° Boîte : ${boxNumber}`,
      `• Nombre de dossiers : ${Math.max(1, Number(record.__dossierCount) || 1)}`,
    ];

    const fieldsToUse =
      metaFields.length > 0
        ? metaFields
        : allFields.map((f) => ({ name: f, label: f, field_type: "text" }));

    for (const field of fieldsToUse) {
      // Le numéro est déjà présent en tête du QR, même si le fichier
      // l'expose aussi comme champ sous un autre libellé.
      const isBoxNumberField = [field.name, field.label].some(isBoxField);
      if (isBoxNumberField) continue;

      const value = getFieldValue(field.name) || getFieldValue(field.label);
      if (value) {
        lines.push(
          `• ${qrLabel(field.name, field.label)} : ${value.replace(/[\r\n]+/g, ", ")}`,
        );
      }
    }
    const summary = statisticsText(record, qrStatistics, metaFields);
    if (summary) lines.push(summary);
    return lines.join("\n\n");
  }, [record, allFields, boxNumber, metaFields, qrStatistics]);

  const qrContent = useMemo(
    () => splitQrContent(qrData, boxNumber),
    [qrData, boxNumber],
  );

  const hasData = displayValues.length > 0;
  const [showQrModal, setShowQrModal] = useState(false);

  const fieldCount = displayValues.length;

  // ─── Tailles ──────────────────────────────────────────────
  const getValueSize = () => {
    if (fieldCount <= 2) return `${fontSize.valueSize + 14}px`;
    if (fieldCount <= 4) return `${fontSize.valueSize + 8}px`;
    return `${fontSize.valueSize}px`;
  };

  const qrSize = Number(record.__qrSize) || fontSize.qrSize;

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
      data-perf-label-card="true"
      data-perf-qr-count={showQr && !qrContent.error ? qrContent.parts.length : 0}
      className={`label-card ${isCaissier ? "border-emerald-500 border-2 shadow-lg" : ""} ${color.bg} ${color.border}`}
      style={{ position: 'relative', ...(width ? { width } : {}) }}
      onClick={editable ? () => setEditing(true) : undefined}
    >
      {editable && <button type="button" className="no-print absolute right-2 top-2 bg-white border rounded px-2 py-1 text-xs z-10"
        aria-label={`Modifier la boîte ${boxNumber}`} onClick={event => { event.stopPropagation(); setEditing(true); }}>Modifier</button>}
      {editing && <LabelEditorModal record={record} onClose={() => setEditing(false)} onSaved={label => {
        setRecord({ ...record, ...labelToRecord(label), metaValues: label.metaValues } as unknown as LabelRecord);
        onLabelSaved?.(label);
      }} />}
      {/* NOM DE L'AGENCE en haut - Utilise agenceSize */}
      {agenceValue && (
        <div className="label-agency text-center mb-5 pb-4 border-b-2 border-border/60">
          <span
            className="font-mono font-extrabold text-primary tracking-wider"
            style={{
              fontSize: `${fontSize.agenceSize}px`,
              letterSpacing: "0.15em",
              lineHeight: "1.8",
              display: "block",
              fontFamily: fontFamily,
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
          {/* Valeurs centrales avec espaces - Utilise valueSize */}
          <div
            className="print-label-content flex-1 text-center "
            style={{
              display: "flex",
              flexDirection: "column",
              gap: valueSpacing,
            }}
          >
            {displayValues.map(({ name, value }, index) => {
              // Vérifier si la valeur est le numéro de boîte
              const isBoxNumber = isNumberField(name);
              // If the value contains multiple dates (e.g., comma separated dd/mm/yyyy), group them
              const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
              const found = String(value).match(datePattern);

              if (found && found.length > 1 && !value.includes(" à ")) {
                const groups = formatProductionDates(found);
                return (
                  <div
                    key={index}
                    className="font-mono p-3 rounded bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className={`flex flex-wrap justify-center gap-2`}>
                      {groups.map((g, gi) => (
                        <div
                          key={gi}
                          className="px-1 text-center text-sm"
                          style={{ minWidth: 100 }}
                        >
                          <span
                            className={`text-primary ${valueWeightClass} ${valueItalicClass}`}
                            style={{ fontSize: valueSize, fontFamily }}
                          >
                            {g}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className="font-mono p-3 rounded bg-white/50 hover:bg-white/80 transition-colors"
                >
                  <span
                    className={`text-primary ${valueWeightClass} ${valueItalicClass}`}
                    style={{
                      fontSize: valueSize,
                      fontFamily: fontFamily,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      lineHeight: "2.0",
                    }}
                  >
                    {isBoxNumber
                      ? `${displayBoxPrefix} ${value}`
                      : value || "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* QR Code en bas avec plus d'espace */}
          {showQr && (
            <div className="print-label-qr flex flex-col items-center w-full mb-48">
              {qrContent.error ? (
                <p
                  role="alert"
                  className="text-sm font-bold text-red-700 border border-red-700 p-2"
                >
                  {qrContent.error}
                </p>
              ) : (
                <div className="flex flex-wrap justify-center gap-3 w-full">
                  {qrContent.parts.map((value, index) => (
                    <button
                      type="button"
                      key={index}
                      className="bg-white shrink-0 flex flex-col items-center rounded cursor-pointer"
                      style={{ width: qrSize }}
                      title="Cliquer pour voir les détails de la boîte"
                      onClick={event => { event.stopPropagation(); setShowQrModal(true); }}
                    >
                      <QRCodeSVG
                        value={value}
                        size={qrSize}
                        style={{ width: qrSize, height: qrSize, flexShrink: 0 }}
                        fgColor="#000000"
                        bgColor="#ffffff"
                        level="M"
                        includeMargin={true}
                      />
                      {qrContent.parts.length === 2 && (
                        <span className="text-xs font-bold text-black">
                          QR {index + 1}/2
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {qrContent.parts.length === 2 && (
                <p className="text-xs text-center mt-1">
                  Scanner les deux QR dans l’ordre pour lire toutes les
                  informations.
                </p>
              )}
            </div>
          )}

          {/* Modal interactif — non imprimé — affiche le tableau du QR */}
          {showQr &&
            showQrModal &&
            createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden" onClick={event => event.stopPropagation()}>
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Détails de la boîte"
                  className="bg-white rounded shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto min-w-0 p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">
                      Détails de la boîte {boxNumber}
                    </h3>
                    <button
                      onClick={() => setShowQrModal(false)}
                      className="px-2 py-1 bg-gray-100 rounded"
                      aria-label="Fermer"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="overflow-auto">
                    <BoxDetailsTable
                      boxNumber={boxNumber}
                      record={record}
                      fields={
                        metaFields.length > 0
                          ? metaFields
                          : allFields.map((name) => ({ name, label: name }))
                      }
                    />
                  </div>
                </div>
              </div>,
              document.body,
            )}
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

  // ✅ AJOUT 1 : Si c'est une année (4 chiffres entre 1900 et 2100), la garder telle quelle
  // Empêche "2015" d'être reformaté en "07/07/1905"
  if (typeof value === "string" || typeof value === "number") {
    const str = String(value).trim();
    if (/^(19|20)\d{2}$/.test(str)) {
      return str;
    }
  }

  // ✅ AJOUT 2 : Si c'est une Date JS (bug Excel) — cast en any pour TypeScript
  const anyValue = value as any;
  if (anyValue instanceof Date && !Number.isNaN(anyValue.getTime())) {
    const y = anyValue.getFullYear();
    // 1905 = 2015 jours après 1900 → valeur originale = 2015
    if (y === 1905) {
      return "2015";
    }
    // Année plausible → retourner juste l'année
    if (y >= 2000 && y <= 2100) {
      return String(y);
    }
    // Année aberrante → vide
    if (y < 2000) {
      return "";
    }
    // Sinon formater en JJ/MM/AAAA
    const day = String(anyValue.getDate()).padStart(2, "0");
    const month = String(anyValue.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${y}`;
  }

  // ✅ AJOUT 3 : Détecter le pattern "07/07/1905" (année aberrante d'une date mal convertie)
  if (typeof value === "string") {
    const dateMatch = value.match(/^(\d{2})\/(\d{2})\/(19\d{2})$/);
    if (dateMatch) {
      const year = parseInt(dateMatch[3], 10);
      // 1905 = 2015 jours après 1900 → valeur originale = 2015
      if (year === 1905) {
        return "2015";
      }
      // Autres années < 2000 → vide
      if (year < 2000) {
        return "";
      }
    }
    return value;
  }

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

export default React.memo(LabelCard);
