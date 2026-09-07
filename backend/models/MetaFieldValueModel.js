const { pool } = require("../config/database");

const MetaFieldValueModel = {
  // ─── Créer ou mettre à jour une valeur ──────────────────────
  upsert: async (data) => {
    const { agence_id, type_document_id, meta_field_id, numero_boite, annee, value } = data;

    const [existing] = await pool.execute(
      `SELECT * FROM meta_field_values 
       WHERE agence_id = ? AND type_document_id = ? AND meta_field_id = ? AND numero_boite = ?`,
      [agence_id, type_document_id, meta_field_id, numero_boite]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE meta_field_values 
         SET value = ?, annee = ?, updated_at = NOW()
         WHERE id = ?`,
        [value, annee, existing[0].id]
      );
      return existing[0];
    } else {
      const [result] = await pool.execute(
        `INSERT INTO meta_field_values 
         (agence_id, type_document_id, meta_field_id, numero_boite, annee, value)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [agence_id, type_document_id, meta_field_id, numero_boite, annee, value]
      );
      const [rows] = await pool.execute(
        'SELECT * FROM meta_field_values WHERE id = ?',
        [result.insertId]
      );
      return rows[0];
    }
  },

  // ─── Récupérer toutes les valeurs d'une boîte ──────────────
  findByBoite: async (agenceId, typeDocumentId, numeroBoite) => {
    const [rows] = await pool.execute(
      `SELECT mfv.*, mf.name, mf.label, mf.field_type
       FROM meta_field_values mfv
       JOIN meta_fields mf ON mfv.meta_field_id = mf.id
       WHERE mfv.agence_id = ? AND mfv.type_document_id = ? AND mfv.numero_boite = ?
       ORDER BY mf.position ASC`,
      [agenceId, typeDocumentId, numeroBoite]
    );
    return rows;
  },

  // ─── ✅ RECHERCHE HIÉRARCHIQUE ──────────────────────────────
  searchHierarchy: async (filters) => {
    let query = `
      SELECT 
        mfv.numero_boite,
        mfv.annee,
        mfv.agence_id,
        mfv.type_document_id,
        mfv.value,
        mf.name as meta_name,
        mf.label as meta_label,
        mf.field_type as meta_field_type,
        ag.nom as agence_nom,
        td.nom as type_nom
      FROM meta_field_values mfv
      JOIN agences ag ON mfv.agence_id = ag.id
      JOIN type_documents td ON mfv.type_document_id = td.id
      JOIN meta_fields mf ON mfv.meta_field_id = mf.id
      WHERE 1=1
    `;
    const values = [];

    if (filters.agence) {
      query += " AND ag.nom LIKE ?";
      values.push(`%${filters.agence}%`);
    }

    if (filters.type) {
      query += " AND td.nom LIKE ?";
      values.push(`%${filters.type}%`);
    }

    if (filters.annee) {
      query += " AND mfv.annee = ?";
      values.push(filters.annee);
    }

    if (filters.numero_boite) {
      query += " AND mfv.numero_boite LIKE ?";
      values.push(`%${filters.numero_boite}%`);
    }

    if (filters.valeur) {
      query += " AND mfv.value LIKE ?";
      values.push(`%${filters.valeur}%`);
    }

    if (filters.agence_id) {
      query += " AND mfv.agence_id = ?";
      values.push(filters.agence_id);
    }

    if (filters.type_document_id) {
      query += " AND mfv.type_document_id = ?";
      values.push(filters.type_document_id);
    }

    query += " ORDER BY mfv.numero_boite ASC, mf.position ASC";

    const [rows] = await pool.execute(query, values);
    
    // Regrouper par hiérarchie
    const grouped = {};
    rows.forEach(row => {
      // Agence
      if (!grouped[row.agence_id]) {
        grouped[row.agence_id] = {
          id: row.agence_id,
          nom: row.agence_nom,
          types: {}
        };
      }
      // Type
      const typeKey = row.type_document_id;
      if (!grouped[row.agence_id].types[typeKey]) {
        grouped[row.agence_id].types[typeKey] = {
          id: row.type_document_id,
          nom: row.type_nom,
          annees: {}
        };
      }
      // Année
      if (!grouped[row.agence_id].types[typeKey].annees[row.annee]) {
        grouped[row.agence_id].types[typeKey].annees[row.annee] = {
          annee: row.annee,
          boites: {}
        };
      }
      // Boîte
      const boiteKey = row.numero_boite;
      if (!grouped[row.agence_id].types[typeKey].annees[row.annee].boites[boiteKey]) {
        grouped[row.agence_id].types[typeKey].annees[row.annee].boites[boiteKey] = {
          numero_boite: row.numero_boite,
          metaValues: {}
        };
      }
      // MetaValue
      grouped[row.agence_id].types[typeKey].annees[row.annee].boites[boiteKey].metaValues[row.meta_name] = {
        label: row.meta_label,
        field_type: row.meta_field_type,
        value: row.value
      };
    });

    // Transformer en tableau
    const result = [];
    for (const agenceId in grouped) {
      const agence = grouped[agenceId];
      const typesArray = [];
      for (const typeId in agence.types) {
        const type = agence.types[typeId];
        const anneesArray = [];
        for (const annee in type.annees) {
          const anneeData = type.annees[annee];
          const boitesArray = [];
          for (const boite in anneeData.boites) {
            boitesArray.push(anneeData.boites[boite]);
          }
          anneesArray.push({
            annee: annee,
            boites: boitesArray,
            total_boites: boitesArray.length,
            total_documents: boitesArray.length
          });
        }
        typesArray.push({
          id: parseInt(typeId),
          nom: type.nom,
          annees: anneesArray,
          total_boites: anneesArray.reduce((sum, a) => sum + a.total_boites, 0),
          total_documents: anneesArray.reduce((sum, a) => sum + a.total_documents, 0)
        });
      }
      result.push({
        id: parseInt(agenceId),
        nom: agence.nom,
        types: typesArray,
        total_boites: typesArray.reduce((sum, t) => sum + t.total_boites, 0),
        total_documents: typesArray.reduce((sum, t) => sum + t.total_documents, 0)
      });
    }

    return result;
  },

  // ─── ✅ COMPTER LES RÉSULTATS DE RECHERCHE ──────────────────
  countSearchResults: async (filters) => {
    let query = `
      SELECT COUNT(DISTINCT mfv.numero_boite) as total
      FROM meta_field_values mfv
      JOIN agences ag ON mfv.agence_id = ag.id
      JOIN type_documents td ON mfv.type_document_id = td.id
      JOIN meta_fields mf ON mfv.meta_field_id = mf.id
      WHERE 1=1
    `;
    const values = [];

    if (filters.agence) {
      query += " AND ag.nom LIKE ?";
      values.push(`%${filters.agence}%`);
    }

    if (filters.type) {
      query += " AND td.nom LIKE ?";
      values.push(`%${filters.type}%`);
    }

    if (filters.annee) {
      query += " AND mfv.annee = ?";
      values.push(filters.annee);
    }

    if (filters.numero_boite) {
      query += " AND mfv.numero_boite LIKE ?";
      values.push(`%${filters.numero_boite}%`);
    }

    if (filters.valeur) {
      query += " AND mfv.value LIKE ?";
      values.push(`%${filters.valeur}%`);
    }

    if (filters.agence_id) {
      query += " AND mfv.agence_id = ?";
      values.push(filters.agence_id);
    }

    if (filters.type_document_id) {
      query += " AND mfv.type_document_id = ?";
      values.push(filters.type_document_id);
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  },

  // ─── Récupérer une boîte avec ses méta-valeurs ──────────────
  getBoiteDetail: async (agenceId, typeDocumentId, numeroBoite) => {
    const [values] = await pool.execute(
      `SELECT mfv.*, mf.name, mf.label, mf.field_type
       FROM meta_field_values mfv
       JOIN meta_fields mf ON mfv.meta_field_id = mf.id
       WHERE mfv.agence_id = ? AND mfv.type_document_id = ? AND mfv.numero_boite = ?
       ORDER BY mf.position ASC`,
      [agenceId, typeDocumentId, numeroBoite]
    );

    if (values.length === 0) return null;

    const [agence] = await pool.execute(
      'SELECT nom FROM agences WHERE id = ?',
      [agenceId]
    );

    const [type] = await pool.execute(
      'SELECT nom FROM type_documents WHERE id = ?',
      [typeDocumentId]
    );

    const metaValues = {};
    values.forEach(v => {
      metaValues[v.name] = {
        label: v.label,
        field_type: v.field_type,
        value: v.value
      };
    });

    return {
      numero_boite: numeroBoite,
      agence_id: agenceId,
      agence_nom: agence[0]?.nom || 'Inconnue',
      type_document_id: typeDocumentId,
      type_nom: type[0]?.nom || 'Inconnu',
      annee: values[0]?.annee || '',
      metaValues: metaValues
    };
  },

  // ─── Récupérer toutes les valeurs d'une agence ─────────────
  findByAgence: async (agenceId) => {
    const [rows] = await pool.execute(
      `SELECT mfv.*, mf.name, mf.label, mf.field_type, td.nom as type_nom
       FROM meta_field_values mfv
       JOIN meta_fields mf ON mfv.meta_field_id = mf.id
       JOIN type_documents td ON mfv.type_document_id = td.id
       WHERE mfv.agence_id = ?
       ORDER BY mfv.numero_boite ASC, mf.position ASC`,
      [agenceId]
    );
    return rows;
  },

  // ─── Récupérer toutes les valeurs d'un type ────────────────
  findByType: async (typeDocumentId) => {
    const [rows] = await pool.execute(
      `SELECT mfv.*, mf.name, mf.label, mf.field_type, ag.nom as agence_nom
       FROM meta_field_values mfv
       JOIN meta_fields mf ON mfv.meta_field_id = mf.id
       JOIN agences ag ON mfv.agence_id = ag.id
       WHERE mfv.type_document_id = ?
       ORDER BY mfv.numero_boite ASC, mf.position ASC`,
      [typeDocumentId]
    );
    return rows;
  },

  // ─── Récupérer toutes les valeurs d'une année ──────────────
  findByAnnee: async (annee) => {
    const [rows] = await pool.execute(
      `SELECT mfv.*, mf.name, mf.label, mf.field_type, ag.nom as agence_nom, td.nom as type_nom
       FROM meta_field_values mfv
       JOIN meta_fields mf ON mfv.meta_field_id = mf.id
       JOIN agences ag ON mfv.agence_id = ag.id
       JOIN type_documents td ON mfv.type_document_id = td.id
       WHERE mfv.annee = ?
       ORDER BY mfv.numero_boite ASC, mf.position ASC`,
      [annee]
    );
    return rows;
  },

  // ─── Supprimer toutes les valeurs d'une boîte ──────────────
  deleteByBoite: async (agenceId, typeDocumentId, numeroBoite) => {
    const [result] = await pool.execute(
      'DELETE FROM meta_field_values WHERE agence_id = ? AND type_document_id = ? AND numero_boite = ?',
      [agenceId, typeDocumentId, numeroBoite]
    );
    return result.affectedRows > 0;
  },

  // ─── Supprimer toutes les valeurs d'une agence ─────────────
  deleteByAgence: async (agenceId) => {
    const [result] = await pool.execute(
      'DELETE FROM meta_field_values WHERE agence_id = ?',
      [agenceId]
    );
    return result.affectedRows > 0;
  },

  // ─── Supprimer toutes les valeurs d'un type ────────────────
  deleteByType: async (typeDocumentId) => {
    const [result] = await pool.execute(
      'DELETE FROM meta_field_values WHERE type_document_id = ?',
      [typeDocumentId]
    );
    return result.affectedRows > 0;
  },

  // ─── Supprimer toutes les valeurs d'une année ──────────────
  deleteByAnnee: async (annee) => {
    const [result] = await pool.execute(
      'DELETE FROM meta_field_values WHERE annee = ?',
      [annee]
    );
    return result.affectedRows > 0;
  },

  // ─── Compteur par niveau ─────────────────────────────────────
  count: async (params) => {
    let query = 'SELECT COUNT(DISTINCT numero_boite) as total FROM meta_field_values WHERE 1=1';
    const values = [];

    if (params.agenceId) {
      query += " AND agence_id = ?";
      values.push(params.agenceId);
    }

    if (params.typeDocumentId) {
      query += " AND type_document_id = ?";
      values.push(params.typeDocumentId);
    }

    if (params.annee) {
      query += " AND annee = ?";
      values.push(params.annee);
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  }
};

module.exports = MetaFieldValueModel;