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

// Excel peut conserver une plage utilisée beaucoup plus grande que les
// cellules qui contiennent réellement des valeurs (par exemple après un
// formatage accidentel de colonnes entières). sheet_to_json matérialise alors
// toute cette zone vide. On borne sa plage à la dernière cellule renseignée.
function getPopulatedRange(worksheet) {
  const reference = worksheet["!ref"];
  const declaredRange = reference ? XLSX.utils.decode_range(reference) : null;
  let minRow = declaredRange?.s.r ?? Infinity;
  let minColumn = declaredRange?.s.c ?? Infinity;
  let maxRow = declaredRange?.s.r ?? -1;
  let maxColumn = declaredRange?.s.c ?? -1;

  for (const address of Object.keys(worksheet)) {
    if (!/^[A-Z]{1,3}\d+$/i.test(address)) continue;
    const cell = worksheet[address];
    if (!cell || ((cell.v === undefined || cell.v === null || cell.v === "") && !cell.f)) continue;

    const { r, c } = XLSX.utils.decode_cell(address);
    minRow = Math.min(minRow, r);
    minColumn = Math.min(minColumn, c);
    maxRow = Math.max(maxRow, r);
    maxColumn = Math.max(maxColumn, c);
  }

  if (maxRow < 0 || maxColumn < 0) return null;
  return { s: { r: minRow, c: minColumn }, e: { r: maxRow, c: maxColumn } };
}

// ✅ Fonction pour lire une seule feuille
function parseSheet(worksheet, sheetName, perf, sheetIndex) {
  const sheetStartedAt = now();
  if (!worksheet) {
    throw new Error(`La feuille "${sheetName}" n'a pu être lue`);
  }

  const rangeScanStartedAt = now();
  const populatedRange = getPopulatedRange(worksheet);
  const rangeScanMs = elapsed(rangeScanStartedAt);
  if (!populatedRange) {
    return { data: [], fields: [], year: extractYearFromSheetName(sheetName) };
  }

  const headerScanStartedAt = now();
  const headerScanRange = {
    s: populatedRange.s,
    e: {
      r: Math.min(populatedRange.e.r, populatedRange.s.r + 9),
      c: populatedRange.e.c,
    },
  };
  const headerRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    range: headerScanRange,
  });
  const headerScanMs = elapsed(headerScanStartedAt);

  if (!headerRows.length) {
    return { data: [], fields: [], year: extractYearFromSheetName(sheetName) };
  }

  const headerStartedAt = now();
  const headerRowIndex = detectHeaders(headerRows);
  const headerDetectionMs = elapsed(headerStartedAt);

  const headers = (headerRows[headerRowIndex] || [])
    .map((h) => (h ? String(h).trim() : ""))
    .filter((h) => h);

  if (headers.length === 0) {
    return { data: [], fields: [], year: extractYearFromSheetName(sheetName) };
  }

  // L'ancien code utilisait headers.length valeurs par ligne. Fixer cette
  // largeur évite que sheet_to_json développe des milliers de colonnes vides
  // si une cellule isolée étend la plage Excel vers la droite.
  const dataStartRow = populatedRange.s.r + headerRowIndex + 1;
  const dataRange = dataStartRow <= populatedRange.e.r
    ? {
        s: { r: dataStartRow, c: populatedRange.s.c },
        e: {
          r: populatedRange.e.r,
          c: Math.min(populatedRange.e.c, populatedRange.s.c + headers.length - 1),
        },
      }
    : null;
  const dataToJsonStartedAt = now();
  const allRows = dataRange
    ? XLSX.utils.sheet_to_json(worksheet, { header: 1, range: dataRange })
    : [];
  const dataToJsonMs = elapsed(dataToJsonStartedAt);

  const data = [];
  const rowTransformStartedAt = now();
  for (const row of allRows) {
    if (!row?.some((cell) => cell && String(cell).trim())) continue;

    const record = {};
    headers.forEach((header, idx) => {
      record[header] = cleanCellValue(header, row[idx] ?? "");
    });
    data.push(record);
  }
  const rowTransformMs = elapsed(rowTransformStartedAt);

  const result = {
    data,
    fields: headers,
    year: extractYearFromSheetName(sheetName),
  };
  if (perf) perf.log('excel-sheet-processing', elapsed(sheetStartedAt), {
    sheetIndex,
    rowsExamined: populatedRange.e.r - populatedRange.s.r + 1,
    dataRowsExamined: allRows.length,
    dataRows: data.length,
    fields: headers.length,
    rangeScanMs: Number(rangeScanMs.toFixed(2)),
    headerScanMs: Number(headerScanMs.toFixed(2)),
    dataToJsonMs: Number(dataToJsonMs.toFixed(2)),
    rowTransformMs: Number(rowTransformMs.toFixed(2)),
    boundedRows: populatedRange.e.r - populatedRange.s.r + 1,
    boundedColumns: populatedRange.e.c - populatedRange.s.c + 1,
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
