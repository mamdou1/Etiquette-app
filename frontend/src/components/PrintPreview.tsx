import React from "react";
import LabelGrid from "./LabelGrid";
import { BoxGroup, LabelSize, ColumnCount } from "../types";

interface Props {
  boxes: BoxGroup[];           // ✅ Ajouté
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
  const lines = Math.ceil(totalBoxes / cols);

  return (
    <div className="flex-1 p-8 overflow-y-auto print-container bg-[#f0ede8]">
      {/* Stats (masquées à l'impression) */}
      <div className="no-print flex flex-wrap gap-6 mb-5 font-mono text-xs text-muted">
        <span><strong className="text-primary">{totalBoxes}</strong> boîtes</span>
        <span><strong className="text-primary">{totalRecords}</strong> enregistrements</span>
        <span><strong className="text-primary">{cols}</strong> colonnes</span>
        <span><strong className="text-primary">{lines}</strong> ligne{lines > 1 ? "s" : ""}</span>
        <span><strong className="text-primary">{fields.length}</strong> champs</span>
      </div>

      {/* Feuille A4 Paysage */}
      <div className="a4-sheet a4-landscape mx-auto">
        <LabelGrid
          boxes={boxes}
          fields={fields}
          visibleFields={visibleFields}
          cols={cols}
          size={size}
          boxField={boxField}
        />
      </div>
    </div>
  );
};

export default PrintPreview;