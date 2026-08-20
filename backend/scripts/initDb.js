const { initDatabase } = require("../config/database");

const init = async () => {
  try {
    await initDatabase();
    console.log("✅ Base de données initialisée avec succès !");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
};

init();