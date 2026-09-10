import React, { useMemo, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import FileUpload from "../components/FileUpload";
import SettingsPanel from "../components/SettingsPanel";
import PrintPreview from "../components/PrintPreview";
import { uploadExcel } from "../services/api";
import { getAllAgences, Agence } from "../services/agenceService";
import {
  getTypesByAgence,
  TypeDocument,
} from "../services/typeDocumentService";
import {
  LabelRecord,
  BoxGroup,
  ColumnCount,
  LabelSize,
  FieldFilters,
} from "../types";
import { useSettings } from "../contexts/SettingsContext";

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

function isYearField(field: string) {
  const normalized = normalizeText(field);
  return (
    normalized === "annee" ||
    normalized === "annees" ||
    normalized === "year" ||
    normalized.includes("annee")
  );
}

function recordMatchesSelectedYears(
  record: LabelRecord,
  selectedYears: string[],
): boolean {
  if (selectedYears.length === 0) return true;
  
  const sheetYear = String(record._sheetYear || "").trim();
  if (sheetYear && selectedYears.includes(sheetYear)) return true;
  
  const yearFields = Object.keys(record).filter(f => 
    isYearField(f) || 
    f === 'annee' || 
    f === 'année' ||
    f === 'year'
  );
  
  for (const field of yearFields) {
    const value = String(record[field] ?? "").trim();
    if (!value) continue;
    
    const years = value.split(/[,;|]/).map(y => y.trim()).filter(Boolean);
    if (years.some(year => selectedYears.includes(year))) return true;
  }
  
  const boxNumberKeys = ["N° de la Boite", "N° de la Boîte", "numero_boite", "Numéro de la boite"];
  for (const key of boxNumberKeys) {
    const boxNumber = String(record[key] || "").trim();
    if (boxNumber) {
      const match = boxNumber.match(/\/(20\d{2})/);
      if (match && selectedYears.includes(match[1])) return true;
    }
  }
  
  return false;
}

function extractYearFromSheetName(sheetName: string): string | null {
  const match = sheetName.match(/\b(20\d{2})\b/);
  return match ? match[1] : null;
}

function extractYearFromBoxNumber(boxNumber: string): string | null {
  const match = boxNumber.match(/\/(20\d{2})/);
  return match ? match[1] : null;
}

function detectHeaders(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const nonEmptyCells = row.filter((cell: any) => cell && String(cell).trim());

    if (nonEmptyCells.length >= 3) {
      const textCount = nonEmptyCells.filter(
        (cell: any) => isNaN(cell) && String(cell).length > 2,
      ).length;

      if (textCount >= nonEmptyCells.length * 0.5) {
        return i;
      }
    }
  }
  return 0;
}

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
    "id", "identifiant", "reference", "référence", "ref",
    "ident", "unité", "unite", "dossier", "code", "contenant",
  ];

  let bestField = headers[0];
  let bestScore = -1;

  for (const header of headers) {
    const nh = normalizeText(header);

    const personFields = [
      "caissier", "caissiers", "caissiere", "preparateur", "prep",
      "nom", "prenom", "responsable", "agent", "employe", "employé", "personne",
    ];
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
  const groups = new Map<string, { records: LabelRecord[]; year: string }>();
  
  for (const record of records) {
    const boxVal = String(record[boxField] ?? "").trim() || "Sans boîte";
    const year = String(record._sheetYear || record.annee || record.année || "").trim();
    
    if (!groups.has(boxVal)) {
      groups.set(boxVal, { records: [], year });
    }
    groups.get(boxVal)!.records.push(record);
  }
  
  return Array.from(groups.entries())
    .map(([boxNumber, { records, year }]) => ({
      boxNumber,
      records: mergeRecords(records),
      year: year || extractYearFromBoxNumber(boxNumber) || undefined,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) {
        return (a.year || '').localeCompare(b.year || '');
      }
      return a.boxNumber.localeCompare(b.boxNumber, undefined, { numeric: true });
    });
}

