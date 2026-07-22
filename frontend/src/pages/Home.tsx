import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import FileUpload from "../components/FileUpload";
import SettingsPanel from "../components/SettingsPanel";
import PrintPreview from "../components/PrintPreview";
import { uploadExcel } from "../services/api";
import { LabelRecord, BoxGroup, ColumnCount, LabelSize, FieldFilters } from "../types";

// ─── Helpers ──────────────────────────────────────────────────

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
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseInputDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasActiveFilter(filter?: FieldFilters[string]) {
  return Boolean(filter?.value?.trim() || filter?.from || filter?.to);
}

function recordMatchesFilters(record: LabelRecord, filters: FieldFilters) {
  return Object.entries(filters).every(([field, filter]) => {
    if (!hasActiveFilter(filter)) return true;

    if (isDateField(field)) {
      const recordDate = parseRecordDate(String(record[field] ?? ""));
      if (!recordDate) return false;
      const from = parseInputDate(filter.from);
      const to = parseInputDate(filter.to);
      if (from && recordDate < from) return false;
      if (to && recordDate > to) return false;
      return true;
    }

    const wanted = normalizeText(filter.value);
    if (!wanted) return true;
    return normalizeText(String(record[field] ?? "")).includes(wanted);
  });
}

// ─── Parsing Excel → Regroupement par boîte ──────────────────

function cleanCellValue(header: string, value: unknown): string {
  if (value == null) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("fr-FR");
  }

  const rawValue = String(value).trim();
  if (
    isDateField(header) &&
    (typeof value === "number" || /^\d+(\.\d+)?$/.test(rawValue))
  ) {
    const serial = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(serial)) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed) {
        const d = String(parsed.d).padStart(2, "0");
        const m = String(parsed.m).padStart(2, "0");
        return `${d}/${m}/${parsed.y}`;
      }
    }
  }

  return rawValue;
}

function detectBoxField(headers: string[], records: LabelRecord[]): string {
  if (headers.length === 0) return "";
  if (records.length === 0) return headers[0];

  const STRONG_BOX_KEYWORDS = [
    "boîte", "boite", "box", "n°", "nº",
    "lot", "pack", "carton", "caisse", "colis",
  ];
  const WEAK_BOX_KEYWORDS = [
    "numero", "numéro", "number", "no", "n°", "nº",
    "id", "identifiant",
    "reference", "référence", "ref", "ident", "unité", "unite",
    "dossier", "code", "contenant",
  ];

  let bestField = headers[0];
  let bestScore = -1;

  for (const header of headers) {
    const nh = normalizeText(header);

    const personFields = ["caissier", "caissiers", "caissiere", "preparateur", "prep", "nom", "prenom", "responsable", "agent", "employe", "employé", "personne"];
    const isPersonField = personFields.some((kw) => nh.includes(kw));
    const personPenalty = isPersonField ? 50 : 0;

    const isDate = DATE_FIELD_RE.test(nh) || nh.includes("jour") || nh.includes("date");
    const datePenalty = isDate ? 100 : 0;

    const strongMatch = STRONG_BOX_KEYWORDS.some((kw) => nh.includes(kw) || kw.includes(nh));
    const strongBonus = strongMatch ? 10.0 : 0;

    const weakMatch = WEAK_BOX_KEYWORDS.some((kw) => nh.includes(kw));
    const weakBonus = weakMatch ? 2.0 : 0;

    const values = records.map((r) => String(r[header] ?? "").trim());
    const uniqueCount = new Set(values).size;
    const totalCount = values.length;
    const duplicateRatio = uniqueCount > 0 ? 1 - uniqueCount / totalCount : 0;

    const boxPatternCount = values.filter((v) => /^\d+[/]\d+/.test(v)).length;
    const boxPatternBonus = boxPatternCount > totalCount * 0.5 ? 5.0 : 0;

    const score = strongBonus + weakBonus + duplicateRatio + boxPatternBonus - datePenalty - personPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestField = header;
    }
  }

  return bestField;
}

function mergeRecords(records: LabelRecord[]): LabelRecord[] {
  if (records.length <= 1) return records;

  const merged: LabelRecord = {};
  const allKeys = new Set<string>();
  records.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));

  for (const key of allKeys) {
    const values = records.map((r) => String(r[key] ?? "").trim());
    const uniqueValues = [...new Set(values)].filter((v) => v !== "");

    if (uniqueValues.length === 0) {
      merged[key] = "";
    } else if (uniqueValues.length === 1) {
      merged[key] = uniqueValues[0];
    } else {
      merged[key] = uniqueValues.join(", ");
    }
  }

  return [merged];
}

function groupByBox(records: LabelRecord[], boxField: string): BoxGroup[] {
  const groups = new Map<string, LabelRecord[]>();
  for (const record of records) {
    const boxVal = String(record[boxField] ?? "").trim() || "Sans boîte";
    if (!groups.has(boxVal)) groups.set(boxVal, []);
    groups.get(boxVal)!.push(record);
  }
  return Array.from(groups.entries())
    .map(([boxNumber, recs]) => ({
      boxNumber,
      records: mergeRecords(recs),
    }))
    .sort((a, b) => a.boxNumber.localeCompare(b.boxNumber, undefined, { numeric: true }));
}

