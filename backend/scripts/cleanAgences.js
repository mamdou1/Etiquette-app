const { pool, initDatabase } = require("../config/database");

const cleanAgences = async () => {
  try {
    await initDatabase();
    const connection = await pool.getConnection();

    // Liste des noms à supprimer (caissiers détectés comme agences)
    const caissierNames = [
      "Abdoulaye Diarra",
      "Amadou Ambapil",
      "Boubacar Diallo",
      "Djénéba Coulibaly",
      "Yousouf Sidibé",
    ];

    for (const name of caissierNames) {
      await connection.execute(
        "DELETE FROM agences WHERE nom = ?",
        [name]
      );
      console.log(`🗑️ Supprimé: ${name}`);
    }

    console.log("✅ Nettoyage terminé !");
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  }
};

cleanAgences();