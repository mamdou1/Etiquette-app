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
  metaFields?: Array<{ name: string; label: string; field_type: string }>;
}

const LabelGrid: React.FC<Props> = ({ 
  boxes, 
  fields, 
  visibleFields, 
  cols, 
  size, 
  boxField,
  metaFields = [],
}) => {
  const FIXED_COLS = 2;

  return (
    <div
      className="label-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${FIXED_COLS}, 1fr)`,
        gap: "16px",
        width: "100%",
        height: "100%",
      }}
    >
      {boxes.map((box) => (
        <div
          key={box.boxNumber}
          className="box-group"
          style={{
            breakInside: "avoid",
            pageBreakInside: "avoid",
          }}
        >
          {box.records.map((record, idx) => {
            // ✅ Construire le record avec metaValues si présent
            const recordWithMeta = {
              ...record,
              metaValues: (record as any).metaValues || {},
            };
            
            return (
              <LabelCard
                key={idx}
                record={recordWithMeta}
                allFields={fields}
                visibleFields={visibleFields}
                size={size}
                boxNumber={box.boxNumber}
                isCaissier={
                  String(record.caissiers || "").trim() !== "" ||
                  String(record.caissier || "").trim() !== ""
                }
                metaFields={metaFields}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default LabelGrid;