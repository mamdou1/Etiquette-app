const { DataTypes } = require("sequelize");

const options = (tableName, indexes = []) => ({
  tableName,
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes,
});

const registerSchema = (sequelize) => {
  const Agence = sequelize.define("Agence", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nom: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, options("agences", [{ fields: ["nom"] }, { fields: ["code"] }]));

  const TypeDocument = sequelize.define("TypeDocument", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    code: { type: DataTypes.STRING(100), allowNull: false },
    description: DataTypes.TEXT,
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, options("type_documents", [{ fields: ["nom"] }, { fields: ["active"] }]));

  const Boite = sequelize.define("Boite", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    agence_id: { type: DataTypes.INTEGER, allowNull: false },
    date_production: DataTypes.STRING(20),
    type_document: DataTypes.STRING(100),
    caissiers: DataTypes.TEXT,
    annee: DataTypes.STRING(10),
    observation: DataTypes.TEXT,
  }, options("boites", [
    { fields: ["numero"] }, { fields: ["agence_id"] }, { fields: ["type_document"] }, { fields: ["annee"] },
  ]));

  const Archive = sequelize.define("Archive", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero_boite: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    agence_id: { type: DataTypes.INTEGER, allowNull: false },
    agence_nom: { type: DataTypes.STRING(100), allowNull: false },
    date_production: DataTypes.STRING(20),
    type_document: DataTypes.STRING(100),
    type_document_id: DataTypes.INTEGER,
    caissiers: DataTypes.TEXT,
    annee: DataTypes.STRING(10),
    observation: DataTypes.TEXT,
    source: { type: DataTypes.STRING(50), defaultValue: "upload" },
    uploaded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, options("archives", [
    { fields: ["type_document"] }, { fields: ["type_document_id"] }, { fields: ["annee"] },
    { fields: ["agence_nom"] }, { fields: ["numero_boite"] }, { fields: ["date_production"] },
  ]));

  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "user" },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    last_login: DataTypes.DATE,
  }, options("users", [{ fields: ["email"] }]));

  const AgenceTypeDocument = sequelize.define("AgenceTypeDocument", {
    agence_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    type_document_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  }, { tableName: "agence_type_documents", timestamps: false });

  const MetaField = sequelize.define("MetaField", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type_document_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    label: { type: DataTypes.STRING(150), allowNull: false },
    field_type: { type: DataTypes.STRING(50), defaultValue: "TEXT" },
    required: { type: DataTypes.BOOLEAN, defaultValue: false },
    visible: { type: DataTypes.BOOLEAN, defaultValue: true },
    options: DataTypes.TEXT,
    position: { type: DataTypes.INTEGER, defaultValue: 0 },
    placeholder: DataTypes.STRING(255),
    description: DataTypes.TEXT,
    default_value: DataTypes.TEXT,
    deleted_at: DataTypes.DATE,
  }, options("meta_fields", [{ fields: ["type_document_id", "position"] }]));

  const MetaFieldValue = sequelize.define("MetaFieldValue", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    agence_id: { type: DataTypes.INTEGER, allowNull: false },
    type_document_id: { type: DataTypes.INTEGER, allowNull: false },
    meta_field_id: { type: DataTypes.INTEGER, allowNull: false },
    numero_boite: { type: DataTypes.STRING(50), allowNull: false },
    annee: DataTypes.STRING(10),
    value: DataTypes.TEXT,
  }, options("meta_field_values", [
    { unique: true, fields: ["agence_id", "type_document_id", "meta_field_id", "numero_boite"] },
    { fields: ["numero_boite"] }, { fields: ["annee"] },
  ]));

  Boite.belongsTo(Agence, { foreignKey: "agence_id", onDelete: "CASCADE" });
  Archive.belongsTo(Agence, { foreignKey: "agence_id", onDelete: "CASCADE" });
  Archive.belongsTo(TypeDocument, { foreignKey: "type_document_id", onDelete: "SET NULL" });
  Agence.belongsToMany(TypeDocument, { through: AgenceTypeDocument, foreignKey: "agence_id" });
  TypeDocument.belongsToMany(Agence, { through: AgenceTypeDocument, foreignKey: "type_document_id" });
  MetaField.belongsTo(TypeDocument, { foreignKey: "type_document_id", onDelete: "CASCADE" });
  MetaFieldValue.belongsTo(Agence, { foreignKey: "agence_id", onDelete: "CASCADE" });
  MetaFieldValue.belongsTo(TypeDocument, { foreignKey: "type_document_id", onDelete: "CASCADE" });
  MetaFieldValue.belongsTo(MetaField, { foreignKey: "meta_field_id", onDelete: "CASCADE" });

  return { Agence, TypeDocument, Boite, Archive, User, AgenceTypeDocument, MetaField, MetaFieldValue };
};

module.exports = { registerSchema };
