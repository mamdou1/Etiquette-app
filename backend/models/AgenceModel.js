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

    // Deux requêtes constantes, quel que soit le nombre d'années ou de boîtes.
    // L'ancienne version faisait une requête pour chaque année de chaque type.
    const [[types], [values]] = await Promise.all([
      pool.execute(
        `SELECT td.*
         FROM type_documents td
         INNER JOIN agence_type_documents atd ON td.id = atd.type_document_id
         WHERE atd.agence_id = ? AND td.active = TRUE
         ORDER BY td.nom ASC`,
        [id]
      ),
      pool.execute(
        `SELECT mfv.type_document_id, mfv.annee, mfv.numero_boite, mfv.value,
                mf.name, mf.label, mf.field_type
         FROM meta_field_values mfv
         JOIN meta_fields mf ON mf.id = mfv.meta_field_id
         WHERE mfv.agence_id = ?
         ORDER BY mfv.type_document_id, mfv.annee DESC, mfv.numero_boite ASC, mf.position ASC`,
        [id]
      ),
    ]);

    const grouped = new Map();
    values.forEach((row) => {
      const typeKey = String(row.type_document_id);
      const yearKey = String(row.annee || 'Sans année');
      const boxKey = String(row.numero_boite);
      if (!grouped.has(typeKey)) grouped.set(typeKey, new Map());
      const years = grouped.get(typeKey);
      if (!years.has(yearKey)) years.set(yearKey, new Map());
      const boxes = years.get(yearKey);
      if (!boxes.has(boxKey)) {
        boxes.set(boxKey, {
          numero_boite: row.numero_boite,
          total_documents: 0,
          caissiers: [],
          date_debut: null,
          date_fin: null,
          metaValues: {},
        });
      }

      const box = boxes.get(boxKey);
      box.total_documents += 1;
      box.metaValues[row.name] = { label: row.label, field_type: row.field_type, value: row.value };
      if (row.name.toLowerCase() === 'caissiers' && row.value) {
        box.caissiers = String(row.value).split(',').map(value => value.trim()).filter(Boolean);
      }
    });

    const typesWithData = types.map((type) => {
      const years = grouped.get(String(type.id)) || new Map();
      const annees = Array.from(years.entries()).map(([annee, boxes]) => {
        const boites = Array.from(boxes.values());
        return {
          annee,
          boites,
          total_boites: boites.length,
          total_documents: boites.reduce((sum, box) => sum + box.total_documents, 0),
        };
      });
      return {
        ...type,
        annees,
        total_boites: annees.reduce((sum, year) => sum + year.total_boites, 0),
        total_documents: annees.reduce((sum, year) => sum + year.total_documents, 0),
      };
    });

    return {
      agence,
      types: typesWithData,
      total_boites: typesWithData.reduce((sum, t) => sum + t.total_boites, 0),
      total_documents: typesWithData.reduce((sum, t) => sum + t.total_documents, 0),
    };
  },
};

module.exports = AgenceModel;
