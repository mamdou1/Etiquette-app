// Run from backend: node --test tests/labels.integration.test.js
// Uses a newly created, isolated database; never writes to the application DB.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const XLSX = require('xlsx');
require('dotenv').config();

test('import, edit and reload labels against MySQL', async t => {
  const name = `etiquette_test_${Date.now()}_${process.pid}`;
  const admin = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', port: Number(process.env.DB_PORT) || 3306 });
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
  process.env.DB_NAME = name;
  const db = require('../config/database');
  const labels = require('../services/labelService');
  const { enrichirEtStocker } = require('../services/enrichissementService');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'label-import-test-'));
  try {
    await db.sequelize.sync();
    const agency = await db.models.Agence.create({ nom: 'Agence Test', code: 'TEST' });
    const type = await db.models.TypeDocument.create({ nom: 'Crédit test', code: 'TEST' });
    await db.models.AgenceTypeDocument.create({ agence_id: agency.id, type_document_id: type.id });
    const rows = [
      { 'N° Boîte': '1', 'N° dossier': '001', Nature: 'Caution', 'Date de production': '10/09/2021', 'Année de production': '2021' },
      { 'N° Boîte': '1', 'N° dossier': '002', Nature: 'Crédit', 'Date de production': '11/09/2021', 'Année de production': '2021', Observation: 'Seconde ligne' },
      { 'N° Boîte': '2', 'N° dossier': '003', Nature: 'Prêt', 'Date de production': '12/09/2021', 'Année de production': '2021' },
    ];
    let first;
    await t.test('all rows and later columns are saved, with timestamps', async () => {
      const result = await enrichirEtStocker(rows, agency.id, type.id);
      assert.equal(result.enriched.length, 2);
      first = result.enriched[0];
      assert.deepEqual(first.rows, rows.slice(0, 2));
      assert.equal(first.metaValues.Nature, 'Caution, Crédit');
      const stored = await db.models.MetaFieldValue.findAll({ where: { numero_boite: '1' } });
      assert.ok(stored.some(value => value.value === 'Caution, Crédit'));
      assert.ok(stored.every(value => value.created_at));
      assert.ok(stored.some(value => value.value === 'Seconde ligne'));
    });
    await t.test('edits and individual QR settings persist; other labels stay unchanged', async () => {
      const updatedRows = first.rows.map(row => ({ ...row, 'Année de production': '2022' }));
      updatedRows[1].Nature = 'Crédit corrigé';
      const saved = await labels.updateLabel(first.id, { ...first, numero_boite: '161', rows: updatedRows, qrEnabled: false, qrSize: 180 });
      assert.equal(saved.annee, '2022');
      const loaded = await labels.getLabel(first.id);
      assert.equal(loaded.qrEnabled, false);
      assert.equal(loaded.qrSize, 180);
      assert.equal(loaded.rows[1].Nature, 'Crédit corrigé');
      assert.ok(loaded.rows.every(row => row['N° Boîte'] === '161'));
      const [old] = await db.pool.query("SELECT * FROM meta_field_values WHERE numero_boite='1'");
      assert.equal(old.length, 0);
      const [stored] = await db.pool.query("SELECT * FROM meta_field_values WHERE numero_boite='161'");
      assert.ok(stored.every(row => row.annee === '2022'));
      assert.ok(stored.some(row => row.value.includes('Crédit corrigé')));
      assert.equal((await labels.listLabels(agency.id)).find(label => label.numero_boite === '2').qrSize, null);
      await assert.rejects(labels.updateLabel(first.id, first), { status: 409 });
      first = loaded;
    });
    await t.test('collision and oversized content roll back all changes', async () => {
      await assert.rejects(labels.updateLabel(first.id, { ...first, numero_boite: '2' }), { status: 409 });
      const invalidRows = first.rows.map(row => ({ ...row, Nature: 'é'.repeat(40000) }));
      await assert.rejects(labels.updateLabel(first.id, { ...first, rows: invalidRows, qrSize: 200 }), /volumineux/);
      assert.deepEqual(await labels.getLabel(first.id), first);
      await assert.rejects(labels.importLabels(agency.id, type.id, [
        { numero_boite: '99', annee: '2022', rows: [{ Nature: 'valide' }] },
        { numero_boite: '100', annee: '2022', rows: [{ Nature: 'é'.repeat(40000) }] },
      ], 'N° Boîte'), /volumineux/);
      assert.equal((await labels.listLabels(agency.id)).length, 2);
    });
    await t.test('reimport preserves per-label QR overrides and restores global inheritance', async () => {
      const [again] = await labels.importLabels(agency.id, type.id, [{ numero_boite: '161', annee: first.annee, rows: first.rows }], first.boxField);
      assert.equal(again.id, first.id);
      assert.equal(again.qrEnabled, false);
      assert.equal(again.qrSize, 180);
      const inherited = await labels.updateLabel(first.id, { ...again, qrEnabled: null, qrSize: null });
      assert.equal(inherited.qrEnabled, null);
      assert.equal(inherited.qrSize, null);
    });
    await t.test('legacy stored labels can be edited without reimport', async () => {
      const field = await db.models.MetaField.findOne({ where: { name: 'Nature' } });
      await db.models.MetaFieldValue.create({ agence_id: agency.id, type_document_id: type.id, meta_field_id: field.id, numero_boite: 'OLD', annee: '2020', value: 'Ancienne valeur' });
      const legacy = await labels.resolveLabel(agency.id, type.id, 'OLD');
      const edited = await labels.updateLabel(legacy.id, { ...legacy, rows: [{ ...legacy.rows[0], Nature: 'Corrigée' }] });
      assert.equal(edited.rows[0].Nature, 'Corrigée');
      assert.equal((await labels.resolveLabel(agency.id, type.id, 'OLD')).id, legacy.id);
    });
    await t.test('upload response contains the persisted labels and their source rows', async () => {
      const filePath = path.join(temp, 'upload.xlsx');
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), '2021');
      XLSX.writeFile(book, filePath);
      let status, body;
      const res = { status(code) { status = code; return this; }, json(value) { body = value; return this; } };
      await require('../controllers/uploadController').handleUpload({ file: { path: filePath, originalname: 'upload.xlsx', size: (await fs.stat(filePath)).size }, body: { agence_id: agency.id, type_document_id: type.id } }, res);
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.enriched.length, 2);
      assert.equal(body.enriched[0].rows.length, 2);
      assert.ok(body.enriched[0].id);
      assert.ok(!body.fields.includes('rows'));
    });
    await t.test('same box across sheets retains all rows and their years', async () => {
      const result = await enrichirEtStocker([
        { 'N° Boîte': 'MULTI', Nature: 'Crédit', _sheetYear: '2021' },
        { 'N° Boîte': 'MULTI', Nature: 'Crédit', _sheetYear: '2022' },
      ], agency.id, type.id);
      assert.equal(result.enriched.length, 1);
      assert.deepEqual(result.enriched[0].rows.map(row => row['Année']), ['2021', '2022']);
    });
    await t.test('chrono is selected before the beginning of the series', async () => {
      const result = await enrichirEtStocker([
        { 'N° début de série': '306800', 'N° fin de série': '307199', 'N° chrono': '79', 'Année': '2022' },
      ], agency.id, type.id);
      assert.equal(result.boxField, 'N° chrono');
      assert.equal(result.enriched[0].numero_boite, '79');
      assert.equal(result.enriched[0].rows[0]['N° début de série'], '306800');
    });
    await t.test('deleting a box also removes its editable snapshot', async () => {
      const model = require('../models/MetaFieldValueModel');
      const old = await labels.resolveLabel(agency.id, type.id, 'OLD');
      await model.deleteByBoite(agency.id, type.id, 'OLD');
      await assert.rejects(labels.getLabel(old.id), { status: 404 });
      await assert.rejects(labels.resolveLabel(agency.id, type.id, 'OLD'), { status: 404 });
    });
  } finally {
    await db.pool.end();
    await db.sequelize.close();
    // name is generated above, never obtained from configuration or user input.
    await admin.query(`DROP DATABASE \`${name}\``);
    await admin.end();
    await fs.rm(temp, { recursive: true, force: true });
  }
});
