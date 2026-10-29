import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

const BoxMultiSelect: React.FC<Props> = ({ options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? options.filter(option => option.toLocaleLowerCase().includes(normalizedQuery))
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const estimatedPanelHeight = Math.min(360, window.innerHeight - 16);
      const top = rect.bottom + estimatedPanelHeight > window.innerHeight
        ? Math.max(8, rect.top - estimatedPanelHeight)
        : rect.bottom + 4;
      setPosition({ top, left, width });
    };

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const toggleOption = (option: string) => {
    onChange(value.includes(option)
      ? value.filter(selected => selected !== option)
      : [...value, option]);
  };

  const toggleFiltered = () => {
    const allFilteredSelected = filteredOptions.every(option => value.includes(option));
    onChange(allFilteredSelected
      ? value.filter(option => !filteredOptions.includes(option))
      : [...new Set([...value, ...filteredOptions])]);
  };

  const panel = open ? createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Sélectionner les boîtes à générer"
      className="rounded-md border border-border bg-white shadow-xl"
      style={{ position: "fixed", top: position.top, left: position.left, width: position.width, zIndex: 10000 }}
    >
      <div className="border-b border-border p-3">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Rechercher une boîte..."
          className="ui-field ui-field-sm w-full"
          aria-label="Rechercher un numéro de boîte"
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <button type="button" onClick={toggleFiltered} className="text-accent hover:underline">
            {filteredOptions.length > 0 && filteredOptions.every(option => value.includes(option))
              ? "Désélectionner la liste"
              : "Sélectionner la liste"}
          </button>
          <button type="button" onClick={() => onChange([])} className="text-muted hover:text-primary">
            Tout effacer
          </button>
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto p-1" role="group" aria-label="Numéros de boîtes">
        {filteredOptions.length === 0 ? (
          <p className="p-3 text-sm text-muted">Aucune boîte trouvée.</p>
        ) : filteredOptions.map(option => (
          <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-surface">
            <input type="checkbox" checked={value.includes(option)} onChange={() => toggleOption(option)} />
            <span className="truncate">{option}</span>
          </label>
        ))}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={options.length === 0}
        onClick={() => setOpen(current => !current)}
        className="ui-field ui-field-sm flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">
          {value.length === 0 ? "Toutes les boîtes" : `${value.length} boîte(s) sélectionnée(s)`}
        </span>
        <span aria-hidden="true" className="text-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <p className="mt-1 font-mono text-[10px] text-muted" role="status">
          {value.length === 0 ? `${options.length} boîte(s) disponibles` : `${value.length} boîte(s) sélectionnée(s)`}
        </p>
      )}
      {panel}
    </>
  );
};

export default BoxMultiSelect;
