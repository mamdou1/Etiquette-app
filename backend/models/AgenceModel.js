const { pool } = require("../config/database");

const AgenceModel = {
  // ─── Trouver une agence par nom ────────────────────────────
  findByNom: async (nom) => {
    const [rows] = await pool.execute(
      "SELECT * FROM agences WHERE nom = ? AND active = TRUE",
      [String(nom).substring(0, 100)]
    );
    return rows.length ? rows[0] : null;
  },

  // ─── Trouver une agence par ID ─────────────────────────────
  findById: async (id) => {
    const [rows] = await pool.execute("SELECT * FROM agences WHERE id = ?", [id]);
    return rows.length ? rows[0] : null;
  },

  // ─── Récupérer toutes les agences ──────────────────────────
  findAll: async (active) => {
    let query = "SELECT * FROM agences";
    const values = [];
    if (active !== undefined) {
      query += " WHERE active = ?";
      values.push(active);
    }
    query += " ORDER BY nom ASC";
    const [rows] = await pool.execute(query, values);
    return rows;
  },

  // ─── Créer ou récupérer une agence ─────────────────────────
  findOrCreate: async (nom, code) => {
    const nomTronque = String(nom).substring(0, 100);
    const codeTronque = code
      ? String(code).substring(0, 50).toUpperCase()
      : String(nom).substring(0, 50).toUpperCase();

    const existing = await AgenceModel.findByNom(nomTronque);
    if (existing) return existing;

    const [result] = await pool.execute(
      "INSERT INTO agences (nom, code, active) VALUES (?, ?, TRUE)",
      [nomTronque, codeTronque]
    );

    const [rows] = await pool.execute("SELECT * FROM agences WHERE id = ?", [result.insertId]);
    return rows[0];
  },

  // ─── Mettre à jour une agence ──────────────────────────────
  update: async (id, data) => {
    const fields = [];
    const values = [];

    if (data.nom !== undefined) {
      fields.push("nom = ?");
      values.push(String(data.nom).substring(0, 100));
    }
    if (data.code !== undefined) {
      fields.push("code = ?");
      values.push(String(data.code).substring(0, 50).toUpperCase());
    }
    if (data.active !== undefined) {
      fields.push("active = ?");
      values.push(data.active);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE agences SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  // ─── Désactiver une agence ──────────────────────────────────
  softDelete: async (id) => {
    const [result] = await pool.execute(
      "UPDATE agences SET active = FALSE WHERE id = ? AND active = TRUE",
      [id]
    );
    return result.affectedRows > 0;
  },

  // ─── Supprimer définitivement une agence ────────────────────
  deletePermanent: async (id) => {
    const [result] = await pool.execute("DELETE FROM agences WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  // ─── Compter les agences ────────────────────────────────────
  count: async (active) => {
    let query = "SELECT COUNT(*) as total FROM agences";
    const values = [];
    if (active !== undefined) {
      query += " WHERE active = ?";
      values.push(active);
    }
    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  },

  // ─── ✅ HIÉRARCHIE : Agence → Type → Année → Boîtes ──────────
  getHierarchy: async (id) => {
    const agence = await AgenceModel.findById(id);
    if (!agence) return null;

    // 1. Récupérer les types de documents de l'agence
    const [types] = await pool.execute(
      `SELECT td.* 
       FROM type_documents td
       INNER JOIN agence_type_documents atd ON td.id = atd.type_document_id
       WHERE atd.agence_id = ? AND td.active = TRUE
       ORDER BY td.nom ASC`,
      [id]
    );

    // 2. Pour chaque type, récupérer les années et boîtes depuis meta_field_values
    const typesWithData = await Promise.all(types.map(async (type) => {
      // 2a. Récupérer les années distinctes
      const [annees] = await pool.execute(
        `SELECT DISTINCT mfv.annee
         FROM meta_field_values mfv
         WHERE mfv.agence_id = ? AND mfv.type_document_id = ?
         ORDER BY mfv.annee DESC`,
        [id, type.id]
      );

      // 2b. Pour chaque année, récupérer les boîtes
      const anneesWithBoites = await Promise.all(annees.map(async ({ annee }) => {
        const [boites] = await pool.execute(
          `SELECT 
            mfv.numero_boite,
            COUNT(DISTINCT mfv.id) as total_documents
           FROM meta_field_values mfv
           WHERE mfv.agence_id = ? AND mfv.type_document_id = ? AND mfv.annee = ?
           GROUP BY mfv.numero_boite
           ORDER BY mfv.numero_boite ASC`,
          [id, type.id, annee]
        );

        // 2c. Récupérer les caissiers depuis les meta_values (si le champ existe)
        // ✅ Utilisation de ANY_VALUE pour éviter l'erreur ONLY_FULL_GROUP_BY
        const [caissiersData] = await pool.execute(
          `SELECT ANY_VALUE(mfv.value) as caissiers
           FROM meta_field_values mfv
           JOIN meta_fields mf ON mfv.meta_field_id = mf.id
           WHERE mfv.agence_id = ? AND mfv.type_document_id = ? AND mfv.annee = ?
           AND mf.name = 'caissiers'
           GROUP BY mfv.numero_boite`,
          [id, type.id, annee]
        );

        const caissiersMap = {};
        caissiersData.forEach(c => {
          if (c.caissiers) {
            caissiersMap[c.caissiers] = c.caissiers.split(',').filter(Boolean);
          }
        });

        // Associer les caissiers aux boîtes
        const boitesWithCaissiers = boites.map(b => ({
          ...b,
          caissiers: caissiersMap[b.numero_boite] || [],
          date_debut: null,
          date_fin: null,
        }));

        return {
          annee,
          boites: boitesWithCaissiers,
          total_boites: boites.length,
          total_documents: boites.reduce((sum, b) => sum + b.total_documents, 0),
        };
      }));

      return {
        ...type,
        annees: anneesWithBoites,
        total_boites: anneesWithBoites.reduce((sum, a) => sum + a.total_boites, 0),
        total_documents: anneesWithBoites.reduce((sum, a) => sum + a.total_documents, 0),
      };
    }));

    return {
      agence,
      types: typesWithData,
      total_boites: typesWithData.reduce((sum, t) => sum + t.total_boites, 0),
      total_documents: typesWithData.reduce((sum, t) => sum + t.total_documents, 0),
    };
  },
};

module.exports = AgenceModel;