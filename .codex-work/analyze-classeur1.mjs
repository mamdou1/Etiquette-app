import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const filePath = process.argv[2];
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(filePath));
const sheets = [];

for (let index = 0; ; index += 1) {
  let sheet;
  try {
    sheet = workbook.worksheets.getItemAt(index);
  } catch {
    break;
  }
  if (!sheet) break;
  const values = sheet.getUsedRange(true)?.values ?? [];
  const headers = values[0] ?? [];
  const columns = headers.map((header, columnIndex) => {
    const data = values.slice(1).map((row) => row[columnIndex]).filter((value) => value !== null && value !== undefined && String(value).trim() !== "");
    const unique = [...new Set(data.map((value) => String(value).trim()))];
    return { column: columnIndex + 1, header, nonEmpty: data.length, uniqueCount: unique.length, sample: unique.slice(0, 20) };
  });
  sheets.push({ name: sheet.name, rows: values.length, columns });
}

console.log(JSON.stringify({ sheets }, null, 2));
