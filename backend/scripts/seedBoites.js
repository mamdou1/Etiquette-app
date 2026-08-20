const { pool, initDatabase } = require("../config/database");

const boitesData = [
  { numero: "BOX-001", agence_nom: "DGEI", date_production: "08/08/2023", type_document: "Pièces de caisse", caissiers: "Djénéba Coulibaly", annee: "2023", observation: "Test" },
  { numero: "BOX-002", agence_nom: "DGEI", date_production: "09/08/2023", type_document: "Pièces de caisse", caissiers: "Moussa Diallo", annee: "2023", observation: "" },
  { numero: "BOX-003", agence_nom: "DGEI", date_production: "10/08/2023", type_document: "Pièces de caisse", caissiers: "Fatoumata Traoré", annee: "2023", observation: "Urgent" },
  { numero: "BOX-004", agence_nom: "DGEI", date_production: "11/08/2023", type_document: "Pièces de caisse", caissiers: "Amadou Ambapil", annee: "2023", observation: "" },
  { numero: "BOX-005", agence_nom: "DGEI", date_production: "12/08/2023", type_document: "Pièces de caisse", caissiers: "Yousouf Sidibé", annee: "2023", observation: "Livraison" },
  { numero: "BOX-101", agence_nom: "DGI", date_production: "08/08/2023", type_document: "Pièces de caisse", caissiers: "Moussa Diallo", annee: "2023", observation: "" },
  { numero: "BOX-102", agence_nom: "DGI", date_production: "09/08/2023", type_document: "Pièces de caisse", caissiers: "Amadou Ambapil", annee: "2023", observation: "" },
];

const seed = async () => {
  try {
    await initDatabase();
    const connection = await pool.getConnection();

    for (const boite of boitesData) {
      const [agenceRows] = await connection.execute(
        "SELECT id FROM agences WHERE nom = ?",
        [boite.agence_nom]
      );
      
      if (agenceRows.length === 0) {
        console.log(`⚠️ Agence "${boite.agence_nom}" non trouvée, création...`);
        const [result] = await connection.execute(
          "INSERT INTO agences (nom, code, active) VALUES (?, ?, TRUE)",
          [boite.agence_nom, boite.agence_nom]
        );
        const agenceId = result.insertId;
        
        await connection.execute(
          `INSERT INTO boites (numero, agence_id, date_production, type_document, caissiers, annee, observation)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [boite.numero, agenceId, boite.date_production, boite.type_document, boite.caissiers, boite.annee, boite.observation]
        );
      } else {
        const agenceId = agenceRows[0].id;
        await connection.execute(
          `INSERT INTO boites (numero, agence_id, date_production, type_document, caissiers, annee, observation)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           agence_id = VALUES(agence_id),
           date_production = VALUES(date_production),
           type_document = VALUES(type_document),
           caissiers = VALUES(caissiers),
           annee = VALUES(annee),
           observation = VALUES(observation)`,
          [boite.numero, agenceId, boite.date_production, boite.type_document, boite.caissiers, boite.annee, boite.observation]
        );
      }
    }

    console.log("✅ Boîtes insérées avec succès !");
    
    const [rows] = await connection.execute(
      `SELECT b.*, a.nom as agence_nom 
       FROM boites b 
       JOIN agences a ON b.agence_id = a.id 
       ORDER BY b.numero`
    );
    console.table(rows);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
};

seed();