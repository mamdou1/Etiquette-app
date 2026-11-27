const { pool } = require("../config/database");

const AgenceTypeDocumentModel = {
  // Créer une relation
  create: async (agenceId, typeDocumentId) => {
    const [existing] = await pool.execute(
      'SELECT * FROM agence_type_documents WHERE agence_id = ? AND type_document_id = ?',
      [agenceId, typeDocumentId]
    );

    if (existing.length > 0) return existing[0];

    await pool.execute(
      'INSERT INTO agence_type_documents (agence_id, type_document_id) VALUES (?, ?)',
      [agenceId, typeDocumentId]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM agence_type_documents WHERE agence_id = ? AND type_document_id = ?',
      [agenceId, typeDocumentId]
    );
    return rows[0];
  },

  // Supprimer une relation
  delete: async (agenceId, typeDocumentId) => {
    const [result] = await pool.execute(
      'DELETE FROM agence_type_documents WHERE agence_id = ? AND type_document_id = ?',
      [agenceId, typeDocumentId]
    );
    return result.affectedRows > 0;
  },

  // Récupérer toutes les relations d'une agence
  findByAgence: async (agenceId) => {
    const [rows] = await pool.execute(
      `SELECT td.* 
       FROM type_documents td
       INNER JOIN agence_type_documents atd ON td.id = atd.type_document_id
       WHERE atd.agence_id = ?
       ORDER BY td.nom ASC`,
      [agenceId]
    );
    return rows;
  },

  // Récupérer toutes les agences d'un type
  findByType: async (typeDocumentId) => {
    const [rows] = await pool.execute(
      `SELECT a.* 
       FROM agences a
       INNER JOIN agence_type_documents atd ON a.id = atd.agence_id
       WHERE atd.type_document_id = ?
       ORDER BY a.nom ASC`,
      [typeDocumentId]
    );
    return rows;
  },

  // Vérifier si une relation existe
  exists: async (agenceId, typeDocumentId) => {
    const [rows] = await pool.execute(
      'SELECT * FROM agence_type_documents WHERE agence_id = ? AND type_document_id = ?',
      [agenceId, typeDocumentId]
    );
    return rows.length > 0;
  },
};

module.exports = AgenceTypeDocumentModel;