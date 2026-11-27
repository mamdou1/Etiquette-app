const fs = require('fs');
const path = require('path');
const xlsxPath = require.resolve('xlsx', { paths: [path.resolve(__dirname, '../frontend')] });
const XLSX = require(xlsxPath);

function option(name, fallback) {
  const index = process.argv.indexOf('--' + name);
  return index < 0 ? fallback : process.argv[index + 1];
}
function positiveInteger(name, fallback, maximum) {
  const value = Number(option(name, fallback));
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error('--' + name + ' doit être un entier entre 1 et ' + maximum + '.');
  }
  return value;
}

const totalRows = positiveInteger('rows', 5000, 5000000);
const sheetCount = positiveInteger('sheets', 5, 50);
const rowsPerBox = positiveInteger('rows-per-box', 10, 10000);
if (Math.ceil(totalRows / sheetCount) > 1048575) {
  throw new Error('Le nombre de lignes dépasse la capacité Excel pour le nombre de feuilles choisi.');
}
const defaultOutput = path.join(__dirname, 'performance-test-' + totalRows + '.xlsx');
const outputPath = path.resolve(process.cwd(), option('output', defaultOutput));
const headers = [
  'N° de la Boite',
  'Date de Production',
  'Type de Document',
  'Nom des caissiers',
  "Nom de l'Agence",
  'Année',
  'Dossier',
  'Code document',
  'Rayon',
  'Travers',
  'Observation',
];

const workbook = XLSX.utils.book_new();
let remainingRows = totalRows;
let globalRow = 0;
let totalBoxes = 0;
const rowsPerSheet = [];

for (let sheetIndex = 0; sheetIndex < sheetCount; sheetIndex++) {
  const sheetsLeft = sheetCount - sheetIndex;
  const count = Math.floor(remainingRows / sheetsLeft);
  remainingRows -= count;
  rowsPerSheet.push(count);

  const year = String(2021 + sheetIndex);
  const rows = [headers];
  for (let localRow = 0; localRow < count; localRow++, globalRow++) {
    const boxInSheet = Math.floor(localRow / rowsPerBox) + 1;
    const boxNumber = 'BOX_TEST_' + year + '_' + String(boxInSheet).padStart(4, '0');
    const day = String((localRow % 28) + 1).padStart(2, '0');
    const month = String((Math.floor(localRow / 28) % 12) + 1).padStart(2, '0');
    const suffix = String(globalRow + 1).padStart(6, '0');

    rows.push([
      boxNumber,
      day + '/' + month + '/' + year,
      'DOCUMENT_TEST',
      'CAISSIER_TEST_' + String((globalRow % 25) + 1).padStart(3, '0'),
      'AGENCE_TEST',
      year,
      'DOSSIER_TEST_' + suffix,
      'DOCUMENT_TEST_' + suffix,
      'RAYON_TEST_' + String((localRow % 40) + 1).padStart(3, '0'),
      'TRAVERS_TEST_' + String((localRow % 12) + 1).padStart(3, '0'),
      'OBSERVATION_TEST_SYNTHETIQUE',
    ]);
    if (localRow % rowsPerBox === 0) totalBoxes++;
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, year);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
XLSX.writeFile(workbook, outputPath);
const fileBytes = fs.statSync(outputPath).size;
console.log(JSON.stringify({
  output: outputPath,
  sheets: sheetCount,
  rowsPerSheet,
  totalRows,
  rowsPerBox,
  boxes: totalBoxes,
  columns: headers.length,
  agencyValue: 'AGENCE_TEST',
  documentTypeValue: 'DOCUMENT_TEST',
  fileBytes,
}, null, 2));
