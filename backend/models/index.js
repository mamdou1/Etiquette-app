// @ts-nocheck
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const db = {};

// 🔹 Import des modèles
db.Fichiers = require("./Fichiers.model")(sequelize, DataTypes);
// 🔹 Appel des associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

//console.log("Models chargés:", Object.keys(db));

// 🔹 Exports
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
