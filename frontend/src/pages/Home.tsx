import React, { useMemo, useState } from "react";
import FileUpload from "../components/FileUpload";
import SettingsPanel from "../components/SettingsPanel";
import PrintPreview from "../components/PrintPreview";
import { uploadExcel } from "../services/api";
import { LabelRecord, ColumnCount, LabelSize, FieldFilters } from "../types";

const DATE_FIELD_RE = /\b(date|jour|production|expiration|echeance)\b/i;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isDateField(field: string) {
  return DATE_FIELD_RE.test(normalizeText(field));
}

function parseRecordDate(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function parseInputDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasActiveFilter(filter?: FieldFilters[string]) {
  return Boolean(filter?.value?.trim() || filter?.from || filter?.to);
}

function recordMatchesFilters(record: LabelRecord, filters: FieldFilters) {
  return Object.entries(filters).every(([field, filter]) => {
    if (!hasActiveFilter(filter)) {
      return true;
    }

    if (isDateField(field)) {
      const recordDate = parseRecordDate(record[field]);
      if (!recordDate) {
        return false;
      }

      const from = parseInputDate(filter.from);
      const to = parseInputDate(filter.to);

      if (from && recordDate < from) {
        return false;
      }

      if (to && recordDate > to) {
        return false;
      }

      return true;
    }

    const wanted = normalizeText(filter.value);
    if (!wanted) {
      return true;
    }

    return normalizeText(record[field]).includes(wanted);
  });
}

const Home: React.FC = () => {
  const [data, setData] = useState<LabelRecord[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [cols, setCols] = useState<ColumnCount>(3);
  const [size, setSize] = useState<LabelSize>("md");
  const [filters, setFilters] = useState<FieldFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  const filteredData = useMemo(
    () => data.filter((record) => recordMatchesFilters(record, filters)),
    [data, filters],
  );

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const res = await uploadExcel(file);
      setData(res.data);
      setFields(res.fields);
      setVisibleFields(res.fields);
      setFilters({});
      setFilename(res.filename);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData([]);
    setFields([]);
    setVisibleFields([]);
    setFilters({});
    setFilename("");
    setError("");
  };

  const toggleField = (key: string) => {
    setVisibleFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const updateFilter = (
    field: string,
    key: "value" | "from" | "to",
    value: string,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value,
      },
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasData = data.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="no-print bg-primary text-white px-8 py-4 flex items-center gap-4 border-b-4 border-accent">
        <div className="w-10 h-10 bg-accent flex items-center justify-center font-mono font-bold text-base flex-shrink-0">
          ÉT
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            Générateur d'Étiquettes
          </h1>
          <p className="text-xs text-white/50 font-mono mt-0.5">
            Import Excel → QR Codes → Impression A4
          </p>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Zone principale */}
        {!hasData ? (
          <main className="flex-1 flex items-center justify-center bg-[#f0ede8]">
            <div className="w-full max-w-md px-6">
              <div className="text-center mb-6">
                <svg
                  className="mx-auto mb-4 opacity-20"
                  width="72"
                  height="72"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1a1a2e"
                  strokeWidth="0.8"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                <h2 className="text-xl font-bold mb-1">
                  Importer un fichier Excel
                </h2>
                <p className="text-sm text-muted font-mono">
                  Les données seront converties en étiquettes imprimables avec
                  QR codes
                </p>
              </div>
              <FileUpload onFile={handleFile} loading={loading} />
              {error && (
                <p className="mt-3 text-sm text-accent font-mono text-center bg-accent-light border border-accent px-3 py-2">
                  ⚠ {error}
                </p>
              )}
              <div className="mt-6 border border-border bg-white p-4">
                <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                  Structure Excel attendue
                </p>
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-surface">
                      {["Nom", "Prénom", "Adresse", "Agence"].map((h) => (
                        <th
                          key={h}
                          className="border border-border px-2 py-1 text-left text-muted font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border px-2 py-1">Diallo</td>
                      <td className="border border-border px-2 py-1">Moussa</td>
                      <td className="border border-border px-2 py-1">Bamako</td>
                      <td className="border border-border px-2 py-1">
                        ACI 2000
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-border px-2 py-1">Traoré</td>
                      <td className="border border-border px-2 py-1">
                        Fatoumata
                      </td>
                      <td className="border border-border px-2 py-1">
                        Sogoniko
                      </td>
                      <td className="border border-border px-2 py-1">
                        Hippodrome
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        ) : (
          <>
            <SettingsPanel
              fields={fields}
              visibleFields={visibleFields}
              cols={cols}
              size={size}
              onToggleField={toggleField}
              onColsChange={setCols}
              onSizeChange={setSize}
              filters={filters}
              onFilterChange={updateFilter}
              onClearFilters={clearFilters}
              onPrint={() => window.print()}
              onReset={reset}
              filename={filename}
              total={filteredData.length}
              sourceTotal={data.length}
            />
            <PrintPreview
              data={filteredData}
              visibleFields={visibleFields}
              cols={cols}
              size={size}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
