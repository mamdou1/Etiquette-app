const { pool } = require("../config/database");

const UserModel = {
  // ─── Trouver un utilisateur par email ──────────────────────
  findByEmail: async (email) => {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [String(email).trim().toLowerCase()]
    );
    return rows.length ? rows[0] : null;
  },

  // ─── Trouver un utilisateur par ID ─────────────────────────
  findById: async (id) => {
    const [rows] = await pool.execute(
      "SELECT id, nom, email, role, active, created_at FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows.length ? rows[0] : null;
  },

  // ─── Compter tous les utilisateurs ─────────────────────────
  count: async () => {
    const [[row]] = await pool.execute("SELECT COUNT(*) AS total FROM users");
    return row.total;
  },

  // ─── Compter les administrateurs actifs ────────────────────
  countActiveAdmins: async () => {
    const [[row]] = await pool.execute(
      "SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND active = TRUE"
    );
    return row.total;
  },

  // ─── Récupérer tous les utilisateurs ───────────────────────
  findAll: async () => {
    const [rows] = await pool.execute(
      "SELECT id, nom, email, role, active, created_at, updated_at FROM users ORDER BY nom ASC"
    );
    return rows;
  },

  // ─── Créer un utilisateur ──────────────────────────────────
  create: async ({ nom, email, passwordHash, role = "user" }) => {
    const [result] = await pool.execute(
      "INSERT INTO users (nom, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [
        String(nom).trim().substring(0, 100),
        String(email).trim().toLowerCase().substring(0, 150),
        passwordHash,
        role === "admin" ? "admin" : "user",
      ]
    );
    return UserModel.findById(result.insertId);
  },

  // ─── Mettre à jour un utilisateur ──────────────────────────
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

  // ─── Activer/Désactiver un utilisateur ─────────────────────
  setActive: async (id, active) => {
    await pool.execute("UPDATE users SET active = ? WHERE id = ?", [Boolean(active), id]);
    return UserModel.findById(id);
  },

  // ─── Mettre à jour la date de dernier login ────────────────
  updateLastLogin: async (id) => {
    await pool.execute(
      "UPDATE users SET last_login = NOW() WHERE id = ?",
      [id]
    );
    return UserModel.findById(id);
  },

  // ─── Supprimer un utilisateur (soft delete) ────────────────
  softDelete: async (id) => {
    const [result] = await pool.execute(
      "UPDATE users SET active = FALSE WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  // ─── Supprimer définitivement un utilisateur ───────────────
  deletePermanent: async (id) => {
    const [result] = await pool.execute(
      "DELETE FROM users WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = UserModel;