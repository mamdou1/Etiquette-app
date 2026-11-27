import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputDir = process.argv[2];
const files = (await fs.readdir(inputDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "fr"));

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();

const anomalies = [];
for (const fileName of files) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(inputDir, fileName)));
  const sheet = workbook.worksheets.getItemAt(0);
  const values = sheet.getUsedRange(true)?.values ?? [];
  const rawHeaders = values[0] ?? [];
  const headers = rawHeaders.map(normalize);
  const count = (name) => headers.filter((header) => header === name).length;
  if (count("numero de boite") !== 1 || count("numero original") !== 1 || count("service producteur") !== 1) {
    anomalies.push({ fileName, headers: rawHeaders });
  }
}

console.log(JSON.stringify({ files: files.length, anomalies }, null, 2));
