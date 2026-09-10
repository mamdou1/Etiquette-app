import React from "react";
import LabelCard from "./LabelCard";
import { BoxGroup, LabelSize, ColumnCount, LabelsPerPage } from "../types";
import { useSettings } from "../contexts/SettingsContext";

interface Props {
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

type FlatRecord = {
  record: any;
  boxNumber: string | number;
  year?: string;
};

const PrintPreview: React.FC<Props> = ({
  boxes,
  fields,
  visibleFields,
  cols,
  size,
  boxField,
  labelsPerPage: propLabelsPerPage,
  metaFields = [],
  selectedYears = [],
}) => {
  const { fontSize, fontStyle, labelsPerPage: contextLabelsPerPage, filters } = useSettings();

  const itemsPerPage = contextLabelsPerPage || propLabelsPerPage || 2;

  // Aplatir tous les records avec l'année
  const allRecords: FlatRecord[] = boxes.flatMap((box) =>
    box.records.map((record) => ({
      record: {
        ...record,
        metaValues: (record as any).metaValues || { ...record },
      },
      boxNumber: box.boxNumber,
      year: box.year || extractYearFromBoxNumber(box.boxNumber) || '',
    })),
  );

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

  const recordsToDisplay = allRecords.filter(item =>
    (selectedYears.length === 0 || selectedYears.includes(item.year || '')) &&
    recordMatchesFilters(item.record)
  );

  const totalBoxes = new Set(recordsToDisplay.map(item => item.boxNumber)).size;
  const totalRecords = recordsToDisplay.length;

  const sortedRecords = [...recordsToDisplay].sort((a, b) => {
    if (a.year !== b.year) {
      return (a.year || '').localeCompare(b.year || '');
    }
    return String(a.boxNumber).localeCompare(String(b.boxNumber), undefined, { numeric: true });
  });

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

  const getRecordsForPage = (pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(start + itemsPerPage, sortedRecords.length);
    return sortedRecords.slice(start, end);
  };

  const getGridClass = () => {
    return `label-grid-${itemsPerPage}`;
  };

  function extractYearFromBoxNumber(boxNumber: string): string | null {
    const match = boxNumber.match(/\/(20\d{2})/);
    return match ? match[1] : null;
  }

  const uniqueYearsInBoxes = [...new Set(boxes.map(b => b.year || extractYearFromBoxNumber(b.boxNumber) || '').filter(Boolean))].sort();

  const displayYears = selectedYears.length > 0 
    ? uniqueYearsInBoxes.filter(year => selectedYears.includes(year))
    : uniqueYearsInBoxes;

  return (
    <div className="flex-1 p-8 overflow-y-auto print-container bg-[#f0ede8]">
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

      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const pageRecords = getRecordsForPage(pageIndex);

        return (
          <div
            key={pageIndex}
            className="a4-sheet a4-landscape mx-auto mb-6"
          >
            {/* ✅ Plus de pageYear ici — c'était la source du bug page 1 */}

            <div className={`label-grid ${getGridClass()}`}>
              {pageRecords.map((item, idx) => (
                <div
                  key={`${item.boxNumber}-${idx}-${pageIndex}`}
                  className="label-grid-cell"
                >
                  <LabelCard
                    record={item.record}
                    allFields={fields}
                    visibleFields={visibleFields}
                    size={size}
                    boxNumber={String(item.boxNumber)}
                    isCaissier={
                      String(item.record.caissiers || "").trim() !== "" ||
                      String(item.record.caissier || "").trim() !== ""
                    }
                    metaFields={metaFields}
                  />
                </div>
              ))}

              {pageRecords.length < itemsPerPage &&
                Array.from({ length: itemsPerPage - pageRecords.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="label-grid-cell label-grid-cell-empty"
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PrintPreview;