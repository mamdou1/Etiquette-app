const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

// Création du pool de connexions
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "etiquette_app",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Fonction pour initialiser la base de données
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Créer la base de données si elle n'existe pas
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "etiquette_app"}`
    );
    await connection.query(`USE ${process.env.DB_NAME || "etiquette_app"}`);
    
    // Créer la table agences
    await connection.query(`
      CREATE TABLE IF NOT EXISTS agences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nom (nom),
        INDEX idx_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Créer la table boites
    await connection.query(`
      CREATE TABLE IF NOT EXISTS boites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero VARCHAR(50) NOT NULL UNIQUE,
        agence_id INT NOT NULL,
        date_production VARCHAR(20),
        type_document VARCHAR(100),
        caissiers TEXT,
        annee VARCHAR(10),
        observation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_numero (numero),
        INDEX idx_agence_id (agence_id),
        INDEX idx_type_document (type_document),
        INDEX idx_annee (annee),
        FOREIGN KEY (agence_id) REFERENCES agences(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Créer la table archives
    await connection.query(`
      CREATE TABLE IF NOT EXISTS archives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero_boite VARCHAR(50) NOT NULL,
        agence_id INT NOT NULL,
        agence_nom VARCHAR(100) NOT NULL,
        date_production VARCHAR(20),
        type_document VARCHAR(100),
        caissiers TEXT,
        annee VARCHAR(10),
        observation TEXT,
        source VARCHAR(50) DEFAULT 'upload',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type_document (type_document),
        INDEX idx_annee (annee),
        INDEX idx_agence_nom (agence_nom),
        INDEX idx_numero_boite (numero_boite),
        INDEX idx_date_production (date_production),
        FOREIGN KEY (agence_id) REFERENCES agences(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [userActiveColumn] = await connection.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'active' LIMIT 1`
    );
    if (userActiveColumn.length === 0) {
      await connection.query("ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE AFTER role");
    }
    // Pour les installations créées avant la gestion des rôles, le premier
    // compte devient administrateur afin d'éviter de bloquer l'administration.
    const [[adminCount]] = await connection.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
    if (adminCount.total === 0) {
      await connection.query("UPDATE users SET role = 'admin' ORDER BY id ASC LIMIT 1");
    }

    // Les anciens imports peuvent déjà contenir des doublons. On garde la
    // première ligne enregistrée pour chaque numéro de boîte, puis on rend ce
    // numéro unique afin que les réimports ne recréent plus de doublons.
    const [uniqueIndex] = await connection.query(
      `SELECT 1 FROM information_schema.statistics
       WHERE table_schema = DATABASE()
         AND table_name = 'archives'
         AND index_name = 'uniq_archives_numero_boite'
       LIMIT 1`
    );
    if (uniqueIndex.length === 0) {
      await connection.query(`
        DELETE duplicate_archive FROM archives AS duplicate_archive
        INNER JOIN archives AS first_archive
          ON duplicate_archive.numero_boite = first_archive.numero_boite
         AND duplicate_archive.id > first_archive.id
      `);
      await connection.query(
        "ALTER TABLE archives ADD UNIQUE INDEX uniq_archives_numero_boite (numero_boite)"
      );
    }

    console.log("✅ Base de données MySQL initialisée");
    connection.release();
  } catch (error) {
    console.error("❌ Erreur d'initialisation de la base de données:", error);
    throw error;
  }
};

module.exports = { pool, initDatabase };
