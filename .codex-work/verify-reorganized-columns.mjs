import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourceDir = process.argv[2];
const outputDir = process.argv[3];
const normalize = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const canonical = (value) => value instanceof Date ? value.toISOString() : (value ?? null);
const files = (await fs.readdir(sourceDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx"))
  .map((entry) => entry.name).sort((a, b) => a.localeCompare(b, "fr"));

const failures = [];
for (const fileName of files) {
  const sourceBook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(sourceDir, fileName)));
  const outputBook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(outputDir, fileName)));
  const sourceValues = sourceBook.worksheets.getItemAt(0).getUsedRange(true)?.values ?? [];
  const outputValues = outputBook.worksheets.getItemAt(0).getUsedRange(true)?.values ?? [];
  const sourceHeaders = (sourceValues[0] ?? []).map(normalize);
  const outputHeaders = (outputValues[0] ?? []).map(normalize);

  let expected;
  if (sourceHeaders[0] === "agence" && sourceHeaders[1] === "numero de boite"
      && !sourceHeaders.includes("numero original") && !sourceHeaders.includes("service producteur")) {
    expected = sourceValues.map((row) => [...row]);
  } else {
    const oldBox = sourceHeaders.indexOf("numero de boite");
    const original = sourceHeaders.indexOf("numero original");
    const producer = sourceHeaders.indexOf("service producteur");
    const rest = sourceHeaders.map((_, index) => index)
      .filter((index) => ![oldBox, original, producer].includes(index));
    const indexes = [producer, original, ...rest];
    expected = sourceValues.map((row) => indexes.map((index) => row[index] ?? null));
    expected[0][0] = "Agence";
    expected[0][1] = "Numéro de boîte";
  }

  const shapeValid = expected.length === outputValues.length
    && expected.every((row, index) => row.length === (outputValues[index] ?? []).length);
  let firstMismatch = null;
  if (shapeValid) {
    outer: for (let row = 0; row < expected.length; row += 1) {
      for (let col = 0; col < expected[row].length; col += 1) {
        if (JSON.stringify(canonical(expected[row][col])) !== JSON.stringify(canonical(outputValues[row][col]))) {
          firstMismatch = { row: row + 1, column: col + 1, expected: expected[row][col], actual: outputValues[row][col] };
          break outer;
        }
      }
    }
  }

  const headerValid = outputHeaders[0] === "agence"
    && outputHeaders[1] === "numero de boite"
    && outputHeaders.filter((header) => header === "numero de boite").length === 1
    && !outputHeaders.includes("numero original")
    && !outputHeaders.includes("service producteur");
  if (!shapeValid || firstMismatch || !headerValid) {
    failures.push({ fileName, shapeValid, headerValid, firstMismatch, outputHeaders });
  }
}

const outputFiles = (await fs.readdir(outputDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx")).length;
console.log(JSON.stringify({ sourceFiles: files.length, outputFiles, verified: files.length - failures.length, failures }, null, 2));
if (failures.length || outputFiles !== files.length) process.exitCode = 1;
