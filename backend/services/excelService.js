const XLSX = require("xlsx");

const DATE_HEADER_RE = /\b(date|jour|production|expiration|echeance)\b/i;

function normalizeHeader(header) {
  return String(header)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isDateField(header) {
  return DATE_HEADER_RE.test(normalizeHeader(header));
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
  if (isDateField(header) && (typeof value === "number" || /^\d+(\.\d+)?$/.test(rawValue))) {
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
function parseSheet(worksheet, sheetName) {
  if (!worksheet) {
    throw new Error(`La feuille "${sheetName}" n'a pu être lue`);
  }

  const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!allRows.length) {
    return { data: [], fields: [], year: extractYearFromSheetName(sheetName) };
  }

  // Trouver la ligne des en-têtes
  const headerRowIndex = detectHeaders(allRows);

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

  return {
    data,
    fields: headers,
    year: extractYearFromSheetName(sheetName)
  };
}

// ✅ Fonction principale - lit TOUTES les feuilles
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;

  if (!sheetNames.length) {
    throw new Error("Le fichier Excel ne contient aucune feuille");
  }

  const allData = [];
  const allFields = new Set();
  const yearData = {};

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const result = parseSheet(worksheet, sheetName);
    
    if (result.data.length > 0) {
      // Ajouter l'année à chaque enregistrement si elle n'existe pas déjà
      const dataWithYear = result.data.map(record => ({
        ...record,
        _sheetYear: result.year || extractYearFromSheetName(sheetName) || '',
        _sheetName: sheetName
      }));
      
      allData.push(...dataWithYear);
      result.fields.forEach(f => allFields.add(f));
      
      // Stocker par année
      const year = result.year || extractYearFromSheetName(sheetName) || 'Sans année';
      if (!yearData[year]) {
        yearData[year] = [];
      }
      yearData[year].push(...dataWithYear);
    }
  }

  if (allData.length === 0) {
    throw new Error("Le fichier Excel ne contient pas de données valides dans aucune feuille");
  }

  // Déterminer les champs communs
  const fields = Array.from(allFields);

  // Ajouter les années disponibles
  const availableYears = Object.keys(yearData).filter(y => y !== 'Sans année').sort();

  return {
    data: allData,
    fields: fields,
    availableYears: availableYears,
    yearData: yearData,
    totalRows: allData.length,
    sheets: sheetNames
  };
}

module.exports = { parseExcel };