import React from "react";

interface Props {
  /** Contenu du QR : une information par ligne, ou ancien format séparé par |. */
  value: string;
  className?: string;
  /** Affichage: 'table' (par défaut) ou 'list' pour bullet points */
  mode?: "table" | "list";
}

function parseQrData(value: string) {
  if (!value) return [] as { key: string; val: string }[];

  // Accepter les QR à puces et les anciens QR séparés par des barres.
  return value
    .split(value.trimStart().startsWith("• ") || /[\r\n]/.test(value) ? /\r?\n/ : /\|/)
    .map((s) => s.trim().replace(/^•\s*/, ""))
    .filter(Boolean)
    .map((item) => {
      const idx = item.indexOf(":");
      if (idx === -1) return { key: "", val: item };
      const key = item.slice(0, idx).trim();
      const val = item.slice(idx + 1).trim();
      return { key, val };
    });
}

const QrDataTable: React.FC<Props> = ({ value, className, mode = "table" }) => {
  const rows = parseQrData(value);

  if (rows.length === 0) return null;

  if (mode === "list") {
    return (
      <div className={className}>
        <ul className="list-disc pl-6">
          {rows.map((r, i) => (
            <li key={i} className="py-2">
              {r.key ? (
                <>
                  <span className="font-semibold">{r.key}:</span>{" "}
                  <span className="font-mono text-sm">{r.val}</span>
                </>
              ) : (
                <span className="font-mono text-sm">{r.val}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={className}>
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium">Champ</th>
            <th className="px-3 py-2 font-medium">Valeur</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              {r.key ? (
                <>
                  <td className="px-3 py-2 align-top font-mono text-xs text-gray-700">
                    {r.key}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs text-gray-900">
                    {r.val}
                  </td>
                </>
              ) : (
                <td className="px-3 py-2" colSpan={2}>
                  <span className="font-mono text-xs text-gray-900">
                    {r.val}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QrDataTable;
