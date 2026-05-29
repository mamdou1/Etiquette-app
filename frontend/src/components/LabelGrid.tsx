import React from "react";
import LabelCard from "./LabelCard";
import { LabelRecord, LabelSize, ColumnCount } from "../types";

interface Props {
  data: LabelRecord[];
  visibleFields: string[];
  cols: ColumnCount;
  size: LabelSize;
}

const LabelGrid: React.FC<Props> = ({ data, visibleFields, cols, size }) => {
  return (
    <div
      className="label-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "10px",
      }}
    >
      {data.map((record, i) => (
        <LabelCard
          key={i}
          record={record}
          visibleFields={visibleFields}
          size={size}
          index={i}
        />
      ))}
    </div>
  );
};

export default LabelGrid;
