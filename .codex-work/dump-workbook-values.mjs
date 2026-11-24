import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(process.argv[2]));
const sheet = workbook.worksheets.getItemAt(0);
console.log(JSON.stringify({ sheet: sheet.name, values: sheet.getUsedRange(true)?.values ?? [] }, null, 2));
