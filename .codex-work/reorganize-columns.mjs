import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputDir = process.argv[2];
const outputDir = process.argv[3];

if (!inputDir || !outputDir) {
  throw new Error("Usage: node reorganize-columns.mjs <inputDir> <outputDir>");
}

const normalizeHeader = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const files = (await fs.readdir(inputDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "fr"));

await fs.mkdir(outputDir, { recursive: true });
const report = [];

for (const fileName of files) {
  const inputPath = path.join(inputDir, fileName);
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
  const sheet = workbook.worksheets.getItemAt(0);
  const used = sheet.getUsedRange(true);
  const values = used?.values ?? [];

  if (!values.length || !values[0]?.length) {
    throw new Error(`${fileName}: feuille vide`);
  }

  const headers = values[0].map(normalizeHeader);
  const alreadyPrepared = headers[0] === "agence"
    && headers[1] === "numero de boite"
    && !headers.includes("numero original")
    && !headers.includes("service producteur");

  if (alreadyPrepared) {
    const outputPath = path.join(outputDir, fileName);
    const output = await SpreadsheetFile.exportXlsx(workbook);
    await output.save(outputPath);
    report.push({
      fileName,
      rows: values.length,
      columnsBefore: values[0].length,
      columnsAfter: values[0].length,
      status: "already-prepared",
    });
    continue;
  }

  const findUnique = (expected) => {
    const indexes = headers
      .map((header, index) => header === expected ? index : -1)
      .filter((index) => index >= 0);
    if (indexes.length !== 1) {
      throw new Error(`${fileName}: colonne « ${expected} » trouvée ${indexes.length} fois`);
    }
    return indexes[0];
  };

  const oldBoxIndex = findUnique("numero de boite");
  const originalIndex = findUnique("numero original");
  const producerIndex = findUnique("service producteur");
  const rowCount = values.length;
  const columnCount = values[0].length;
  const retainedIndexes = Array.from({ length: columnCount }, (_, index) => index)
    .filter((index) => ![oldBoxIndex, originalIndex, producerIndex].includes(index));
  const newIndexes = [producerIndex, originalIndex, ...retainedIndexes];
  const newColumnCount = newIndexes.length;

  // Copie temporaire à droite du tableau afin de déplacer aussi les formats.
  const tempStartColumn = columnCount + 2;
  for (let targetIndex = 0; targetIndex < newIndexes.length; targetIndex += 1) {
    const source = sheet.getRangeByIndexes(0, newIndexes[targetIndex], rowCount, 1);
    const destination = sheet.getRangeByIndexes(0, tempStartColumn + targetIndex, rowCount, 1);
    destination.copyFrom(source, "all");
  }

  sheet.getRangeByIndexes(0, 0, rowCount, columnCount).clear({ applyTo: "all" });
  const temporary = sheet.getRangeByIndexes(0, tempStartColumn, rowCount, newColumnCount);
  const destination = sheet.getRangeByIndexes(0, 0, rowCount, newColumnCount);
  destination.copyFrom(temporary, "all");
  temporary.clear({ applyTo: "all" });

  sheet.getCell(0, 0).values = [["Agence"]];
  sheet.getCell(0, 1).values = [["Numéro de boîte"]];
  workbook.recalculate();

  const outputPath = path.join(outputDir, fileName);
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  report.push({
    fileName,
    rows: rowCount,
    columnsBefore: columnCount,
    columnsAfter: newColumnCount,
    status: "transformed",
  });
}

await fs.writeFile(
  path.join(outputDir, "transformation-report.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(JSON.stringify({ processed: report.length, report }, null, 2));
