const { pool } = require("../config/database");

const ArchiveModel = {
  saveMany: async (archives) => {
    console.log(`📥 saveMany: ${archives.length} archives à sauvegarder`);

    if (archives.length === 0) {
      console.log("⚠️ Aucune archive à sauvegarder");
      return 0;
    }

    try {
      const placeholders = archives
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");

      const values = [];
      archives.forEach((a) => {
        values.push(
          String(a.numero_boite || "").substring(0, 50),
          a.agence_id || 0,
          String(a.agence_nom || "").substring(0, 100),
          a.date_production ? String(a.date_production).substring(0, 20) : null,
          String(a.type_document || "").substring(0, 100),
          a.type_document_id || null,
          String(a.caissiers || "").substring(0, 255),
          String(a.annee || "").substring(0, 10),
          String(a.observation || "").substring(0, 255),
        );
      });

      const query = `
        INSERT IGNORE INTO archives (
          numero_boite, agence_id, agence_nom, date_production,
          type_document, type_document_id, caissiers, annee, observation
        ) VALUES ${placeholders}
      `;

      console.log(`🔍 Exécution de la requête d'insertion (${archives.length} lignes)...`);
      const [result] = await pool.execute(query, values);
      
      const inserted = result.affectedRows;
      const duplicates = archives.length - inserted;
      
      console.log(`✅ ${inserted} archives sauvegardées, ${duplicates} doublons ignorés`);
      return inserted;
    } catch (error) {
      console.error("❌ Erreur dans saveMany:", error.message);
      return 0;
    }
  },

  // Récupérer une archive par ID
  findById: async (id) => {
    const [rows] = await pool.execute(
      `SELECT a.*, ag.nom as agence_nom, ag.code as agence_code
       FROM archives a
       LEFT JOIN agences ag ON a.agence_id = ag.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  // Récupérer les archives par agence, type, année
  findByAgenceTypeAnnee: async (agenceId, typeDocumentId, annee) => {
    const [rows] = await pool.execute(
      `SELECT a.*
       FROM archives a
       WHERE a.agence_id = ? AND a.type_document_id = ? AND a.annee = ?
       ORDER BY a.numero_boite ASC`,
      [agenceId, typeDocumentId, annee]
    );
    return rows;
  },

  // Récupérer les archives par agence et type (toutes années)
  findByAgenceType: async (agenceId, typeDocumentId) => {
    const [rows] = await pool.execute(
      `SELECT a.*
       FROM archives a
       WHERE a.agence_id = ? AND a.type_document_id = ?
       ORDER BY a.annee DESC, a.numero_boite ASC`,
      [agenceId, typeDocumentId]
    );
    return rows;
  },

  // Récupérer les archives par agence (tous types)
  findByAgence: async (agenceId) => {
    const [rows] = await pool.execute(
      `SELECT a.*
       FROM archives a
       WHERE a.agence_id = ?
       ORDER BY a.type_document_id, a.annee DESC, a.numero_boite ASC`,
      [agenceId]
    );
    return rows;
  },

  // Récupérer les archives pour l'impression par niveau
  getForPrint: async (params) => {
    let query = `
      SELECT a.*, td.nom as type_nom, ag.nom as agence_nom
      FROM archives a
      LEFT JOIN type_documents td ON a.type_document_id = td.id
      LEFT JOIN agences ag ON a.agence_id = ag.id
      WHERE 1=1
    `;
    const values = [];

    if (params.agenceId) {
      query += " AND a.agence_id = ?";
      values.push(params.agenceId);
    }

    if (params.typeDocumentId) {
      query += " AND a.type_document_id = ?";
      values.push(params.typeDocumentId);
    }

    if (params.annee) {
      query += " AND a.annee = ?";
      values.push(params.annee);
    }

    query += " ORDER BY a.numero_boite ASC";

    const [rows] = await pool.execute(query, values);
    return rows;
  },
};

module.exports = ArchiveModel;