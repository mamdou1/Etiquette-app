const fs = require('fs');
const path = require('path');
require('../backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { pool } = require('../backend/config/database');
const { parseExcel } = require('../backend/services/excelService');
const { enrichirEtStocker } = require('../backend/services/enrichissementService');

const AGENCY_ID = 28;
const TYPE_ID = 18;
const FILE_PATH = 'C:/Users/Mamadou Diouma/Desktop/BNDA/V2/Classeur2-3.xlsx';

(async () => {
  const parsed = parseExcel(FILE_PATH);
  const boxField = parsed.fields.find((field) => /boite/i.test(field));
  if (!boxField) throw new Error('Colonne du numéro de boîte introuvable.');

  const boxNumbers = [...new Set(parsed.data.map((row) => String(row[boxField] ?? '').trim()).filter(Boolean))];
  if (boxNumbers.length !== 23) {
    throw new Error(`23 boîtes attendues, ${boxNumbers.length} détectées.`);
  }

  const placeholders = boxNumbers.map(() => '?').join(',');
  const [labelsBefore] = await pool.query(
    `SELECT * FROM archive_labels
      WHERE agence_id=? AND type_document_id=? AND numero_boite IN (${placeholders})`,
    [AGENCY_ID, TYPE_ID, ...boxNumbers],
  );
  const [valuesBefore] = await pool.query(
    `SELECT * FROM meta_field_values
      WHERE agence_id=? AND type_document_id=? AND numero_boite IN (${placeholders})`,
    [AGENCY_ID, TYPE_ID, ...boxNumbers],
  );

  const backupPath = path.resolve('.codex-work', 'backup-classeur2-3-before-reimport.json');
  fs.writeFileSync(backupPath, JSON.stringify({ labelsBefore, valuesBefore }, null, 2), 'utf8');

  const result = await enrichirEtStocker(parsed.data, AGENCY_ID, TYPE_ID);

  const [labelsAfter] = await pool.query(
    `SELECT numero_boite, rows_json FROM archive_labels
      WHERE agence_id=? AND type_document_id=? AND numero_boite IN (${placeholders})`,
    [AGENCY_ID, TYPE_ID, ...boxNumbers],
  );
  const periods = Object.fromEntries(labelsAfter.map((label) => {
    const rows = JSON.parse(label.rows_json);
    return [label.numero_boite, rows[0]?.['Date de production'] ?? null];
  }));

  const expected = Object.fromEntries(parsed.data.map((row) => [
    String(row[boxField]),
    row['Date de production'],
  ]));
  const mismatches = boxNumbers.filter((box) => periods[box] !== expected[box]);
  if (mismatches.length) {
    throw new Error(`Valeurs incorrectes après réimport : ${mismatches.join(', ')}`);
  }

  console.log(JSON.stringify({
    backupPath,
    importedBoxes: result.totalBoites,
    importedRows: result.totalLignes,
    periods,
  }, null, 2));
  await pool.end();
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
