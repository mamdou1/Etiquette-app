import * as XLSX from "xlsx";
import { LabelRecord, BoxGroup } from "../types";

const DATE_FIELD_RE = /\b(date|jour|production|expiration|echeance)\b/i;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isDateField(field: string): boolean {
  return DATE_FIELD_RE.test(normalizeText(field));
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

export function detectBoxField(headers: string[], records: LabelRecord[]): string {
  if (headers.length === 0) return "";
  if (records.length === 0) return headers[0];

  const STRONG_BOX_KEYWORDS = ["boîte", "boite", "box", "n°", "nº", "lot", "pack", "carton", "caisse", "colis"];
  const WEAK_BOX_KEYWORDS = ["numero", "numéro", "number", "id", "identifiant", "reference", "référence", "ref"];

  let bestField = headers[0];
  let bestScore = -1;

  for (const header of headers) {
    const nh = normalizeText(header);

    const personFields = ["caissier", "caissiers", "caissiere", "preparateur", "prep", "nom", "prenom", "responsable"];
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

export function mergeRecords(records: LabelRecord[]): LabelRecord[] {
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

export function groupByBox(records: LabelRecord[], boxField: string): BoxGroup[] {
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

export function parseExcelToBoxes(file: File): Promise<{ filename: string; boxes: BoxGroup[]; fields: string[]; boxKey: string }> {
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