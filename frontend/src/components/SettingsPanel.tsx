import React from "react";
import { ColumnCount, LabelSize } from "../types";

interface Props {
  fields: string[];
  visibleFields: string[];
  cols: ColumnCount;
  size: LabelSize;
  onToggleField: (key: string) => void;
  onColsChange: (n: ColumnCount) => void;
  onSizeChange: (s: LabelSize) => void;
  onPrint: () => void;
  onReset: () => void;
  filename: string;
  total: number;
}

const SettingsPanel: React.FC<Props> = ({
  fields, visibleFields, cols, size,
  onToggleField, onColsChange, onSizeChange,
  onPrint, onReset, filename, total,
}) => {
  return (
    <aside className="no-print w-72 min-w-[288px] bg-white border-r border-border flex flex-col gap-6 p-6 overflow-y-auto">

      {/* Fichier chargé */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">01 — Fichier</p>
        <div className="flex items-center gap-2 bg-accent-light border border-accent px-3 py-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="font-mono text-accent text-xs truncate">{filename}</span>
        </div>
        <p className="font-mono text-xs text-muted mb-3">{total} enregistrement{total > 1 ? "s" : ""}</p>
        <button
          onClick={onReset}
          className="w-full border border-border text-muted text-xs font-mono py-2 hover:border-muted transition-colors"
        >
          Changer de fichier
        </button>
      </div>

      {/* Champs visibles */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">02 — Champs affichés</p>
        <div className="flex flex-col gap-2">
          {fields.map((key) => {
            const active = visibleFields.includes(key);
            return (
              <div
                key={key}
                onClick={() => onToggleField(key)}
                className={`flex items-center justify-between px-3 py-2 border cursor-pointer select-none transition-colors
                  ${active ? "bg-accent-light border-accent" : "bg-surface border-border hover:bg-[#f0eeea]"}`}
              >
                <span className="font-mono text-xs font-medium">{key}</span>
                <div className={`w-4 h-4 border flex items-center justify-center flex-shrink-0
                  ${active ? "border-accent bg-accent" : "border-border"}`}>
                  {active && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colonnes */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">03 — Colonnes</p>
        <div className="flex gap-2">
          {([2, 3, 4] as ColumnCount[]).map((n) => (
            <button
              key={n}
              onClick={() => onColsChange(n)}
              className={`flex-1 py-2 border font-mono text-sm font-medium transition-colors
                ${cols === n ? "bg-accent border-accent text-white" : "bg-white border-border hover:border-muted"}`}
            >
              {n} col.
            </button>
          ))}
        </div>
      </div>

      {/* Taille */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-3">04 — Taille</p>
        <div className="flex gap-2">
          {(["sm", "md", "lg"] as LabelSize[]).map((s, i) => (
            <button
              key={s}
              onClick={() => onSizeChange(s)}
              className={`flex-1 py-2 border font-mono text-xs font-medium transition-colors
                ${size === s ? "bg-accent border-accent text-white" : "bg-white border-border hover:border-muted"}`}
            >
              {["Petit", "Moyen", "Grand"][i]}
            </button>
          ))}
        </div>
      </div>

      {/* Bouton imprimer */}
      <div className="mt-auto">
        <button
          onClick={onPrint}
          className="w-full bg-accent hover:bg-red-700 text-white py-3 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimer les étiquettes
        </button>
      </div>
    </aside>
  );
};

export default SettingsPanel;
