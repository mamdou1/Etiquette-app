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
  if (value == null) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("fr-FR");
  }

  const rawValue = String(value).trim();
  if (isDateField(header) && (typeof value === "number" || /^\d+(\.\d+)?$/.test(rawValue))) {
    return formatExcelDate(value);
  }

  return typeof value === "string" ? rawValue : String(value).trim();
}

/**
 * Lit un fichier Excel et retourne un tableau d'objets JSON propres.
 * @param {string} filePath - chemin absolu du fichier uploadé
 * @returns {{ data: object[], fields: string[] }}
 */
function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("La feuille Excel n'a pu être lue");
  }

  // Lire les lignes brutes (array de arrays) pour chercher les en-têtes
  const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!allRows.length) {
    throw new Error("Le fichier Excel est vide");
  }

  // Trouver la ligne des en-têtes
  // Heuristique : première ligne avec 3+ colonnes, où au moins 50% sont du texte (pas juste des nombres)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(allRows.length, 10); i++) {
    const row = allRows[i];
    const nonEmptyCells = row.filter((cell) => cell && String(cell).trim());

    if (nonEmptyCells.length >= 3) {
      // Vérifier que c'est du texte (pas juste des nombres ou dates)
      const textCount = nonEmptyCells.filter(
        (cell) => isNaN(cell) && String(cell).length > 2,
      ).length;

      if (textCount >= nonEmptyCells.length * 0.5) {
        headerRowIndex = i;
        break;
      }
    }
  }

  // Extraire les en-têtes et les nettoyer
  const headers = allRows[headerRowIndex]
    .map((h) => (h ? String(h).trim() : ""))
    .filter((h) => h); // Garder uniquement les colonnes non-vides

  // Construire les données à partir des en-têtes trouvés
  const data = [];
  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];

    // Ignorer les lignes complètement vides
    if (!row.some((cell) => cell && String(cell).trim())) {
      continue;
    }

    const record = {};
    headers.forEach((header, idx) => {
      const value = row[idx] ?? "";
      record[header] = cleanCellValue(header, value);
    });

    data.push(record);
  }

  if (data.length === 0) {
    throw new Error("Le fichier Excel ne contient pas de données valides");
  }

  return { data, fields: headers };
}

module.exports = { parseExcel };
