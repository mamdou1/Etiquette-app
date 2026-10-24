import { StoredLabel } from '../services/labelService';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import LabelCard from "./LabelCard";
import { getLabelLayout } from '../utils/labelLayout';
import { BoxGroup, LabelSize, ColumnCount, LabelsPerPage } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import { logFrontendPerf, perfNow, performanceLoggingEnabled } from "../utils/performance";

export interface PrintPreviewHandle {
  printAll: () => void;
}

interface Props {
  onLabelSaved?: (label: StoredLabel) => void;
  onPrint?: () => void;
  boxes: BoxGroup[];
  fields: string[];
  visibleFields: string[];
  cols: ColumnCount;
  size: LabelSize;
  boxField: string;
  labelsPerPage?: LabelsPerPage;
  metaFields?: Array<{ name: string; label: string; field_type: string }>;
  selectedYears?: string[];
}

const EMPTY_META_FIELDS: NonNullable<Props["metaFields"]> = [];
const EMPTY_YEARS: string[] = [];

type FlatRecord = {
  record: any;
  boxNumber: string | number;
  year?: string;
};

const PrintPreview = React.forwardRef<PrintPreviewHandle, Props>(({
  boxes,
  onLabelSaved,
  onPrint,
  fields,
  visibleFields,
  cols,
  size,
  boxField,
  labelsPerPage: propLabelsPerPage,
  metaFields = EMPTY_META_FIELDS,
  selectedYears = EMPTY_YEARS,
}, ref) => {
  let preparationDurationMs = 0;
  const previewRootRef = useRef<HTMLDivElement>(null);
  const printRootRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [preparingPrint, setPreparingPrint] = useState(false);
  const preparingPrintRef = useRef(false);
  const buttonPrintPendingRef = useRef(false);
  const printStartedAt = useRef(0);
  const pageChangeStartedAt = useRef<number | null>(null);
  const { fontSize, fontStyle, labelsPerPage: contextLabelsPerPage, labelLayout, filters } = useSettings();

  const itemsPerPage = contextLabelsPerPage || propLabelsPerPage || 2;
  const gridLayout = getLabelLayout(itemsPerPage, labelLayout);

  // Aplatir tous les records avec l'année
  const allRecords = useMemo<FlatRecord[]>(() => {
    const startedAt = perfNow();
    const result = boxes.flatMap((box) => box.records.map((record) => ({
      record: { ...record, metaValues: (record as any).metaValues || { ...record } },
      boxNumber: box.boxNumber,
      year: box.year || extractYearFromBoxNumber(String(box.boxNumber)) || '',
    })));
    preparationDurationMs += perfNow() - startedAt;
    return result;
  }, [boxes]);

  const recordMatchesFilters = (record: any) => Object.entries(filters).every(([field, filter]) => {
    if (!fields.includes(field)) return true;
    const value = String(record[field] ?? record.metaValues?.[field] ?? '').trim();
    if (filter.value?.trim() && !value.toLocaleLowerCase().includes(filter.value.trim().toLocaleLowerCase())) {
      return false;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (filter.from && value < filter.from) return false;
      if (filter.to && value > filter.to) return false;
    }
    return true;
  });

  const recordsToDisplay = useMemo(() => {
    const startedAt = perfNow();
    const result = allRecords.filter(item =>
      (selectedYears.length === 0 || selectedYears.includes(item.year || '') ||
        Object.entries(item.record).some(([key, value]) => /ann[eé]e|year/i.test(key) && String(value).split(/[,;|]/).some(year => selectedYears.includes(year.trim())))) &&
      recordMatchesFilters(item.record)
    );
    preparationDurationMs += perfNow() - startedAt;
    return result;
  }, [allRecords, selectedYears, fields, filters]);

  const sortedRecords = useMemo(() => {
    const startedAt = perfNow();
    const result = [...recordsToDisplay].sort((a, b) => {
      if (a.year !== b.year) return (a.year || '').localeCompare(b.year || '');
      return String(a.boxNumber).localeCompare(String(b.boxNumber), undefined, { numeric: true });
    });
    preparationDurationMs += perfNow() - startedAt;
    return result;
  }, [recordsToDisplay]);

  const totalBoxes = useMemo(() => new Set(sortedRecords.map(item => item.boxNumber)).size, [sortedRecords]);
  const totalRecords = sortedRecords.length;

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

  const getRecordsForPage = useCallback((pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(start + itemsPerPage, sortedRecords.length);
    return sortedRecords.slice(start, end);
  }, [sortedRecords, itemsPerPage]);

  const getGridClass = () => {
    return itemsPerPage >= 4 ? 'label-grid-compact' : '';
  };

  function extractYearFromBoxNumber(boxNumber: string): string | null {
    const match = boxNumber.match(/\/(20\d{2})/);
    return match ? match[1] : null;
  }

  const uniqueYearsInBoxes = useMemo(() => [...new Set(boxes.map(b => b.year || extractYearFromBoxNumber(String(b.boxNumber)) || '').filter(Boolean))].sort(), [boxes]);

  const displayYears = selectedYears.length > 0 
    ? uniqueYearsInBoxes.filter(year => selectedYears.includes(year))
    : uniqueYearsInBoxes;

  const safeCurrentPage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const screenPageRecords = useMemo(() => getRecordsForPage(safeCurrentPage), [getRecordsForPage, safeCurrentPage]);
  const gridClass = itemsPerPage >= 4 ? 'label-grid-compact' : '';
  const gridStyle = {
    '--label-columns': gridLayout.columns,
    '--label-rows': gridLayout.rows,
    '--compact-agency-size': `${Math.max(8, fontSize.agenceSize * 0.5)}px`,
    '--compact-value-size': `${Math.max(7, fontSize.valueSize * 0.65)}px`,
  } as React.CSSProperties;

  preparingPrintRef.current = preparingPrint;

  useEffect(() => {
    setCurrentPage(page => Math.min(page, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  useEffect(() => {
    if (!preparingPrint || !buttonPrintPendingRef.current) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        logFrontendPerf("print-document-preparation", perfNow() - printStartedAt.current, {
          labels: sortedRecords.length,
          pages: totalPages,
          mountedCards: printRootRef.current?.querySelectorAll("[data-perf-label-card]").length || 0,
          mountedQrCodes: countQrCodes(printRootRef.current),
        });
        buttonPrintPendingRef.current = false;
        onPrint?.();
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [preparingPrint, onPrint, sortedRecords.length, totalPages]);

  useEffect(() => {
    const beforePrint = () => {
      // The native browser shortcut bypasses printAll(). Build the same full
      // print tree synchronously before the browser captures the print page.
      if (preparingPrintRef.current) return;
      printStartedAt.current = perfNow();
      flushSync(() => {
        preparingPrintRef.current = true;
        setPreparingPrint(true);
      });
      logFrontendPerf("print-document-preparation", perfNow() - printStartedAt.current, {
        trigger: "native-beforeprint",
        labels: sortedRecords.length,
        pages: totalPages,
        mountedCards: printRootRef.current?.querySelectorAll("[data-perf-label-card]").length || 0,
        mountedQrCodes: countQrCodes(printRootRef.current),
      });
    };
    const afterPrint = () => {
      buttonPrintPendingRef.current = false;
      preparingPrintRef.current = false;
      setPreparingPrint(false);
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [sortedRecords.length, totalPages]);

  useImperativeHandle(ref, () => ({
    printAll: () => {
      if (preparingPrint) return;
      printStartedAt.current = perfNow();
      buttonPrintPendingRef.current = true;
      preparingPrintRef.current = true;
      setPreparingPrint(true);
    },
  }), [preparingPrint]);

  const navigateToPage = (page: number) => {
    pageChangeStartedAt.current = perfNow();
    setCurrentPage(Math.max(0, Math.min(totalPages - 1, page)));
  };

  const onPreviewRender: React.ProfilerOnRenderCallback = (_id, phase, actualDuration, baseDuration) => {
    if (!performanceLoggingEnabled) return;
    logFrontendPerf("preview-react-commit", actualDuration, {
      phase,
      baseDurationMs: Number(baseDuration.toFixed(2)),
      mountedCards: previewRootRef.current?.querySelectorAll("[data-perf-label-card]").length || 0,
      mountedQrCodes: countQrCodes(previewRootRef.current),
      currentPage: safeCurrentPage + 1,
      totalPages,
      printMountedCards: printRootRef.current?.querySelectorAll("[data-perf-label-card]").length || 0,
      printMountedQrCodes: countQrCodes(printRootRef.current),
    });
    if (pageChangeStartedAt.current !== null) {
      logFrontendPerf("preview-page-navigation", perfNow() - pageChangeStartedAt.current, {
        currentPage: safeCurrentPage + 1,
        totalPages,
        mountedCards: previewRootRef.current?.querySelectorAll("[data-perf-label-card]").length || 0,
        mountedQrCodes: countQrCodes(previewRootRef.current),
      });
      pageChangeStartedAt.current = null;
    }
  };

  const renderPage = (pageIndex: number, pageRecords: FlatRecord[]) => (
    <div key={pageIndex} className="a4-sheet a4-landscape mx-auto mb-6">
      <div className={`label-grid ${gridClass}`} style={gridStyle}>
        {pageRecords.map((item, idx) => (
          <div key={`${item.boxNumber}-${idx}-${pageIndex}`} className="label-grid-cell">
            <LabelCard
              onLabelSaved={onLabelSaved}
              record={item.record}
              allFields={fields}
              visibleFields={visibleFields}
              size={size}
              boxNumber={String(item.boxNumber)}
              boxField={boxField}
              isCaissier={String(item.record.caissiers || "").trim() !== "" || String(item.record.caissier || "").trim() !== ""}
              metaFields={metaFields}
            />
          </div>
        ))}
        {pageRecords.length < itemsPerPage && Array.from({ length: itemsPerPage - pageRecords.length }).map((_, i) => (
          <div key={`empty-${i}`} className="label-grid-cell label-grid-cell-empty" />
        ))}
      </div>
    </div>
  );

  logFrontendPerf("preview-data-preparation", preparationDurationMs, {
    inputBoxes: boxes.length,
    inputLabels: allRecords.length,
    displayedLabels: sortedRecords.length,
    pages: totalPages,
    fields: fields.length,
    recalculated: preparationDurationMs > 0,
  });

  return (
    <React.Profiler id="label-preview" onRender={onPreviewRender}>
    <div className="preview-screen print-container bg-[#f0ede8]">
    <div ref={previewRootRef} className="flex-1 p-8 overflow-y-auto preview-screen-content">
      <div className="no-print flex-wrap gap-6 mb-5 font-mono text-xs text-muted">
        <span>
          <strong className="text-primary">{totalBoxes}</strong> boîtes
        </span>
        <span>
          <strong className="text-primary">{totalRecords}</strong>{" "}
          enregistrements
        </span>
        <span>
          <strong className="text-primary">{totalPages}</strong> page
          {totalPages > 1 ? "s" : ""}
        </span>
        <span>
          <strong className="text-primary">{fields.length}</strong> champs
        </span>
        <span>
          <strong className="text-primary">{itemsPerPage}</strong> étiquettes/page
        </span>
        <div className="preview-pagination no-print" role="navigation" aria-label="Navigation de l’aperçu">
          <button type="button" onClick={() => navigateToPage(safeCurrentPage - 1)} disabled={safeCurrentPage === 0}>← Précédent</button>
          <label>Page <input aria-label="Numéro de page" type="number" min={1} max={Math.max(1, totalPages)} value={totalPages ? safeCurrentPage + 1 : 0} disabled={!totalPages} onChange={event => {
            const page = Number(event.target.value);
            if (Number.isFinite(page) && page >= 1 && page <= totalPages) navigateToPage(page - 1);
          }} /> / {totalPages}</label>
          <button type="button" onClick={() => navigateToPage(safeCurrentPage + 1)} disabled={safeCurrentPage >= totalPages - 1}>Suivant →</button>
        </div>
        {displayYears.length > 0 && (
          <span>
            <strong className="text-primary">{displayYears.length}</strong> année
            {displayYears.length > 1 ? "s" : ""}:{" "}
            <span className="text-accent">{displayYears.join(", ")}</span>
          </span>
        )}
        {selectedYears.length > 0 && uniqueYearsInBoxes.length > selectedYears.length && (
          <span className="text-amber-600">
            ⚠️ Filtré: seules {selectedYears.join(", ")} sont affichées
          </span>
        )}
        <span className="text-accent">
          Label: {fontSize.labelSize}px | Valeur: {fontSize.valueSize}px | QR:{" "}
          {fontSize.qrSize}px
          {fontStyle.labelWeight === "bold" && " | Label gras"}
          {fontStyle.valueWeight === "bold" && " | Valeur gras"}
          {fontStyle.labelItalic && " | Label italique"}
          {fontStyle.valueItalic && " | Valeur italique"}
        </span>
      </div>

      {totalPages > 0 ? renderPage(safeCurrentPage, screenPageRecords) : <p className="font-mono text-muted">Aucune étiquette à afficher.</p>}
    </div>
    </div>
    {preparingPrint && <div ref={printRootRef} className="print-document print-container" aria-hidden="true">
      {Array.from({ length: totalPages }, (_, pageIndex) => renderPage(pageIndex, getRecordsForPage(pageIndex)))}
    </div>}
    </React.Profiler>
  );
});

function countQrCodes(root: HTMLElement | null): number {
  if (!root) return 0;
  const cards = root.querySelectorAll<HTMLElement>("[data-perf-label-card]");
  let count = 0;
  cards.forEach(card => { count += Number(card.dataset.perfQrCount || 0); });
  return count;
}

export default PrintPreview;
