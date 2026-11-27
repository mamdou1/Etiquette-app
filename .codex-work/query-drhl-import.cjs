require('../backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { pool } = require('../backend/config/database');

(async () => {
  const [agences] = await pool.query(
    "SELECT id, nom, code FROM agences WHERE nom LIKE '%DRHL%' OR code LIKE '%DRHL%'",
  );
  const [types] = await pool.query(
    "SELECT id, nom, code FROM type_documents WHERE nom LIKE '%Archives historiques%'",
  );
  const [labels] = await pool.query(
    `SELECT agence_id, type_document_id, COUNT(*) AS total,
            MIN(numero_boite) AS premiere_boite, MAX(numero_boite) AS derniere_boite
       FROM archive_labels
      WHERE agence_id IN (
        SELECT id FROM agences WHERE nom LIKE '%DRHL%' OR code LIKE '%DRHL%'
      )
      GROUP BY agence_id, type_document_id`,
  );
  const [samples] = await pool.query(
    `SELECT numero_boite, rows_json
       FROM archive_labels
      WHERE agence_id = 28 AND type_document_id = 18
        AND numero_boite IN ('1','2','3','4','5','6','19','21','22','23')
      ORDER BY CAST(numero_boite AS UNSIGNED)`,
  );
  console.log(JSON.stringify({ agences, types, labels, samples }, null, 2));
  await pool.end();
})().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
