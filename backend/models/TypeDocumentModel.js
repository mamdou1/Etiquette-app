const { pool } = require("../config/database");

const TypeDocumentModel = {
  // ─── Récupérer tous les types ────────────────────────────────
  findAll: async (active = true) => {
    const sql = `
      SELECT DISTINCT td.*, 
        GROUP_CONCAT(DISTINCT a.id) as agence_ids,
        GROUP_CONCAT(DISTINCT a.nom) as agence_noms,
        COUNT(DISTINCT atd.agence_id) as agence_count
      FROM type_documents td
      LEFT JOIN agence_type_documents atd ON td.id = atd.type_document_id
      LEFT JOIN agences a ON atd.agence_id = a.id
      WHERE td.active = ?
      GROUP BY td.id
      ORDER BY td.nom ASC
    `;
    const [rows] = await pool.execute(sql, [active ? 1 : 0]);
    
    return rows.map(row => ({
      ...row,
      agence_ids: row.agence_ids ? row.agence_ids.split(',').map(Number) : [],
      agence_noms: row.agence_noms ? row.agence_noms.split(',') : [],
    }));
  },

  // ─── Récupérer les types d'une agence ────────────────────────
  findByAgence: async (agenceId, active = true) => {
    const sql = `
      SELECT td.*
      FROM type_documents td
      INNER JOIN agence_type_documents atd ON td.id = atd.type_document_id
      WHERE atd.agence_id = ? AND td.active = ?
      ORDER BY td.nom ASC
    `;
    const [rows] = await pool.execute(sql, [agenceId, active ? 1 : 0]);
    return rows;
  },

  // ─── Récupérer un type par ID ────────────────────────────────
  findById: async (id) => {
    const sql = `
      SELECT td.*, 
        GROUP_CONCAT(DISTINCT a.id) as agence_ids,
        GROUP_CONCAT(DISTINCT a.nom) as agence_noms,
        COUNT(DISTINCT atd.agence_id) as agence_count
      FROM type_documents td
      LEFT JOIN agence_type_documents atd ON td.id = atd.type_document_id
      LEFT JOIN agences a ON atd.agence_id = a.id
      WHERE td.id = ?
      GROUP BY td.id
    `;
    const [rows] = await pool.execute(sql, [id]);
    
    if (!rows.length) return null;
    
    return {
      ...rows[0],
      agence_ids: rows[0].agence_ids ? rows[0].agence_ids.split(',').map(Number) : [],
      agence_noms: rows[0].agence_noms ? rows[0].agence_noms.split(',') : [],
    };
  },

  // ─── Vérifier si un type existe par nom ──────────────────────
  findByNom: async (nom) => {
    const [rows] = await pool.execute(
      'SELECT * FROM type_documents WHERE nom = ?',
      [nom]
    );
    return rows[0] || null;
  },

  // ─── Créer un type ────────────────────────────────────────────
  create: async (data) => {
    const { nom, code, description, active = true } = data;

    const [result] = await pool.execute(
      `INSERT INTO type_documents (nom, code, description, active, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [nom.trim(), code || nom.trim().toUpperCase(), description || null, active ? 1 : 0]
    );

    return TypeDocumentModel.findById(result.insertId);
  },

  // ─── ✅ Affecter un type à des agences ────────────────────────
  assignToAgences: async (typeId, agenceIds) => {
    // 1. Supprimer les anciennes relations
    await pool.execute(
      'DELETE FROM agence_type_documents WHERE type_document_id = ?',
      [typeId]
    );

    // 2. Ajouter les nouvelles relations
    if (agenceIds && agenceIds.length > 0) {
      const values = agenceIds.map(id => `(${id}, ${typeId})`).join(', ');
      await pool.execute(
        `INSERT INTO agence_type_documents (agence_id, type_document_id) VALUES ${values}`
      );
    }

    return TypeDocumentModel.findById(typeId);
  },

  // ─── Mettre à jour un type ────────────────────────────────────
  update: async (id, data) => {
    const { nom, code, description, active } = data;

    const fields = [];
    const values = [];

    if (nom !== undefined) { fields.push('nom = ?'); values.push(nom.trim()); }
    if (code !== undefined) { fields.push('code = ?'); values.push(code.trim()); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description || null); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active ? 1 : 0); }

    if (fields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE type_documents SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return TypeDocumentModel.findById(id);
  },

  // ─── Désactiver un type ──────────────────────────────────────
  softDelete: async (id) => {
    const [result] = await pool.execute(
      'UPDATE type_documents SET active = 0 WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // ─── Supprimer définitivement ────────────────────────────────
  deletePermanent: async (id) => {
    const [result] = await pool.execute('DELETE FROM type_documents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = TypeDocumentModel;