function parseExcelToBoxes(file: File): Promise<{
  filename: string;
  boxes: BoxGroup[];
  records: LabelRecord[];
  fields: string[];
  boxKey: string;
  availableYears: string[];
  sheetData: { [sheetName: string]: { boxes: BoxGroup[]; records: LabelRecord[]; year: string } };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetNames = workbook.SheetNames;

        if (!sheetNames.length) {
          throw new Error("Le fichier Excel ne contient aucune feuille");
        }

        let allRecords: LabelRecord[] = [];
        let allFields = new Set<string>();
        const allBoxes: BoxGroup[] = [];
        const sheetData: { [sheetName: string]: { boxes: BoxGroup[]; records: LabelRecord[]; year: string } } = {};
        const availableYearsSet = new Set<string>();

        for (const sheetName of sheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          const allRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (!allRows.length) continue;

          const headerRowIndex = detectHeaders(allRows);
          const headers = allRows[headerRowIndex]
            .map((h: any) => (h ? String(h).trim() : ""))
            .filter((h: string) => h);

          if (headers.length === 0) continue;

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

          if (records.length === 0) continue;

          let year = extractYearFromSheetName(sheetName) || '';
          
          if (!year) {
            const yearField = headers.find(h => 
              normalizeText(h).includes("annee") || 
              normalizeText(h).includes("year")
            );
            if (yearField && records.length > 0) {
              const firstYear = String(records[0][yearField] || "").trim();
              const match = firstYear.match(/\b(20\d{2})\b/);
              if (match) year = match[1];
            }
          }

          if (!year) {
            const boxKey = detectBoxField(headers, records);
            if (boxKey && records.length > 0) {
              const firstBox = String(records[0][boxKey] || "").trim();
              const extractedYear = extractYearFromBoxNumber(firstBox);
              if (extractedYear) year = extractedYear;
            }
          }

          if (!year) {
            year = 'Sans année';
          }

          const recordsWithYear = records.map(record => ({
            ...record,
            _sheetName: sheetName,
            _sheetYear: year
          }));

          allRecords.push(...recordsWithYear);
          headers.forEach(h => allFields.add(h));

          const boxKey = detectBoxField(headers, recordsWithYear);
          const boxes = groupByBox(recordsWithYear, boxKey);
          allBoxes.push(...boxes);

          sheetData[sheetName] = {
            boxes: boxes,
            records: recordsWithYear,
            year: year
          };

          if (year !== 'Sans année') {
            availableYearsSet.add(year);
          }
        }

        if (allRecords.length === 0) {
          throw new Error("Aucune donnée valide trouvée dans le fichier");
        }

        const allHeaders = Array.from(allFields);
        const boxKey = detectBoxField(allHeaders, allRecords);
        const availableYears = Array.from(availableYearsSet).sort();

        resolve({
          filename: file.name,
          boxes: allBoxes,
          records: allRecords,
          fields: allHeaders,
          boxKey,
          availableYears,
          sheetData,
        });
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
  const {
    cols,
    size,
    visibleFields,
    filters,
    setCols,
    setSize,
    setVisibleFields,
    setFilters,
    updateFilter,
    clearFilters,
    toggleField,
    reorderFields,
  } = useSettings();

  const [boxes, setBoxes] = useState<BoxGroup[]>([]);
  const [rawRecords, setRawRecords] = useState<LabelRecord[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [boxField, setBoxField] = useState<string>("");
  const [enrichedInfo, setEnrichedInfo] = useState<{ original: number; saved: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [availableYearsFromFile, setAvailableYearsFromFile] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [importStats, setImportStats] = useState<{
    saved: number;
    doublons: number;
    agences: number;
    nouvellesAgences: number;
    types: number;
    nouveauxTypes: number;
    relations: number;
    isReimport: boolean;
    message?: string;
  } | null>(null);

  const [agences, setAgences] = useState<Agence[]>([]);
  const [types, setTypes] = useState<TypeDocument[]>([]);
  const [selectedAgenceId, setSelectedAgenceId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [loadingAgences, setLoadingAgences] = useState(false);

  useEffect(() => {
    const loadAgences = async () => {
      setLoadingAgences(true);
      try {
        const response = await getAllAgences();
        setAgences(response.data);
        if (response.data.length > 0) {
          setSelectedAgenceId(response.data[0].id);
        }
      } catch (err) {
        console.error("Erreur chargement agences:", err);
        setError("Impossible de charger les agences");
      } finally {
        setLoadingAgences(false);
      }
    };
    loadAgences();
  }, []);

  useEffect(() => {
    const loadTypes = async () => {
      if (!selectedAgenceId) {
        setTypes([]);
        setSelectedTypeId(null);
        return;
      }

      try {
        const response = await getTypesByAgence(selectedAgenceId);
        setTypes(response.data);
        if (response.data.length > 0) {
          setSelectedTypeId(response.data[0].id);
        } else {
          setSelectedTypeId(null);
        }
      } catch (err) {
        console.error("Erreur chargement types:", err);
        setTypes([]);
        setSelectedTypeId(null);
      }
    };
    loadTypes();
  }, [selectedAgenceId]);

  const allRecords = rawRecords;
  
  const filteredRecords = useMemo(
    () =>
      allRecords.filter((record) => {
        const matchesFilters = recordMatchesFilters(record, filters);
        if (!matchesFilters) return false;
        
        const matchesYears = recordMatchesSelectedYears(record, selectedYears);
        if (!matchesYears) return false;
        
        return true;
      }),
    [allRecords, filters, selectedYears],
  );

  const availableYears = useMemo(() => {
    if (availableYearsFromFile.length > 0) {
      return availableYearsFromFile;
    }
    return [...new Set(
      allRecords.flatMap((record) => {
        const years: string[] = [];
        if (record._sheetYear) years.push(String(record._sheetYear));
        Object.keys(record).forEach(key => {
          if (isYearField(key) || key === 'annee' || key === 'année') {
            const value = String(record[key] ?? "").trim();
            if (value) {
              value.split(/[,;|]/).forEach(y => {
                const trimmed = y.trim();
                if (trimmed) years.push(trimmed);
              });
            }
          }
        });
        return years;
      })
    )].sort();
  }, [allRecords, availableYearsFromFile]);

  const filteredBoxes = useMemo(() => {
    if (!boxField || !filteredRecords.length) return [];
    return groupByBox(filteredRecords, boxField);
  }, [filteredRecords, boxField]);

  const displayError = (errorMessage: string) => {
    let displayMsg = errorMessage;
    let suggestion = '';
    
    if (errorMessage.includes("type") && errorMessage.includes("Pièce de caisse")) {
      suggestion = '\n💡 Astuce: Sélectionnez "Pièces de caisse" dans le menu déroulant.';
    } else if (errorMessage.includes("agence")) {
      suggestion = '\n💡 Astuce: Vérifiez que le nom de l\'agence correspond à celui sélectionné.';
    } else if (errorMessage.includes("créer un nouveau type")) {
      suggestion = '\n💡 Astuce: Créez d\'abord ce type dans la section "Types de documents".';
    }
    
    setError(displayMsg + suggestion);
    setBoxes([]);
    setRawRecords([]);
    setUploadSuccess(false);
  };

  const handleFile = async (file: File) => {
    if (!selectedAgenceId) {
      setError("Veuillez sélectionner une agence");
      return;
    }
    if (!selectedTypeId) {
      setError("Veuillez sélectionner un type de document");
      return;
    }

    setLoading(true);
    setError("");
    setEnrichedInfo(null);
    setImportStats(null);
    setUploadSuccess(false);
    setBoxes([]);
    setRawRecords([]);

    try {
      const result = await parseExcelToBoxes(file);

      setFields(result.fields);
      setFilename(result.filename);
      setBoxField(result.boxKey);
      setFilters({});
      setAvailableYearsFromFile(result.availableYears);
      setSelectedYears(result.availableYears);
      setSheetNames(Object.keys(result.sheetData || {}));

      setUploading(true);
      setError("⏳ Vérification et stockage en cours...");
      
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("agence_id", String(selectedAgenceId));
        formData.append("type_document_id", String(selectedTypeId));

        const response = await uploadExcel(formData);
        
        console.log("📥 Réponse du backend:", response);
        
        // ✅ Vérifier si la réponse contient des données
        if (response && response.success) {
          console.log("✅ Upload réussi, données reçues");
          
          if (response.enriched && response.enriched.length > 0) {
            console.log(`📦 ${response.enriched.length} boîtes enrichies reçues`);
            
            const metaFields = response.metaFields || [];
            const metaFieldNames = metaFields.map((mf: { name: string }) => mf.name);

            const allFields = ["numero_boite", ...metaFieldNames];
            setVisibleFields(allFields);
            setDetectedFields(allFields);

            if (response.availableYears) {
              setAvailableYearsFromFile(response.availableYears);
              setSelectedYears(response.availableYears);
            }

            const enrichedBoxes = response.enriched.map((item: any) => {
              const record: any = {
                numero_boite: item.numero_boite,
                annee: item.annee,
              };
              
              if (item.metaValues) {
                Object.keys(item.metaValues).forEach((key: string) => {
                  record[key] = item.metaValues[key];
                });
              }
              
              return {
                boxNumber: item.numero_boite,
                records: [record],
                year: item.annee,
              };
            });

            // ✅ AFFICHER LES ÉTIQUETTES
            setBoxes(enrichedBoxes);
            setUploadSuccess(true);
            
            const allRecords: LabelRecord[] = enrichedBoxes.reduce(
              (acc: LabelRecord[], box: { boxNumber: string; records: LabelRecord[] }) => {
                return [...acc, ...box.records];
              },
              [] as LabelRecord[]
            );
            setRawRecords(allRecords);

            setEnrichedInfo({
              original: response.totalLignes || 0,
              saved: response.savedCount || 0,
            });

            setImportStats({
              saved: response.savedCount || 0,
              doublons: 0,
              agences: response.agenceTrouvees?.length || 0,
              nouvellesAgences: 0,
              types: response.typesTrouves?.length || 0,
              nouveauxTypes: response.metaFieldsCrees || 0,
              relations: response.totalBoites || 0,
              isReimport: false,
              message: response.message || "Importation réussie",
            });
            
            setError(""); // ✅ Effacer l'erreur
            console.log("✅ Étiquettes affichées avec succès !");
            
          } else {
            // ✅ Même si enriched est vide, on peut afficher les données du parsing
            console.warn("⚠️ Aucune donnée enrichie, utilisation des données du parsing");
            setBoxes(result.boxes);
            setUploadSuccess(true);
            setRawRecords(result.records);
            setVisibleFields(result.fields);
            setDetectedFields(result.fields);
            
            setImportStats({
              saved: result.boxes.length || 0,
              doublons: 0,
              agences: 1,
              nouvellesAgences: 0,
              types: 1,
              nouveauxTypes: 0,
              relations: result.boxes.length || 0,
              isReimport: false,
              message: `${result.boxes.length} boîtes importées avec succès`,
            });
            
            setError("");
            console.log("✅ Étiquettes affichées avec les données du parsing");
          }
        } else {
          console.warn("⚠️ Réponse inattendue du backend:", response);
          setError("La réponse du serveur n'est pas au format attendu");
        }
        
      } catch (err: any) {
        console.warn("⚠️ Validation/Stockage échoué:", err.message);
        
        let errorMessage = "Erreur lors de la validation";
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        displayError(errorMessage);
        
      } finally {
        setUploading(false);
      }
    } catch (err: any) {
      console.error("❌ Erreur:", err);
      setError(err.message || "Erreur lors de la lecture du fichier");
      setBoxes([]);
      setRawRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setBoxes([]);
    setRawRecords([]);
    setFields([]);
    setVisibleFields([]);
    setFilters({});
    setFilename("");
    setError("");
    setEnrichedInfo(null);
    setSelectedYears([]);
    setAvailableYearsFromFile([]);
    setSheetNames([]);
    setImportStats(null);
    setDetectedFields([]);
    setUploadSuccess(false);
  };

  const toggleYear = (year: string) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year].sort();
      }
    });
  };

  const hasData = boxes.length > 0 && uploadSuccess;
  const totalBoxes = filteredBoxes.length;

  console.log("📊 hasData:", hasData, "boxes:", boxes.length, "uploadSuccess:", uploadSuccess);

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
              <p className="text-xs text-muted/60 font-mono mt-1">
                📄 Supporte les fichiers avec plusieurs feuilles (une par année)
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Agence *
                </label>
                <select
                  value={selectedAgenceId || ""}
                  onChange={(e) => setSelectedAgenceId(Number(e.target.value))}
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm"
                  disabled={loadingAgences}
                >
                  <option value="">Sélectionner une agence</option>
                  {agences.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom} {!a.active && "(inactive)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs text-muted mb-1 font-semibold">
                  Type de document *
                </label>
                <select
                  value={selectedTypeId || ""}
                  onChange={(e) => setSelectedTypeId(Number(e.target.value))}
                  className="w-full border border-border px-4 py-2.5 rounded focus:outline-none focus:border-accent font-mono text-sm"
                  disabled={!selectedAgenceId || loadingAgences}
                >
                  <option value="">Sélectionner un type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} {!t.active && "(inactif)"}
                    </option>
                  ))}
                </select>
                {selectedAgenceId && types.length === 0 && !loadingAgences && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Aucun type assigné à cette agence
                  </p>
                )}
              </div>
            </div>

            <FileUpload onFile={handleFile} loading={loading || uploading} />

            {error && (
              <div className="mt-3 p-4 rounded border border-red-500 bg-red-50">
                <div className="flex items-start gap-3">
                  <div className="text-red-500 text-xl">❌</div>
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-mono font-semibold">
                      Erreur de validation
                    </p>
                    <p className="text-sm text-red-600 font-mono whitespace-pre-line">
                      {error}
                    </p>
                    {(error.includes("type") || error.includes("Pièce")) && (
                      <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                        <p className="text-xs text-red-700 font-mono">
                          💡 Astuce: Vérifiez que le type de document dans votre fichier Excel 
                          correspond à celui sélectionné dans le menu déroulant.
                        </p>
                        <p className="text-xs text-red-600 font-mono mt-1">
                          📌 Exemple: "Pièce de caisse" → sélectionnez "Pièces de caisse"
                        </p>
                      </div>
                    )}
                    {error.includes("agence") && (
                      <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
                        <p className="text-xs text-red-700 font-mono">
                          💡 Astuce: Vérifiez que le nom de l'agence dans votre fichier Excel 
                          correspond à celui sélectionné dans le menu déroulant.
                        </p>
                      </div>
                    )}
                    {error.includes("créer") && (
                      <div className="mt-2 p-2 bg-amber-100 rounded border border-amber-300">
                        <p className="text-xs text-amber-700 font-mono">
                          💡 Le type que vous utilisez n'existe pas encore dans la base de données.
                          Veuillez le créer d'abord dans la section "Types de documents".
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {importStats && uploadSuccess && (
              <div
                className={`mt-3 p-3 rounded border ${
                  importStats.isReimport
                    ? "bg-amber-50 border-amber-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p
                  className={`text-sm font-mono ${
                    importStats.isReimport ? "text-amber-700" : "text-green-700"
                  }`}
                >
                  {importStats.isReimport ? "🔄" : "✅"}
                  {importStats.message ||
                    `Stockage terminé : ${importStats.saved} boîte(s) sauvegardée(s)`}
                  {importStats.doublons > 0 && (
                    <span className="text-amber-600 ml-2">
                      ⚠️ {importStats.doublons} doublon(s) ignoré(s)
                    </span>
                  )}
                </p>
                <div className="mt-1 text-xs text-muted font-mono flex flex-wrap gap-3">
                  <span>🏢 {importStats.agences} agence(s) trouvée(s)</span>
                  {importStats.nouvellesAgences > 0 && (
                    <span className="text-accent">
                      ✨ +{importStats.nouvellesAgences} nouvelle(s)
                    </span>
                  )}
                  <span>📄 {importStats.types} type(s) trouvé(s)</span>
                  {importStats.nouveauxTypes > 0 && (
                    <span className="text-accent">
                      ✨ +{importStats.nouveauxTypes} nouveau(x)
                    </span>
                  )}
                  <span>🔗 {importStats.relations} relation(s) créée(s)</span>
                </div>
                {detectedFields.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted/60 font-mono">
                    🔍 Champs détectés : {detectedFields.join(", ")}
                  </p>
                )}
                {sheetNames.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted/60 font-mono">
                    📑 Feuilles : {sheetNames.join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 border border-border bg-white p-4 rounded-lg">
              <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">
                Structure Excel attendue
              </p>
              <p className="text-xs text-muted/60 font-mono mb-2">
                📌 Chaque feuille peut correspondre à une année (ex: 2021, 2022, 2023)
              </p>
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-surface">
                    {[
                      "N° de la Boite",
                      "Date de Production",
                      "Type de Document",
                      "Nom des caissiers",
                      "Nom de l'Agence",
                      "Année",
                    ].map((h) => (
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
                    {[
                      "001/2023",
                      "08/08/2023",
                      "Pièces de caisse",
                      "Djénéba C.",
                      "DGEI",
                      "2023",
                    ].map((c, i) => (
                      <td key={i} className="border border-border px-2 py-1">
                        {c}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    {[
                      "002/2023",
                      "09/08/2023",
                      "Pièces de caisse",
                      "Moussa D.",
                      "DGEI",
                      "2023",
                    ].map((c, i) => (
                      <td key={i} className="border border-border px-2 py-1">
                        {c}
                      </td>
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
            filename={filename}
            total={totalBoxes}
            sourceTotal={boxes.length}
            availableYears={availableYears}
            selectedYears={selectedYears}
            onToggleYear={toggleYear}
            onPrint={() => window.print()}
            onReset={reset}
          />
          <PrintPreview
            boxes={filteredBoxes}
            fields={fields}
            visibleFields={visibleFields}
            cols={cols}
            size={size}
            boxField={boxField}
            selectedYears={selectedYears}
          />
        </>
      )}
    </div>
  );
};

export default Home;