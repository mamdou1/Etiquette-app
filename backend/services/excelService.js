const XLSX = require("xlsx");
const { now, elapsed } = require('../utils/performance');

// ✅ "production" RETIRÉ : "Annee de production" ne doit PAS être traité comme une date
// ✅ "annee" sera exclu explicitement dans isDateField()
const DATE_HEADER_RE = /\b(date|jour|expiration|echeance)\b/i;

function normalizeHeader(header) {
  return String(header)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ✅ CORRIGÉ : exclut les colonnes d'année de la détection "date"
function isDateField(header) {
  const normalized = normalizeHeader(header);

  // ✅ Une colonne "année" n'est JAMAIS une date complète
  if (normalized.includes("anne") || normalized.includes("year")) {
    return false;
  }

  return DATE_HEADER_RE.test(normalized);
}

function formatExcelDate(value) {
  const serial = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(serial)) {
    return String(value).trim();
  }

  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) {
    return String(value).trim();
  }

  const day = String(parsed.d).padStart(2, "0");
  const month = String(parsed.m).padStart(2, "0");
  return `${day}/${month}/${parsed.y}`;
}

function cleanCellValue(header, value) {
  if (value == null) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("fr-FR");
  }

  const rawValue = String(value).trim();

  // ✅ Nettoyage spécial pour les colonnes d'année
  const normalizedHeader = normalizeHeader(header);
  if (normalizedHeader.includes("anne") || normalizedHeader.includes("year")) {
    // Si c'est un nombre entier entre 1900 et 2100, c'est une année → garder tel quel
    if (typeof value === "number" && value >= 1900 && value <= 2100) {
      return String(value);
    }
    // Si c'est un nombre hors plage, c'est probablement une date Excel mal convertie
    if (typeof value === "number") {
      // Vérifier si c'est un serial date (ex: 2015 = 07/07/1905)
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed && parsed.y < 2000) {
        // Cas spécial : année aberrante, probablement la vraie année était le nombre lui-même
        // ex: 2015 → parsed.y = 1905 → on retourne "2015"
        if (value >= 1900 && value <= 2100) {
          return String(value);
        }
        return "";
      }
    }
    return rawValue;
  }

  // ✅ Détection date normale (uniquement pour les vraies colonnes de date)
  if (
    isDateField(header) &&
    (typeof value === "number" || /^\d+(\.\d+)?$/.test(rawValue))
  ) {
    return formatExcelDate(value);
  }

  return typeof value === "string" ? rawValue : String(value).trim();
}

// ✅ Fonction pour extraire l'année du nom de la feuille
function extractYearFromSheetName(sheetName) {
  const match = sheetName.match(/\b(20\d{2})\b/);
  return match ? match[1] : null;
}

// ✅ Fonction pour détecter les en-têtes dans une feuille
function detectHeaders(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const nonEmptyCells = row.filter((cell) => cell && String(cell).trim());

    if (nonEmptyCells.length >= 3) {
      const textCount = nonEmptyCells.filter(
        (cell) => isNaN(cell) && String(cell).length > 2,
      ).length;

      if (textCount >= nonEmptyCells.length * 0.5) {
        return i;
      }
    }
  }
  return 0;
}

// ✅ Fonction pour lire une seule feuille
function parseSheet(worksheet, sheetName, perf, sheetIndex) {
  const sheetStartedAt = now();
  if (!worksheet) {
    throw new Error(`La feuille "${sheetName}" n'a pu être lue`);
  }

  const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!allRows.length) {
    return { data: [], fields: [], year: extractYearFromSheetName(sheetName) };
  }

  const headerStartedAt = now();
  const headerRowIndex = detectHeaders(allRows);
  const headerDetectionMs = elapsed(headerStartedAt);

  const headers = allRows[headerRowIndex]
    .map((h) => (h ? String(h).trim() : ""))
    .filter((h) => h);

  if (headers.length === 0) {
    return { data: [], fields: [], year: extractYearFromSheetName(sheetName) };
  }

  const data = [];
  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row?.some((cell) => cell && String(cell).trim())) continue;

    const record = {};
    headers.forEach((header, idx) => {
      record[header] = cleanCellValue(header, row[idx] ?? "");
    });
    data.push(record);
  }

  const result = {
    data,
    fields: headers,
    year: extractYearFromSheetName(sheetName),
  };
  if (perf) perf.log('excel-sheet-processing', elapsed(sheetStartedAt), {
    sheetIndex,
    rowsExamined: allRows.length,
    dataRows: data.length,
    fields: headers.length,
    headerDetectionMs: Number(headerDetectionMs.toFixed(2)),
  });
  return result;
}

// ✅ Fonction principale - lit TOUTES les feuilles
function parseExcel(filePath, perf) {
  const parseStartedAt = now();
  const workbookReadStartedAt = now();
  // ✅ CORRIGÉ : empêche la conversion automatique en Date
  const workbook = XLSX.readFile(filePath, {
    cellDates: false, // ✅ CRUCIAL : "2015" reste un nombre
    raw: true, // ✅ Garde les valeurs brutes
    cellNF: false,
    cellText: false,
  });
  if (perf) perf.log('excel-workbook-read', elapsed(workbookReadStartedAt), {
    sheets: workbook.SheetNames.length,
  });

  const sheetNames = workbook.SheetNames;

  if (!sheetNames.length) {
    throw new Error("Le fichier Excel ne contient aucune feuille");
  }

  const allData = [];
  const allFields = new Set();
  const yearData = {};

  let sheetIndex = 0;
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const result = parseSheet(worksheet, sheetName, perf, sheetIndex++);

    if (result.data.length > 0) {
      const dataWithYear = result.data.map((record) => ({
        ...record,
        _sheetYear: result.year || extractYearFromSheetName(sheetName) || "",
        _sheetName: sheetName,
      }));

      allData.push(...dataWithYear);
      result.fields.forEach((f) => allFields.add(f));

      const year =
        result.year || extractYearFromSheetName(sheetName) || "Sans année";
      if (!yearData[year]) {
        yearData[year] = [];
      }
      yearData[year].push(...dataWithYear);
    }
  }

  if (allData.length === 0) {
    throw new Error(
      "Le fichier Excel ne contient pas de données valides dans aucune feuille",
    );
  }

  const fields = Array.from(allFields);
  const availableYears = Object.keys(yearData)
    .filter((y) => y !== "Sans année")
    .sort();

  const result = {
    data: allData,
    fields: fields,
    availableYears: availableYears,
    yearData: yearData,
    totalRows: allData.length,
    sheets: sheetNames,
  };
  if (perf) perf.log('excel-workbook-transform', elapsed(parseStartedAt), {
    sheets: sheetNames.length,
    rows: allData.length,
    fields: fields.length,
    years: availableYears.length,
  });
  return result;
}

module.exports = { parseExcel };
