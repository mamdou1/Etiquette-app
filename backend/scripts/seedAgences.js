const { pool, initDatabase } = require("../config/database");

const agencesData = [
  { nom: "DGEI", code: "DGEI" },
  { nom: "DGI", code: "DGI" },
  { nom: "DNCC", code: "DNCC" },
  { nom: "DNP", code: "DNP" },
  { nom: "DGD", code: "DGD" },
];

const seed = async () => {
  try {
    await initDatabase();
    const connection = await pool.getConnection();

    for (const agence of agencesData) {
      await connection.execute(
        `INSERT INTO agences (nom, code, active) VALUES (?, ?, TRUE)
         ON DUPLICATE KEY UPDATE active = TRUE`,
        [agence.nom, agence.code]
      );
    }

    console.log("✅ Agences insérées avec succès !");
    
    const [rows] = await connection.execute("SELECT * FROM agences");
    console.table(rows);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }
};

seed();