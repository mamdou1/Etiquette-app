import React from "react";
import formatProductionDates from "../utils/formatProductionDates";

interface Props {
  dates: string[];
  maxCols?: number; // 3 or 4
}

const ProductionDatesPreview: React.FC<Props> = ({ dates, maxCols = 3 }) => {
  const groups = formatProductionDates(dates);

  // Tailwind-friendly responsive grid: 3 cols on small, 4 on md if requested
  const baseClass = maxCols === 4 ? "w-1/2 sm:w-1/4" : "w-1/2 sm:w-1/3";

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g, idx) => (
        <div
          key={idx}
          className={`${baseClass} px-1`}
          style={{ minWidth: 120 }}
        >
          <div className="p-2 border border-border rounded bg-white text-center text-sm break-words">
            {g.split("\n").map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductionDatesPreview;
