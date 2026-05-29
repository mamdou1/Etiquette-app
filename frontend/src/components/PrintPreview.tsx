import React from "react";
import LabelGrid from "./LabelGrid";
import { LabelRecord, LabelSize, ColumnCount } from "../types";

interface Props {
  data: LabelRecord[];
  visibleFields: string[];
  cols: ColumnCount;
  size: LabelSize;
}

const PrintPreview: React.FC<Props> = ({ data, visibleFields, cols, size }) => {
  const lines = Math.ceil(data.length / cols);

  return (
    <div className="flex-1 p-8 overflow-y-auto print-container">
      {/* Stats (masquées à l'impression) */}
      <div className="no-print flex gap-6 mb-5 font-mono text-xs text-muted">
        <span><strong className="text-primary">{data.length}</strong> étiquettes</span>
        <span><strong className="text-primary">{cols}</strong> colonnes</span>
        <span><strong className="text-primary">{visibleFields.length}</strong> champ{visibleFields.length > 1 ? "s" : ""}</span>
        <span><strong className="text-primary">{lines}</strong> ligne{lines > 1 ? "s" : ""}</span>
      </div>

      {/* Feuille A4 */}
      <div className="a4-sheet mx-auto">
        <LabelGrid
          data={data}
          visibleFields={visibleFields}
          cols={cols}
          size={size}
        />
      </div>
    </div>
  );
};

export default PrintPreview;
