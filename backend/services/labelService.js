const { pool } = require('../config/database');

let schemaReady;
function ensureSchema() {
  if (!schemaReady) schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS archive_labels (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    agence_id INT NOT NULL, type_document_id INT NOT NULL,
    numero_boite VARCHAR(50) NOT NULL, annee VARCHAR(100) NOT NULL DEFAULT '',
    box_field VARCHAR(150) NOT NULL, rows_json LONGTEXT NOT NULL,
    qr_enabled BOOLEAN NULL, qr_size INT NULL,
    revision INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
    UNIQUE KEY uniq_label (agence_id, type_document_id, numero_boite),
    FOREIGN KEY (agence_id) REFERENCES agences(id) ON DELETE CASCADE,
    FOREIGN KEY (type_document_id) REFERENCES type_documents(id) ON DELETE CASCADE
  )`).catch(error => { schemaReady = null; throw error; });
  return schemaReady;
}
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isBox = key => /^(?:(?:n|no|num|numero)(?:de)?(?:la)?boite|boite|boxnumber|box|numbox|nobox|numerobox|(?:n|no|num|numero)?chrono)$/.test(normalize(key));
function summarize(rows) {
  const summary = {};
  for (const key of new Set(rows.flatMap(row => Object.keys(row)))) {
    if (key.startsWith('_')) continue;
    summary[key] = [...new Set(rows.map(row => String(row[key] ?? '')).filter(Boolean))].join(', ');
  }
  return summary;
}
function validateRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000) throw fail('Les lignes de dossiers sont obligatoires (maximum 10000).');
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw fail('Ligne de dossier invalide.');
    for (const [key, value] of Object.entries(row)) {
      if (key.length > 150 || ['__proto__', 'constructor', 'prototype'].includes(key)) throw fail('Nom de champ invalide.');
      if (typeof value !== 'string' && typeof value !== 'number' && value !== null) throw fail('Les cellules doivent contenir du texte ou des nombres.');
      if (String(value ?? '').length > 60000) throw fail('Une cellule dépasse la taille autorisée.');
    }
  }
}
function present(row) {
  const rows = JSON.parse(row.rows_json);
  return { id: row.id, agence_id: row.agence_id, type_document_id: row.type_document_id,
    numero_boite: row.numero_boite, annee: row.annee, boxField: row.box_field,
    rows, metaValues: summarize(rows), revision: row.revision,
    qrEnabled: row.qr_enabled === null ? null : Boolean(row.qr_enabled), qrSize: row.qr_size };
}
async function writeValues(connection, label) {
  const values = summarize(label.rows);
  const [fields] = await connection.execute('SELECT id, name, label FROM meta_fields WHERE type_document_id = ? AND deleted_at IS NULL', [label.type_document_id]);
  for (const field of fields) {
    const key = Object.keys(values).find(key => normalize(key) === normalize(field.name) || normalize(key) === normalize(field.label));
    const value = key ? values[key] : '';
    // TEXT est limité en octets, pas en nombre de caractères.
    if (Buffer.byteLength(value, 'utf8') > 65535) throw fail(`Le champ ${field.label} est trop volumineux pour être enregistré.`);
    await connection.execute(`INSERT INTO meta_field_values
      (agence_id,type_document_id,meta_field_id,numero_boite,annee,value,created_at,updated_at)
      VALUES (?,?,?,?,?,?,NOW(),NOW()) ON DUPLICATE KEY UPDATE value=VALUES(value),annee=VALUES(annee),updated_at=NOW()`,
    [label.agence_id, label.type_document_id, field.id, label.numero_boite, label.annee, value]);
  }
}
async function importLabels(agenceId, typeId, groups, boxField) {
  await ensureSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const labels = [];
    for (const group of groups) {
      validateRows(group.rows);
      if (!group.numero_boite || group.numero_boite.length > 50) throw fail('Le numéro de boîte doit contenir entre 1 et 50 caractères.');
      const label = { ...group, agence_id: agenceId, type_document_id: typeId };
      await connection.execute(`INSERT INTO archive_labels
        (agence_id,type_document_id,numero_boite,annee,box_field,rows_json,created_at,updated_at)
        VALUES (?,?,?,?,?,?,NOW(),NOW()) ON DUPLICATE KEY UPDATE
        annee=VALUES(annee),box_field=VALUES(box_field),rows_json=VALUES(rows_json),revision=revision+1,updated_at=NOW()`,
      [agenceId,typeId,group.numero_boite,group.annee,boxField,JSON.stringify(group.rows)]);
      await writeValues(connection, label);
      const [stored] = await connection.execute('SELECT * FROM archive_labels WHERE agence_id=? AND type_document_id=? AND numero_boite=?', [agenceId,typeId,group.numero_boite]);
      labels.push(present(stored[0]));
    }
    await connection.commit();
    return labels;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
async function listLabels(agenceId) {
  await ensureSchema();
  const [rows] = await pool.execute('SELECT * FROM archive_labels WHERE agence_id=?', [agenceId]);
  return rows.map(present);
}
async function getLabel(id) {
  await ensureSchema();
  const [rows] = await pool.execute('SELECT * FROM archive_labels WHERE id=?', [id]);
  if (!rows.length) throw fail('Étiquette introuvable.', 404);
  return present(rows[0]);
}
// Les anciens imports n'ont conservé que les valeurs agrégées. On les reprend
// telles quelles, sans inventer d'associations entre dossiers.
async function resolveLabel(agenceId, typeId, number) {
  await ensureSchema();
  const [existing] = await pool.execute('SELECT * FROM archive_labels WHERE agence_id=? AND type_document_id=? AND numero_boite=?', [agenceId,typeId,number]);
  if (existing.length) return present(existing[0]);
  const [values] = await pool.execute(`SELECT v.value,v.annee,f.name FROM meta_field_values v
    JOIN meta_fields f ON f.id=v.meta_field_id WHERE v.agence_id=? AND v.type_document_id=? AND v.numero_boite=? AND f.deleted_at IS NULL`, [agenceId,typeId,number]);
  if (!values.length) throw fail('Étiquette introuvable.',404);
  const row = Object.fromEntries(values.map(value => [value.name, value.value ?? '']));
  row.numero_boite = number;
  row.annee = values[0].annee || '';
  validateRows([row]);
  await pool.execute(`INSERT INTO archive_labels (agence_id,type_document_id,numero_boite,annee,box_field,rows_json,created_at,updated_at)
    VALUES (?,?,?,?,?,?,NOW(),NOW()) ON DUPLICATE KEY UPDATE id=id`, [agenceId,typeId,number,row.annee,'numero_boite',JSON.stringify([row])]);
  const [saved] = await pool.execute('SELECT * FROM archive_labels WHERE agence_id=? AND type_document_id=? AND numero_boite=?',[agenceId,typeId,number]);
  return present(saved[0]);
}
async function updateLabel(id, data) {
  validateRows(data.rows);
  const number = String(data.numero_boite ?? '').trim();
  if (!number || number.length > 50) throw fail('Numéro de boîte requis (50 caractères maximum).');
  if (data.qrEnabled !== null && typeof data.qrEnabled !== 'boolean') throw fail('Réglage QR invalide.');
  if (data.qrSize !== null && (!Number.isInteger(data.qrSize) || data.qrSize < 96 || data.qrSize > 260)) throw fail('La taille QR doit être comprise entre 96 et 260 px.');
  if (!Number.isInteger(data.revision)) throw fail('Version de l’étiquette requise.');
  await ensureSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [found] = await connection.execute('SELECT * FROM archive_labels WHERE id=? FOR UPDATE', [id]);
    if (!found.length) throw fail('Étiquette introuvable.',404);
    const old = found[0];
    if (old.revision !== data.revision) throw fail('Cette étiquette a changé. Fermez puis rouvrez le formulaire avant de modifier.',409);
    const previousRows = JSON.parse(old.rows_json);
    const allowed = new Set(previousRows.flatMap(row => Object.keys(row)));
    if (data.rows.length !== previousRows.length || data.rows.some(row => Object.keys(row).some(key => !allowed.has(key))) ||
      data.rows.some((row, i) => Object.keys(previousRows[i]).some(key => !Object.prototype.hasOwnProperty.call(row,key)))) throw fail('La structure des dossiers ne peut pas être modifiée dans ce formulaire.');
    const rows = data.rows.map(row => Object.fromEntries(Object.entries(row).map(([key,value]) =>
      [key, key === old.box_field || isBox(key) ? number : value])));
    const yearKeys = [...allowed].filter(key => /anne|year/.test(normalize(key)) && !/date|destruct/.test(normalize(key)));
    const yearKey = yearKeys.find(key => normalize(key).includes('production')) || yearKeys[0];
    const years = yearKey ? [...new Set(rows.map(row => String(row[yearKey] ?? '').trim()).filter(Boolean))] : [];
    const annee = yearKey ? (years.length === 1 ? years[0] : '') : String(data.annee ?? old.annee).trim();
    if (annee.length > 10) throw fail('Année invalide (10 caractères maximum).');
    if (number !== old.numero_boite) {
      const [duplicates] = await connection.execute('SELECT id FROM meta_field_values WHERE agence_id=? AND type_document_id=? AND numero_boite=? LIMIT 1', [old.agence_id, old.type_document_id, number]);
      if (duplicates.length) throw fail('Ce numéro de boîte existe déjà pour ce type et cette agence.',409);
      await connection.execute('UPDATE meta_field_values SET numero_boite=?, updated_at=NOW() WHERE agence_id=? AND type_document_id=? AND numero_boite=?', [number, old.agence_id, old.type_document_id, old.numero_boite]);
    }
    await connection.execute(`UPDATE archive_labels SET numero_boite=?,annee=?,rows_json=?,qr_enabled=?,qr_size=?,revision=revision+1,updated_at=NOW() WHERE id=?`,
      [number,annee,JSON.stringify(rows),data.qrEnabled,data.qrSize,id]);
    await writeValues(connection, { ...old, numero_boite: number, annee, rows });
    const [saved] = await connection.execute('SELECT * FROM archive_labels WHERE id=?', [id]);
    await connection.commit();
    return { ...present(saved[0]), previousNumeroBoite: old.numero_boite };
  } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') throw fail('Ce numéro de boîte existe déjà.',409); throw error; }
  finally { connection.release(); }
}
async function deleteValues(where, params) {
  await ensureSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [labels] = await connection.execute(`DELETE FROM archive_labels WHERE ${where}`, params);
    const [values] = await connection.execute(`DELETE FROM meta_field_values WHERE ${where}`, params);
    await connection.commit();
    return labels.affectedRows + values.affectedRows > 0;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
module.exports = { ensureSchema, summarize, importLabels, listLabels, getLabel, resolveLabel, updateLabel, deleteValues };
