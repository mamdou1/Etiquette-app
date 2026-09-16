const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");
const { registerSchema } = require("../models/schema");
const dotenv = require("dotenv");

dotenv.config();

const databaseName = process.env.DB_NAME || "etiquette_app";
const connectionOptions = {
  host: process.env.DB_HOST || "localhost",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
};

// Le pool reste disponible pour les requêtes métier existantes.
const pool = mysql.createPool({
  host: connectionOptions.host,
  user: connectionOptions.username,
  password: connectionOptions.password,
  database: databaseName,
  port: connectionOptions.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const sequelize = new Sequelize(databaseName, connectionOptions.username, connectionOptions.password, {
  host: connectionOptions.host,
  port: connectionOptions.port,
  dialect: "mysql",
  logging: false,
});

const models = registerSchema(sequelize);

const createDatabaseIfNeeded = async () => {
  const adminSequelize = new Sequelize("", connectionOptions.username, connectionOptions.password, {
    host: connectionOptions.host,
    port: connectionOptions.port,
    dialect: "mysql",
    logging: false,
  });

  try {
    await adminSequelize.getQueryInterface().createDatabase(databaseName, {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    });
  } catch (error) {
    // MySQL renvoie une erreur si la base existe déjà : c'est attendu.
    if (error.original?.code !== "ER_DB_CREATE_EXISTS") throw error;
  } finally {
    await adminSequelize.close();
  }
};

// Une table définie dans schema.js est créée ou adaptée automatiquement
// au prochain démarrage quand alter vaut true.
const initDatabase = async ({ alter = false } = {}) => {
  try {
    await createDatabaseIfNeeded();
    await sequelize.authenticate();
    await sequelize.sync({ alter });

    const adminCount = await models.User.count({ where: { role: "admin" } });
    if (adminCount === 0) {
      await models.User.update({ role: "admin" }, { where: {}, limit: 1 });
    }

    console.log("✅ Base de données MySQL synchronisée");
  } catch (error) {
    console.error("❌ Erreur d'initialisation de la base de données:", error);
    throw error;
  }
};

module.exports = { pool, sequelize, models, initDatabase };
