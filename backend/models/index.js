const { pool } = require("../config/database");

// ─── UTILISATEURS ───────────────────────────────────────────────

const UserModel = {
  findByEmail: async (email) => {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [String(email).trim().toLowerCase()],
    );
    return rows.length ? rows[0] : null;
  },

  findById: async (id) => {
    const [rows] = await pool.execute(
      "SELECT id, nom, email, role, active, created_at FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    return rows.length ? rows[0] : null;
  },

  count: async () => {
    const [[row]] = await pool.execute("SELECT COUNT(*) AS total FROM users");
    return row.total;
  },

  countActiveAdmins: async () => {
    const [[row]] = await pool.execute(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = TRUE",
    );
    return row.total;
  },

  findAll: async () => {
    const [rows] = await pool.execute(
      "SELECT id, nom, email, role, active, created_at, updated_at FROM users ORDER BY nom ASC",
    );
    return rows;
  },

  create: async ({ nom, email, passwordHash, role = "user" }) => {
    const [result] = await pool.execute(
      "INSERT INTO users (nom, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [
        String(nom).trim().substring(0, 100),
        String(email).trim().toLowerCase().substring(0, 150),
        passwordHash,
        role === "admin" ? "admin" : "user",
      ],
    );
    return UserModel.findById(result.insertId);
  },

  update: async (id, { nom, email, role, passwordHash }) => {
    const fields = ["nom = ?", "email = ?", "role = ?"];
    const values = [
      String(nom).trim().substring(0, 100),
      String(email).trim().toLowerCase().substring(0, 150),
      role === "admin" ? "admin" : "user"
    ];
    if (passwordHash) {
      fields.push("password_hash = ?");
      values.push(passwordHash);
    }
    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    return UserModel.findById(id);
  },

  setActive: async (id, active) => {
    await pool.execute("UPDATE users SET active = ? WHERE id = ?", [Boolean(active), id]);
    return UserModel.findById(id);
  },
};

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
    const [rows] = await pool.execute("SELECT * FROM agences WHERE id = ?", [id]);
    return rows.length ? rows[0] : null;
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

  findOrCreate: async (nom, code) => {
    const nomTronque = String(nom).substring(0, 100);
    const codeTronque = code
      ? String(code).substring(0, 50).toUpperCase()
      : String(nom).substring(0, 50).toUpperCase();

    const existing = await AgenceModel.findByNom(nomTronque);
    if (existing) return existing;

    const [result] = await pool.execute(
      "INSERT INTO agences (nom, code, active) VALUES (?, ?, TRUE)",
      [nomTronque, codeTronque],
    );

    const [rows] = await pool.execute("SELECT * FROM agences WHERE id = ?", [result.insertId]);
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
    const [result] = await pool.execute("DELETE FROM agences WHERE id = ?", [id]);
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

  // ─── HIÉRARCHIE : Agence → Type → Année → Boîtes ──────────
  getHierarchy: async (id) => {
    const agence = await AgenceModel.findById(id);
    if (!agence) return null;

    const [types] = await pool.execute(
      `SELECT td.* 
       FROM type_documents td
       INNER JOIN agence_type_documents atd ON td.id = atd.type_document_id
       WHERE atd.agence_id = ? AND td.active = TRUE
       ORDER BY td.nom ASC`,
      [id]
    );

    const typesWithData = await Promise.all(types.map(async (type) => {
      const [annees] = await pool.execute(
        `SELECT DISTINCT a.annee
         FROM archives a
         WHERE a.agence_id = ? AND a.type_document = ? AND a.annee IS NOT NULL AND a.annee != ''
         ORDER BY a.annee DESC`,
        [id, type.nom]
      );

      const anneesWithBoites = await Promise.all(annees.map(async ({ annee }) => {
        const [boites] = await pool.execute(
          `SELECT 
            a.numero_boite,
            COUNT(*) as total_documents,
            GROUP_CONCAT(DISTINCT a.caissiers) as caissiers,
            MIN(a.date_production) as date_debut,
            MAX(a.date_production) as date_fin
           FROM archives a
           WHERE a.agence_id = ? AND a.type_document = ? AND a.annee = ?
           GROUP BY a.numero_boite
           ORDER BY a.numero_boite ASC`,
          [id, type.nom, annee]
        );

        return {
          annee,
          boites: boites.map(b => ({
            numero_boite: b.numero_boite,
            total_documents: b.total_documents,
            caissiers: b.caissiers ? b.caissiers.split(',') : [],
            date_debut: b.date_debut,
            date_fin: b.date_fin,
          })),
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

// ─── TYPES DE DOCUMENTS ────────────────────────────────────────

const TypeDocumentModel = {
  // Récupérer tous les types avec leurs agences
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

  // Récupérer les types d'une agence spécifique
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

  // Récupérer un type par son ID
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

  // Vérifier si un type existe déjà (par nom)
  findByNom: async (nom) => {
    const [rows] = await pool.execute(
      'SELECT * FROM type_documents WHERE nom = ?',
      [nom]
    );
    return rows[0] || null;
  },

  // Créer un nouveau type (sans affectation aux agences)
  create: async (data) => {
    const { nom, code, description, active = true } = data;

    const [result] = await pool.execute(
      `INSERT INTO type_documents (nom, code, description, active, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [nom.trim(), code || nom.trim().toUpperCase(), description || null, active ? 1 : 0]
    );

    return TypeDocumentModel.findById(result.insertId);
  },

  // Affecter un type à des agences
  assignToAgences: async (typeId, agenceIds) => {
    // Supprimer les anciennes relations
    await pool.execute('DELETE FROM agence_type_documents WHERE type_document_id = ?', [typeId]);

    // Ajouter les nouvelles relations
    if (agenceIds && agenceIds.length > 0) {
      const values = agenceIds.map(id => `(${id}, ${typeId})`).join(', ');
      await pool.execute(
        `INSERT INTO agence_type_documents (agence_id, type_document_id) VALUES ${values}`
      );
    }

    return TypeDocumentModel.findById(typeId);
  },

  // Mettre à jour un type
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

  // Désactiver un type (soft delete)
  softDelete: async (id) => {
    const [result] = await pool.execute(
      'UPDATE type_documents SET active = 0 WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Supprimer définitivement
  deletePermanent: async (id) => {
    const [result] = await pool.execute('DELETE FROM type_documents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Récupérer les statistiques d'un type
  getStats: async (id) => {
    const [rows] = await pool.execute(
      `SELECT 
        COUNT(a.id) as total_archives,
        COUNT(DISTINCT a.numero_boite) as total_boites,
        COUNT(DISTINCT a.annee) as total_annees
       FROM archives a
       WHERE a.type_document_id = ?`,
      [id]
    );
    return rows[0] || { total_archives: 0, total_boites: 0, total_annees: 0 };
  },
};

// ─── MÉTADONNÉES (champs personnalisés par type) ──────────────

const MetaFieldModel = {
  // Récupérer tous les champs d'un type
  findByType: async (typeId) => {
    const [rows] = await pool.execute(
      'SELECT * FROM meta_fields WHERE type_document_id = ? ORDER BY position ASC',
      [typeId]
    );
    return rows;
  },

  // Récupérer un champ par son ID
  findById: async (id) => {
    const [rows] = await pool.execute(
      'SELECT * FROM meta_fields WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  // Créer un champ de métadonnée
  create: async (data) => {
    const { type_document_id, name, label, field_type, required, visible, options, position, placeholder, description, default_value } = data;

    // Calculer la position si non fournie
    let pos = position;
    if (pos === undefined) {
      const [maxPos] = await pool.execute(
        'SELECT MAX(position) as max FROM meta_fields WHERE type_document_id = ?',
        [type_document_id]
      );
      pos = (maxPos[0].max || 0) + 1;
    }

    const [result] = await pool.execute(
      `INSERT INTO meta_fields (type_document_id, name, label, field_type, required, visible, options, position, placeholder, description, default_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type_document_id,
        name.trim(),
        label.trim(),
        field_type || 'TEXT',
        required ? 1 : 0,
        visible !== undefined ? visible : 1,
        options ? JSON.stringify(options) : null,
        pos,
        placeholder || null,
        description || null,
        default_value || null,
      ]
    );

    return MetaFieldModel.findById(result.insertId);
  },

  // Mettre à jour un champ
  update: async (id, data) => {
    const fields = [];
    const values = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name.trim()); }
    if (data.label !== undefined) { fields.push('label = ?'); values.push(data.label.trim()); }
    if (data.field_type !== undefined) { fields.push('field_type = ?'); values.push(data.field_type); }
    if (data.required !== undefined) { fields.push('required = ?'); values.push(data.required ? 1 : 0); }
    if (data.visible !== undefined) { fields.push('visible = ?'); values.push(data.visible ? 1 : 0); }
    if (data.options !== undefined) { fields.push('options = ?'); values.push(data.options ? JSON.stringify(data.options) : null); }
    if (data.position !== undefined) { fields.push('position = ?'); values.push(data.position); }
    if (data.placeholder !== undefined) { fields.push('placeholder = ?'); values.push(data.placeholder || null); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null); }
    if (data.default_value !== undefined) { fields.push('default_value = ?'); values.push(data.default_value || null); }

    if (fields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE meta_fields SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return MetaFieldModel.findById(id);
  },

  // Supprimer un champ (soft delete)
  softDelete: async (id) => {
    const [result] = await pool.execute(
      'UPDATE meta_fields SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  // Supprimer définitivement
  deletePermanent: async (id) => {
    const [result] = await pool.execute('DELETE FROM meta_fields WHERE id = ?', [id]);
    return result.affectedRows > 0;
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
          boite.type_document ? String(boite.type_document).substring(0, 100) : null,
          boite.caissiers ? String(boite.caissiers).substring(0, 255) : null,
          boite.annee ? String(boite.annee).substring(0, 10) : null,
          boite.observation ? String(boite.observation).substring(0, 255) : null,
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
  saveMany: async (archives) => {
    console.log(`📥 saveMany: ${archives.length} archives à sauvegarder`);

    if (archives.length === 0) {
      console.log("⚠️ Aucune archive à sauvegarder");
      return 0;
    }

    try {
      // Vérifier si la colonne donnees_supplementaires existe
      let hasExtraColumn = false;
      try {
        const [columns] = await pool.execute(
          "SHOW COLUMNS FROM archives LIKE 'donnees_supplementaires'"
        );
        hasExtraColumn = columns.length > 0;
      } catch (e) {
        // La colonne n'existe pas, on continue sans
      }

      // Construire la requête dynamiquement
      const baseFields = [
        "numero_boite", "agence_id", "agence_nom", "date_production",
        "type_document", "caissiers", "annee", "observation", "source"
      ];
      
      let fields = [...baseFields];
      let placeholders = archives.map(() => {
        const count = fields.length + (hasExtraColumn ? 1 : 0);
        return `(${Array(count).fill('?').join(', ')})`;
      }).join(", ");

      if (hasExtraColumn) {
        fields.push("donnees_supplementaires");
      }

      const values = [];
      archives.forEach((a) => {
        const baseValues = [
          String(a.numero_boite || "").substring(0, 50),
          a.agence_id || 0,
          String(a.agence_nom || "").substring(0, 100),
          a.date_production ? String(a.date_production).substring(0, 20) : null,
          String(a.type_document || "").substring(0, 100),
          String(a.caissiers || "").substring(0, 255),
          String(a.annee || "").substring(0, 10),
          String(a.observation || "").substring(0, 255),
          a.source || "upload",
        ];
        
        if (hasExtraColumn) {
          baseValues.push(a.donnees_supplementaires ? JSON.stringify(a.donnees_supplementaires) : null);
        }
        
        values.push(...baseValues);
      });

      const query = `
        INSERT IGNORE INTO archives (${fields.join(', ')})
        VALUES ${placeholders}
      `;

      console.log(`🔍 Exécution de la requête d'insertion (${archives.length} lignes)...`);
      const [result] = await pool.execute(query, values);
      
      const inserted = result.affectedRows;
      const duplicates = archives.length - inserted;
      
      console.log(`✅ ${inserted} archives sauvegardées, ${duplicates} doublons ignorés`);
      return inserted;
    } catch (error) {
      console.error("❌ Erreur dans saveMany:", error.message);
      
      // En cas d'erreur, essayer sans la colonne JSON
      if (error.message.includes('donnees_supplementaires')) {
        console.log("🔄 Réessai sans la colonne donnees_supplementaires...");
        return await saveManyWithoutExtra(archives);
      }
      
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
    const [result] = await pool.execute("DELETE FROM archives WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  deleteAll: async () => {
    const [result] = await pool.execute("TRUNCATE TABLE archives");
    return result.affectedRows > 0;
  },
};

// ─── FONCTION DE FALLBACK SANS COLONNE JSON ──────────────────

async function saveManyWithoutExtra(archives) {
  try {
    const placeholders = archives.map(() => 
      "(?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).join(", ");

    const values = [];
    archives.forEach((a) => {
      values.push(
        String(a.numero_boite || "").substring(0, 50),
        a.agence_id || 0,
        String(a.agence_nom || "").substring(0, 100),
        a.date_production ? String(a.date_production).substring(0, 20) : null,
        String(a.type_document || "").substring(0, 100),
        String(a.caissiers || "").substring(0, 255),
        String(a.annee || "").substring(0, 10),
        String(a.observation || "").substring(0, 255),
        a.source || "upload",
      );
    });

    const query = `
      INSERT IGNORE INTO archives (
        numero_boite, agence_id, agence_nom, date_production,
        type_document, caissiers, annee, observation, source
      ) VALUES ${placeholders}
    `;

    const [result] = await pool.execute(query, values);
    return result.affectedRows;
  } catch (error) {
    console.error("❌ Erreur dans saveManyWithoutExtra:", error.message);
    return 0;
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────

module.exports = {
  UserModel,
  AgenceModel,
  TypeDocumentModel,
  MetaFieldModel,
  BoiteModel,
  ArchiveModel,
};