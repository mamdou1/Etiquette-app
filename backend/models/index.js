const { pool } = require("../config/database");

// ─── AGENCES ───────────────────────────────────────────────────

const AgenceModel = {
  findByNom: async (nom) => {
    const [rows] = await pool.execute(
      "SELECT * FROM agences WHERE nom = ? AND active = TRUE",
      [String(nom).substring(0, 100)],
    );
    return rows.length ? rows[0] : null;
  },

  findById: async (id) => {
    const [rows] = await pool.execute("SELECT * FROM agences WHERE id = ?", [
      id,
    ]);
    return rows.length ? rows[0] : null;
  },

  // ✅ findOrCreate avec code
  findOrCreate: async (nom, code) => {
    const nomTronque = String(nom).substring(0, 100);
    const codeTronque = code
      ? String(code).substring(0, 50).toUpperCase()
      : String(nom).substring(0, 50).toUpperCase();

    // Chercher si l'agence existe déjà par nom
    const existing = await AgenceModel.findByNom(nomTronque);
    if (existing) return existing;

    // ✅ Insérer avec le code
    const [result] = await pool.execute(
      "INSERT INTO agences (nom, code, active) VALUES (?, ?, TRUE)",
      [nomTronque, codeTronque],
    );

    const [rows] = await pool.execute("SELECT * FROM agences WHERE id = ?", [
      result.insertId,
    ]);

    return rows[0];
  },

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
      values,
    );
    return result.affectedRows > 0;
  },

  softDelete: async (id) => {
    const [result] = await pool.execute(
      "UPDATE agences SET active = FALSE WHERE id = ? AND active = TRUE",
      [id],
    );
    return result.affectedRows > 0;
  },

  deletePermanent: async (id) => {
    const [result] = await pool.execute("DELETE FROM agences WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

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
};

// ─── BOÎTES ────────────────────────────────────────────────────

const BoiteModel = {
  findByAgenceId: async (agenceId) => {
    const [rows] = await pool.execute(
      `SELECT b.*, a.nom as agence_nom 
       FROM boites b
       JOIN agences a ON b.agence_id = a.id
       WHERE b.agence_id = ?
       ORDER BY b.numero`,
      [agenceId],
    );
    return rows;
  },

  findByAgenceNom: async (agenceNom) => {
    const [rows] = await pool.execute(
      `SELECT b.*, a.nom as agence_nom 
       FROM boites b
       JOIN agences a ON b.agence_id = a.id
       WHERE a.nom = ? AND a.active = TRUE
       ORDER BY b.numero`,
      [agenceNom],
    );
    return rows;
  },

  findByNumero: async (numero) => {
    const [rows] = await pool.execute("SELECT * FROM boites WHERE numero = ?", [
      String(numero).substring(0, 50),
    ]);
    return rows.length ? rows[0] : null;
  },

  create: async (boite) => {
    const {
      numero,
      agence_id,
      date_production,
      type_document,
      caissiers,
      annee,
      observation,
    } = boite;

    const [result] = await pool.execute(
      `INSERT INTO boites (numero, agence_id, date_production, type_document, caissiers, annee, observation)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(numero).substring(0, 50),
        agence_id,
        date_production || null,
        type_document ? String(type_document).substring(0, 100) : null,
        caissiers ? String(caissiers).substring(0, 255) : null,
        annee ? String(annee).substring(0, 10) : null,
        observation ? String(observation).substring(0, 255) : null,
      ],
    );

    return result.insertId;
  },

  upsert: async (boite) => {
    const numeroTronque = String(boite.numero).substring(0, 50);
    const existing = await BoiteModel.findByNumero(numeroTronque);

    if (existing) {
      await pool.execute(
        `UPDATE boites 
         SET agence_id = ?, date_production = ?, type_document = ?, 
             caissiers = ?, annee = ?, observation = ?
         WHERE id = ?`,
        [
          boite.agence_id,
          boite.date_production || null,
          boite.type_document
            ? String(boite.type_document).substring(0, 100)
            : null,
          boite.caissiers ? String(boite.caissiers).substring(0, 255) : null,
          boite.annee ? String(boite.annee).substring(0, 10) : null,
          boite.observation
            ? String(boite.observation).substring(0, 255)
            : null,
          existing.id,
        ],
      );
      return existing.id;
    } else {
      return await BoiteModel.create(boite);
    }
  },
};

// ─── ARCHIVES ──────────────────────────────────────────────────

const ArchiveModel = {
  // ✅ Méthode saveMany corrigée
  saveMany: async (archives) => {
    console.log(`📥 saveMany: ${archives.length} archives à sauvegarder`);

    if (archives.length === 0) {
      console.log("⚠️ Aucune archive à sauvegarder");
      return 0;
    }

    // Afficher un exemple des données
    console.log("📋 Exemple de données:", JSON.stringify(archives[0], null, 2));

    try {
      // Construire la requête avec des placeholders individuels
      const placeholders = archives
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .join(", ");

      const values = [];
      archives.forEach((a) => {
        values.push(
          String(a.numero_boite).substring(0, 50),
          a.agence_id || 0,
          String(a.agence_nom).substring(0, 100),
          a.date_production ? String(a.date_production).substring(0, 20) : null,
          a.type_document ? String(a.type_document).substring(0, 100) : null,
          a.caissiers ? String(a.caissiers).substring(0, 255) : null,
          a.annee ? String(a.annee).substring(0, 10) : null,
          a.observation ? String(a.observation).substring(0, 255) : null,
          a.source || "upload",
        );
      });

      // L'unicité de numero_boite est garantie par la base. INSERT IGNORE
      // conserve donc le tout premier enregistrement lors d'un réimport.
      const query = `
      INSERT IGNORE INTO archives (
        numero_boite, agence_id, agence_nom, date_production,
        type_document, caissiers, annee, observation, source
      ) VALUES ${placeholders}
    `;

      console.log("🔍 Exécution de la requête d'insertion...");
      const [result] = await pool.execute(query, values);
      console.log(`✅ ${result.affectedRows} archives sauvegardées`);
      return result.affectedRows;
    } catch (error) {
      console.error("❌ Erreur dans saveMany:", error.message);
      console.error("📝 Détails:", error);
      return 0;
    }
  },

  search: async (params) => {
    let query = `
      SELECT a.*, ag.code as agence_code
      FROM archives a
      LEFT JOIN agences ag ON a.agence_id = ag.id
      WHERE 1=1
    `;
    const values = [];

    if (params.type_document) {
      query += " AND a.type_document LIKE ?";
      values.push(`%${params.type_document}%`);
    }

    if (params.annee) {
      query += " AND a.annee = ?";
      values.push(params.annee);
    }

    if (params.agence_nom) {
      query += " AND a.agence_nom LIKE ?";
      values.push(`%${params.agence_nom}%`);
    }

    if (params.numero_boite) {
      query += " AND a.numero_boite LIKE ?";
      values.push(`%${params.numero_boite}%`);
    }

    if (params.date_debut) {
      query += " AND a.date_production >= ?";
      values.push(params.date_debut);
    }

    if (params.date_fin) {
      query += " AND a.date_production <= ?";
      values.push(params.date_fin);
    }

    query += " ORDER BY a.date_production DESC, a.numero_boite ASC";

    const [rows] = await pool.execute(query, values);
    return rows;
  },

  findAll: async (limit, offset) => {
    let query = `
      SELECT a.*, ag.code as agence_code
      FROM archives a
      LEFT JOIN agences ag ON a.agence_id = ag.id
      ORDER BY a.date_production DESC, a.numero_boite ASC
    `;
    const values = [];

    if (limit !== undefined) {
      query += " LIMIT ?";
      values.push(limit);

      if (offset !== undefined) {
        query += " OFFSET ?";
        values.push(offset);
      }
    }

    const [rows] = await pool.execute(query, values);
    return rows;
  },

  getDocumentTypes: async () => {
    const [rows] = await pool.execute(
      "SELECT DISTINCT type_document FROM archives WHERE type_document IS NOT NULL AND type_document != '' ORDER BY type_document",
    );
    return rows.map((r) => r.type_document);
  },

  getAnnees: async () => {
    const [rows] = await pool.execute(
      "SELECT DISTINCT annee FROM archives WHERE annee IS NOT NULL AND annee != '' ORDER BY annee DESC",
    );
    return rows.map((r) => r.annee);
  },

  count: async (filters) => {
    let query = "SELECT COUNT(*) as total FROM archives WHERE 1=1";
    const values = [];

    if (filters?.type_document) {
      query += " AND type_document LIKE ?";
      values.push(`%${filters.type_document}%`);
    }

    if (filters?.annee) {
      query += " AND annee = ?";
      values.push(filters.annee);
    }

    if (filters?.agence_nom) {
      query += " AND agence_nom LIKE ?";
      values.push(`%${filters.agence_nom}%`);
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  },

  deleteById: async (id) => {
    const [result] = await pool.execute("DELETE FROM archives WHERE id = ?", [
      id,
    ]);
    return result.affectedRows > 0;
  },

  deleteAll: async () => {
    const [result] = await pool.execute("TRUNCATE TABLE archives");
    return result.affectedRows > 0;
  },
};

module.exports = { AgenceModel, BoiteModel, ArchiveModel };
