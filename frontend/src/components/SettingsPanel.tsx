import React, { useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { ColumnCount, LabelSize } from "../types";

const DATE_FIELD_RE = /\b(date|jour|production|expiration|echeance)\b/i;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isDateField(field: string) {
  return DATE_FIELD_RE.test(normalizeText(field));
}

function hasActiveFilters(filters: any) {
  return Object.values(filters).some((filter: any) =>
    Boolean(filter.value?.trim() || filter.from || filter.to),
  );
}

interface Props {
  fields: string[];
  filename: string;
  total: number;
  sourceTotal: number;
  availableYears: string[];
  selectedYears: string[];
  onToggleYear: (year: string) => void;
  onPrint: () => void;
  onReset: () => void;
}

const SettingsPanel: React.FC<Props> = ({
  fields,
  filename,
  total,
  sourceTotal,
  availableYears,
  selectedYears,
  onToggleYear,
  onPrint,
  onReset,
}) => {
  const {
    cols,
    size,
    fontSize,
    fontStyle,
    visibleFields,
    filters,
    setCols,
    setSize,
    setFontSize,
    setFontStyle,
    updateFilter,
    clearFilters,
    toggleField,
    reorderFields,
  } = useSettings();

  const activeFilters = hasActiveFilters(filters);
  const [showFields, setShowFields] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ─── Drag & Drop Handlers ──────────────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      reorderFields(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleFieldClick = (key: string) => {
    if (dragIndex !== null) return;
    toggleField(key);
  };

  return (
    <aside className="no-print w-80 min-w-[320px] bg-white border-r border-border flex flex-col gap-4 p-6 overflow-y-auto h-screen sticky top-0">
      {/* ─── Section 01 : Fichier ───────────────────────────── */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
          01 - Fichier
        </p>
        <div className="flex items-center gap-2 bg-accent-light border border-accent px-3 py-2 mb-2">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e63946"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-mono text-accent text-xs truncate">
            {filename}
          </span>
        </div>
        <p className="font-mono text-xs text-muted mb-3">
          {total} / {sourceTotal} boîte{sourceTotal > 1 ? "s" : ""}
        </p>
        <button
          onClick={onReset}
          className="w-full border border-border text-muted text-xs font-mono py-2 hover:border-muted transition-colors"
        >
          Changer de fichier
        </button>
      </div>

      {/* ─── Section 02 : Années ────────────────────────────── */}
      {availableYears.length > 1 && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              02 - Années à imprimer
            </p>
            {selectedYears.length > 0 && (
              <button
                onClick={() => selectedYears.forEach(onToggleYear)}
                className="font-mono text-[10px] text-accent hover:underline"
              >
                Toutes
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((year) => {
              const selected = selectedYears.length === 0 || selectedYears.includes(year);
              return (
                <button
                  key={year}
                  onClick={() => onToggleYear(year)}
                  className={`border px-3 py-2 font-mono text-xs transition-colors ${
                    selected ? "border-accent bg-accent text-white" : "border-border bg-white text-muted"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted">
            {selectedYears.length === 0
              ? "Toutes les années sont sélectionnées"
              : `${selectedYears.length} année${selectedYears.length > 1 ? "s" : ""} sélectionnée${selectedYears.length > 1 ? "s" : ""}`}
          </p>
        </div>
      )}

      {/* ─── Section 03 : Filtres ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            03 - Filtres
          </p>
          {activeFilters && (
            <button
              onClick={clearFilters}
              className="font-mono text-[10px] text-accent hover:underline"
            >
              Effacer
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto">
          {fields.map((field) => {
            const filter = filters[field] ?? {};
            return (
              <div key={field} className="border border-border bg-surface p-3">
                <label className="block font-mono text-[11px] font-medium text-primary mb-2">
                  {field}
                </label>
                {isDateField(field) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filter.from ?? ""}
                      onChange={(event) =>
                        updateFilter(field, "from", event.target.value)
                      }
                      className="w-full min-w-0 border border-border bg-white px-2 py-2 font-mono text-[11px] outline-none focus:border-accent"
                      title={`Date de debut pour ${field}`}
                    />
                    <input
                      type="date"
                      value={filter.to ?? ""}
                      onChange={(event) =>
                        updateFilter(field, "to", event.target.value)
                      }
                      className="w-full min-w-0 border border-border bg-white px-2 py-2 font-mono text-[11px] outline-none focus:border-accent"
                      title={`Date de fin pour ${field}`}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={filter.value ?? ""}
                    onChange={(event) =>
                      updateFilter(field, "value", event.target.value)
                    }
                    placeholder="Contient..."
                    className="w-full border border-border bg-white px-2 py-2 font-mono text-xs outline-none focus:border-accent"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section 04 : Champs affichés AVEC DRAG & DROP ── */}
      <div>
        <div 
          className="flex items-center justify-between gap-2 mb-3 cursor-pointer"
          onClick={() => setShowFields(!showFields)}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            04 - Champs affichés
          </p>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transform transition-transform ${showFields ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {showFields && (
          <div className="border border-border p-3 bg-surface max-h-48 overflow-y-auto">
            <p className="font-mono text-[9px] text-muted mb-2">
              Glissez-déposez pour réorganiser
            </p>
            <div className="flex flex-col gap-1">
              {/* Champs visibles (avec drag) */}
              {visibleFields.map((key, index) => {
                const isDragging = dragIndex === index;
                const isDragOver = dragOverIndex === index;
                return (
                  <div
                    key={`visible-${key}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleFieldClick(key)}
                    className={`flex items-center justify-between px-3 py-2 border cursor-grab select-none transition-colors
                      ${isDragging ? "opacity-40 border-accent bg-accent-light" : ""}
                      ${isDragOver ? "border-accent border-dashed bg-accent-light" : ""}
                      ${!isDragging && !isDragOver ? "bg-accent-light border-accent" : ""}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="#9e9b95"
                        className="flex-shrink-0 opacity-40"
                      >
                        <circle cx="3" cy="2" r="1" />
                        <circle cx="7" cy="2" r="1" />
                        <circle cx="3" cy="5" r="1" />
                        <circle cx="7" cy="5" r="1" />
                        <circle cx="3" cy="8" r="1" />
                        <circle cx="7" cy="8" r="1" />
                      </svg>
                      <span className="font-mono text-xs font-medium">{key}</span>
                    </div>
                    <div className="w-4 h-4 border border-accent bg-accent flex items-center justify-center flex-shrink-0">
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    </div>
                  </div>
                );
              })}

              {/* Champs non-visibles (sans drag) */}
              {fields
                .filter((f) => !visibleFields.includes(f))
                .map((key) => (
                  <div
                    key={`hidden-${key}`}
                    onClick={() => toggleField(key)}
                    className="flex items-center justify-between px-3 py-2 border cursor-pointer select-none transition-colors bg-white border-border hover:bg-[#f0eeea]"
                  >
                    <span className="font-mono text-xs font-medium text-muted">{key}</span>
                    <div className="w-4 h-4 border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-muted text-[10px]">+</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Section 05 : Colonnes ──────────────────────────── */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
          05 - Colonnes
        </p>
        <div className="flex gap-2">
          {([2, 3, 4] as ColumnCount[]).map((n) => (
            <button
              key={n}
              onClick={() => setCols(n)}
              className={`flex-1 py-2 border font-mono text-sm font-medium transition-colors
                ${cols === n ? "bg-accent border-accent text-white" : "bg-white border-border hover:border-muted"}`}
            >
              {n} col.
            </button>
          ))}
        </div>
      </div>

      {/* ─── Section 06 : Tailles réelles (SLIDERS) ─────────── */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
          06 - Tailles des polices (px)
        </p>
        
        <div className="mb-3">
          <div className="flex justify-between font-mono text-xs text-muted">
            <label>Label</label>
            <span>{fontSize.labelSize}px</span>
          </div>
          <input
            type="range"
            min="8"
            max="24"
            value={fontSize.labelSize}
            onChange={(e) => setFontSize({ ...fontSize, labelSize: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>

        <div className="mb-3">
          <div className="flex justify-between font-mono text-xs text-muted">
            <label>Valeur</label>
            <span>{fontSize.valueSize}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="36"
            value={fontSize.valueSize}
            onChange={(e) => setFontSize({ ...fontSize, valueSize: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>

        <div className="mb-3">
          <div className="flex justify-between font-mono text-xs text-muted">
            <label>QR Code</label>
            <span>{fontSize.qrSize}px</span>
          </div>
          <input
            type="range"
            min="30"
            max="120"
            value={fontSize.qrSize}
            onChange={(e) => setFontSize({ ...fontSize, qrSize: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent"
          />
        </div>
      </div>

      {/* ─── Section 07 : Style des polices ──────────────────── */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">
          07 - Style des polices
        </p>

        {/* Label */}
        <div className="mb-3 p-3 border border-border rounded bg-surface/50">
          <div className="flex justify-between font-mono text-xs text-muted mb-2">
            <label>Label</label>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => setFontStyle({ 
                ...fontStyle, 
                labelWeight: fontStyle.labelWeight === 'bold' ? 'semibold' : 'bold' 
              })}
              className={`px-3 py-1 border font-mono text-sm transition-colors rounded
                ${fontStyle.labelWeight === 'bold' 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-border hover:border-muted'}`}
            >
              <span className="font-bold">Gras</span>
            </button>
            <button
              onClick={() => setFontStyle({ 
                ...fontStyle, 
                labelWeight: fontStyle.labelWeight === 'semibold' ? 'normal' : 'semibold' 
              })}
              className={`px-3 py-1 border font-mono text-sm transition-colors rounded
                ${fontStyle.labelWeight === 'semibold' 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-border hover:border-muted'}`}
            >
              <span className="font-semibold">Semi-gras</span>
            </button>
            <button
              onClick={() => setFontStyle({ 
                ...fontStyle, 
                labelItalic: !fontStyle.labelItalic 
              })}
              className={`px-3 py-1 border font-mono text-sm transition-colors rounded
                ${fontStyle.labelItalic 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-border hover:border-muted'}`}
            >
              <span className="italic">Italique</span>
            </button>
            <span 
              className={`ml-auto text-sm px-2 py-1 rounded bg-white border border-border
                ${fontStyle.labelWeight === 'bold' ? 'font-bold' : ''}
                ${fontStyle.labelWeight === 'semibold' ? 'font-semibold' : ''}
                ${fontStyle.labelItalic ? 'italic' : ''}
              `}
            >
              Aa
            </span>
          </div>
        </div>

        {/* Valeur */}
        <div className="mb-3 p-3 border border-border rounded bg-surface/50">
          <div className="flex justify-between font-mono text-xs text-muted mb-2">
            <label>Valeur</label>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={() => setFontStyle({ 
                ...fontStyle, 
                valueWeight: fontStyle.valueWeight === 'bold' ? 'semibold' : 'bold' 
              })}
              className={`px-3 py-1 border font-mono text-sm transition-colors rounded
                ${fontStyle.valueWeight === 'bold' 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-border hover:border-muted'}`}
            >
              <span className="font-bold">Gras</span>
            </button>
            <button
              onClick={() => setFontStyle({ 
                ...fontStyle, 
                valueWeight: fontStyle.valueWeight === 'semibold' ? 'normal' : 'semibold' 
              })}
              className={`px-3 py-1 border font-mono text-sm transition-colors rounded
                ${fontStyle.valueWeight === 'semibold' 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-border hover:border-muted'}`}
            >
              <span className="font-semibold">Semi-gras</span>
            </button>
            <button
              onClick={() => setFontStyle({ 
                ...fontStyle, 
                valueItalic: !fontStyle.valueItalic 
              })}
              className={`px-3 py-1 border font-mono text-sm transition-colors rounded
                ${fontStyle.valueItalic 
                  ? 'bg-accent border-accent text-white' 
                  : 'bg-white border-border hover:border-muted'}`}
            >
              <span className="italic">Italique</span>
            </button>
            <span 
              className={`ml-auto text-sm px-2 py-1 rounded bg-white border border-border
                ${fontStyle.valueWeight === 'bold' ? 'font-bold' : ''}
                ${fontStyle.valueWeight === 'semibold' ? 'font-semibold' : ''}
                ${fontStyle.valueItalic ? 'italic' : ''}
              `}
            >
              Aa
            </span>
          </div>
        </div>
      </div>

      {/* ─── Bouton Impression ──────────────────────────────── */}
      <div className="mt-auto">
        <button
          onClick={onPrint}
          disabled={total === 0}
          className="w-full bg-accent hover:bg-red-700 disabled:bg-border disabled:text-muted disabled:cursor-not-allowed text-white py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimer les étiquettes
        </button>
      </div>
    </aside>
  );
};

export default SettingsPanel;