function parseExcelToBoxes(file: File): Promise<{ filename: string; boxes: BoxGroup[]; fields: string[]; boxKey: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error("La feuille Excel n'a pu être lue");

        const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!allRows.length) throw new Error("Le fichier Excel est vide");

        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(allRows.length, 10); i++) {
          const row = allRows[i];
          const nonEmptyCells = row.filter((cell: any) => cell && String(cell).trim());
          if (nonEmptyCells.length >= 3) {
            const textCount = nonEmptyCells.filter(
              (cell: any) => isNaN(cell) && String(cell).length > 2,
            ).length;
            if (textCount >= nonEmptyCells.length * 0.5) {
              headerRowIndex = i;
              break;
            }
          }
        }

        const headers = allRows[headerRowIndex]
          .map((h: any) => (h ? String(h).trim() : ""))
          .filter((h: string) => h);

        const records: LabelRecord[] = [];
        for (let i = headerRowIndex + 1; i < allRows.length; i++) {
          const row = allRows[i];
          if (!row?.some((cell: any) => cell && String(cell).trim())) continue;
          const record: LabelRecord = {};
          headers.forEach((header: string, idx: number) => {
            record[header] = cleanCellValue(header, row[idx] ?? "");
          });
          records.push(record);
        }

        if (!records.length) throw new Error("Aucune donnée valide trouvée");

        const boxKey = detectBoxField(headers, records);
        const boxes = groupByBox(records, boxKey);

        resolve({ filename: file.name, boxes, fields: headers, boxKey });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Composant Home ───────────────────────────────────────────

const Home: React.FC = () => {
  const [boxes, setBoxes] = useState<BoxGroup[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);
  const [cols, setCols] = useState<ColumnCount>(2);
  const [size, setSize] = useState<LabelSize>("md");
  const [filters, setFilters] = useState<FieldFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [boxField, setBoxField] = useState<string>("");
  const [enrichedInfo, setEnrichedInfo] = useState<{ original: number; saved: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const allRecords = useMemo(() => boxes.flatMap((b) => b.records), [boxes]);

  const filteredRecords = useMemo(
    () => allRecords.filter((record) => recordMatchesFilters(record, filters)),
    [allRecords, filters],
  );

  const filteredBoxes = useMemo(() => {
    if (!boxField || !filteredRecords.length) return [];
    return groupByBox(filteredRecords, boxField);
  }, [filteredRecords, boxField]);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError("");
    setEnrichedInfo(null);
    
    try {
      // 1. Parser le fichier Excel (frontend)
      const result = await parseExcelToBoxes(file);
      
      setBoxes(result.boxes);
      setFields(result.fields);
      setVisibleFields(result.fields);
      setFilename(result.filename);
      setBoxField(result.boxKey);
      setFilters({});

      // 2. ✅ Envoyer les données au backend pour stockage
      setUploading(true);
      try {
        const response = await uploadExcel(file);
        if (response.success && response.enriched) {
          setEnrichedInfo({
            original: response.originalCount || 0,
            saved: response.savedCount || 0,
          });
        }
      } catch (err: any) {
        console.warn("⚠️ Stockage dans les archives échoué:", err.message);
        // Ne pas bloquer l'affichage si le stockage échoue
      } finally {
        setUploading(false);
      }

    } catch (err: any) {
      setError(err.message || "Erreur lors de la lecture du fichier");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setBoxes([]);
    setFields([]);
    setVisibleFields([]);
    setFilters({});
    setFilename("");
    setError("");
    setEnrichedInfo(null);
  };

  const toggleField = (key: string) => {
    setVisibleFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleReorderFields = (startIndex: number, endIndex: number) => {
    setVisibleFields((prev) => {
      const newOrder = [...prev];
      const [removed] = newOrder.splice(startIndex, 1);
      newOrder.splice(endIndex, 0, removed);
      return newOrder;
    });
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

  const clearFilters = () => setFilters({});

  const hasData = boxes.length > 0;
  const totalBoxes = filteredBoxes.length;

  return (
    <div className="flex flex-1 min-h-[calc(100vh-120px)]">
      {!hasData ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
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
                Les données seront regroupées par boîte et converties en étiquettes imprimables
              </p>
            </div>
            <FileUpload onFile={handleFile} loading={loading || uploading} />
            
            {error && (
              <p className="mt-3 text-sm text-accent font-mono text-center bg-accent-light border border-accent px-3 py-2 rounded">
                ⚠ {error}
              </p>
            )}

            {enrichedInfo && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-700 font-mono">
                  ✅ Stockage terminé : 
                  <span className="font-bold"> {enrichedInfo.original}</span> ligne(s) traitées
                  → <span className="font-bold">{enrichedInfo.saved}</span> ligne(s) sauvegardée(s) dans les archives
                </p>
              </div>
            )}

            <div className="mt-6 border border-border bg-white p-4 rounded-lg">
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                Structure Excel attendue
              </p>
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-surface">
                    {["N° de la Boite", "Date de Production", "Type de Document", "Nom des caissiers", "Nom de l'Agence", "Année", "Observation"].map((h) => (
                      <th key={h} className="border border-border px-2 py-1 text-left text-muted font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {["BOX-001", "08/08/2023", "Pièces de caisse", "Djénéba C.", "DGEI", "2023", "Test"].map((c, i) => (
                      <td key={i} className="border border-border px-2 py-1">{c}</td>
                    ))}
                  </tr>
                  <tr>
                    {["BOX-002", "09/08/2023", "Pièces de caisse", "Moussa D.", "DGEI", "2023", ""].map((c, i) => (
                      <td key={i} className="border border-border px-2 py-1">{c}</td>
                    ))}
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
            filters={filters}
            onToggleField={toggleField}
            onReorderFields={handleReorderFields}
            onColsChange={setCols}
            onSizeChange={setSize}
            onFilterChange={updateFilter}
            onClearFilters={clearFilters}
            onPrint={() => window.print()}
            onReset={reset}
            filename={filename}
            total={totalBoxes}
            sourceTotal={boxes.length}
          />
          <PrintPreview
            boxes={filteredBoxes}
            fields={fields}
            visibleFields={visibleFields}
            cols={cols}
            size={size}
            boxField={boxField}
          />
        </>
      )}
    </div>
  );
};

export default Home;