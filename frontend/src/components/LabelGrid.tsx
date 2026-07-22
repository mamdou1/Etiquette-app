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

const LabelGrid: React.FC<Props> = ({ boxes, fields, visibleFields, cols, size, boxField }) => {
  // FORCÉ à 2 colonnes pour A4 paysage (2×2 = 4 étiquettes par page)
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
      {/* AFFICHER TOUTES LES ÉTIQUETTES, PAS SEULEMENT 4 */}
      {boxes.map((box) => (
        <div
          key={box.boxNumber}
          className="box-group"
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
    </div>
  );
};

export default LabelGrid;