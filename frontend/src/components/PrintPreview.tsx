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
}

type FlatRecord = {
  record: any;
  boxNumber: string | number;
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
}) => {
  const { fontSize, fontStyle, labelsPerPage: contextLabelsPerPage } = useSettings();

  // Utiliser labelsPerPage du contexte ou de la prop
  const itemsPerPage = contextLabelsPerPage || propLabelsPerPage || 2;

  const totalBoxes = boxes.length;
  const totalRecords = boxes.reduce((sum, b) => sum + b.records.length, 0);

  // Aplatir tous les records
  const allRecords: FlatRecord[] = boxes.flatMap((box) =>
    box.records.map((record) => ({
      record: {
        ...record,
        metaValues: (record as any).metaValues || { ...record },
      },
      boxNumber: box.boxNumber,
    })),
  );
  const totalPages = Math.ceil(allRecords.length / itemsPerPage);

  const getRecordsForPage = (pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(start + itemsPerPage, allRecords.length);
    return allRecords.slice(start, end);
  };

  // Déterminer la classe de grille en fonction du nombre d'étiquettes
  const getGridClass = () => {
    return `label-grid-${itemsPerPage}`;
  };

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
            style={{
              pageBreakAfter: pageIndex < totalPages - 1 ? "always" : "avoid",
            }}
          >
            <div
              className={`label-grid ${getGridClass()}`}
              style={{
                display: "grid",
                gap: "3mm",
                width: "100%",
                height: "100%",
                minHeight: "unset",
              }}
            >
              {pageRecords.map((item, idx) => (
                <div
                  key={`${item.boxNumber}-${idx}-${pageIndex}`}
                  style={{
                    breakInside: "avoid",
                    pageBreakInside: "avoid",
                    height: "100%",
                  }}
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

              {/* Remplir les espaces vides */}
              {pageRecords.length < itemsPerPage &&
                Array.from({ length: itemsPerPage - pageRecords.length }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ visibility: "hidden" }} />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PrintPreview;