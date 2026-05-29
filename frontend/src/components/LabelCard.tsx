import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { LabelRecord, LabelSize } from "../types";

interface Props {
  record: LabelRecord;
  visibleFields: string[];
  size: LabelSize;
  index: number;
}

const fontScale: Record<LabelSize, number> = { sm: 0.85, md: 1, lg: 1.15 };

const LabelCard: React.FC<Props> = ({ record, visibleFields, size, index }) => {
  const scale = fontScale[size];
  const qrValue =
    visibleFields.map((k) => `${k}: ${record[k] ?? ""}`).join(" | ") ||
    `#${index + 1}`;

  return (
    <div className="label-card">
      {/* Champs */}
      <div className="flex gap-1 min-h-0">
        <div className="flex-1 min-w-0" style={{ fontSize: `${scale}em` }}>
          {visibleFields.map((key) =>
            record[key] !== undefined ? (
              <div
                key={key}
                className="mb-1 font-mono text-primary leading-snug flex items-baseline gap-1 min-w-0"
                style={{ fontSize: `${0.85 * scale}rem` }}
              >
                <span
                  className="text-muted font-medium flex-shrink-0"
                  style={{ fontSize: "0.65rem", letterSpacing: "0.05em" }}
                >
                  {key}:
                </span>
                <span
                  className="font-medium truncate overflow-hidden text-ellipsis"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {String(record[key]) || "—"}
                </span>
              </div>
            ) : null,
          )}
        </div>

        {/* QR Code */}
        <div className="flex-shrink-0 flex items-end justify-end pb-1 w-fit">
          <QRCodeSVG
            value={qrValue}
            size={size === "sm" ? 40 : size === "lg" ? 60 : 50}
            fgColor="#1a1a2e"
            bgColor="#ffffff"
            level="M"
            includeMargin={false}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-1 border-t border-dashed border-border flex justify-between items-center">
        <span className="font-mono text-border" style={{ fontSize: "0.6rem" }}>
          #{String(index + 1).padStart(3, "0")}
        </span>
      </div>
    </div>
  );
};

export default LabelCard;
