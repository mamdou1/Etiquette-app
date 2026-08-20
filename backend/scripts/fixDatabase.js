const { pool, initDatabase } = require("../config/database");

const fixDatabase = async () => {
  try {
    await initDatabase();
    const connection = await pool.getConnection();

    console.log("🔧 Modification de la structure de la base de données...");

    // 1. Modifier la colonne code
    try {
      await connection.query("ALTER TABLE agences MODIFY COLUMN code VARCHAR(100) NULL");
      console.log("✅ Colonne 'code' modifiée (NULL autorisé)");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    // 2. Supprimer les index
    try {
      await connection.query("ALTER TABLE agences DROP INDEX code");
      console.log("✅ Index 'code' supprimé");
    } catch (e) {
      console.log("⚠️ L'index 'code' n'existe pas");
    }

    try {
      await connection.query("ALTER TABLE agences DROP INDEX idx_code");
      console.log("✅ Index 'idx_code' supprimé");
    } catch (e) {
      console.log("⚠️ L'index 'idx_code' n'existe pas");
    }

    // 3. Créer un nouvel index
    try {
      await connection.query("CREATE INDEX idx_code ON agences(code)");
      console.log("✅ Index 'idx_code' créé");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    // 4. Modifier les autres tables
    try {
      await connection.query("ALTER TABLE boites MODIFY COLUMN numero VARCHAR(100) NOT NULL");
      console.log("✅ Colonne 'numero' dans boites modifiée");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    try {
      await connection.query("ALTER TABLE archives MODIFY COLUMN numero_boite VARCHAR(100) NOT NULL");
      console.log("✅ Colonne 'numero_boite' dans archives modifiée");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    try {
      await connection.query("ALTER TABLE archives MODIFY COLUMN agence_nom VARCHAR(200) NOT NULL");
      console.log("✅ Colonne 'agence_nom' dans archives modifiée");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    try {
      await connection.query("ALTER TABLE archives MODIFY COLUMN type_document VARCHAR(200) NULL");
      console.log("✅ Colonne 'type_document' dans archives modifiée");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    try {
      await connection.query("ALTER TABLE archives MODIFY COLUMN caissiers TEXT NULL");
      console.log("✅ Colonne 'caissiers' dans archives modifiée");
    } catch (e) {
      console.log("⚠️", e.message);
    }

    console.log("\n✅ Structure de la base de données mise à jour avec succès !");
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    console.error("📋 Détails:", error);
    process.exit(1);
  }
};

fixDatabase();