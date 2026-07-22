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
  // Calculer la largeur des étiquettes pour s'adapter à la page A4 paysage
  const getLabelWidth = () => {
    const pageWidth = 1123; // A4 paysage en px
    const padding = 60; // 30px de chaque côté
    const gap = 20;
    const availableWidth = pageWidth - padding - (cols - 1) * gap;
    return Math.floor(availableWidth / cols);
  };

  const labelWidth = getLabelWidth();

  return (
    <div
      className="label-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "16px",
        maxWidth: "1123px",
        margin: "0 auto",
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
          {box.records.map((record, idx) => (
            <LabelCard
              key={idx}
              record={record}
              allFields={fields}
              visibleFields={visibleFields}
              size={size}
              width={labelWidth}
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
