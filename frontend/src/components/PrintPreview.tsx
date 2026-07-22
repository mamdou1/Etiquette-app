import React from "react";
import LabelCard from "./LabelCard";
import { BoxGroup, LabelSize, ColumnCount } from "../types";

interface Props {
  boxes: BoxGroup[];
  fields: string[];
  visibleFields: string[];
  cols: ColumnCount;
  size: LabelSize;
  boxField: string;
}

const PrintPreview: React.FC<Props> = ({ 
  boxes, 
  fields, 
  visibleFields, 
  cols, 
  size, 
  boxField 
}) => {
  const totalBoxes = boxes.length;
  const totalRecords = boxes.reduce((sum, b) => sum + b.records.length, 0);
  
  // 4 étiquettes par page (2×2)
  const itemsPerPage = 4;
  const totalPages = Math.ceil(totalBoxes / itemsPerPage);

  // Découper les boîtes par page (4 par page)
  const getBoxesForPage = (pageIndex: number) => {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalBoxes);
    return boxes.slice(start, end);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto print-container bg-[#f0ede8]">
      {/* Stats (masquées à l'impression) */}
      <div className="no-print flex flex-wrap gap-6 mb-5 font-mono text-xs text-muted">
        <span><strong className="text-primary">{totalBoxes}</strong> boîtes</span>
        <span><strong className="text-primary">{totalRecords}</strong> enregistrements</span>
        <span><strong className="text-primary">{totalPages}</strong> page{totalPages > 1 ? "s" : ""}</span>
        <span><strong className="text-primary">{fields.length}</strong> champs</span>
      </div>

      {/* Générer une page A4 par groupe de 4 étiquettes */}
      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const pageBoxes = getBoxesForPage(pageIndex);
        
        return (
          <div 
            key={pageIndex} 
            className="a4-sheet a4-landscape mx-auto mb-6"
          >
            <div
              className="label-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gridTemplateRows: "repeat(2, 1fr)",
                gap: "16px",
                width: "100%",
                height: "100%",
                minHeight: "680px",
              }}
            >
              {pageBoxes.map((box) => (
                <div
                  key={box.boxNumber}
                  style={{
                    breakInside: "avoid",
                    pageBreakInside: "avoid",
                  }}
                >
                  {box.records.map((record, idx) => (
                    <LabelCard
                      key={idx}
                      record={record}
                      allFields={fields}
                      visibleFields={visibleFields}
                      size={size}
                      boxNumber={box.boxNumber}
                      isCaissier={
                        String(record.caissiers || "").trim() !== "" ||
                        String(record.caissier || "").trim() !== ""
                      }
                    />
                  ))}
                </div>
              ))}
              
              {/* Cases vides si moins de 4 sur la dernière page */}
              {pageBoxes.length < 4 && 
                Array.from({ length: 4 - pageBoxes.length }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ visibility: "hidden" }} />
                ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PrintPreview;