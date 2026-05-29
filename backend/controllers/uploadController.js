const fs = require("fs");
const { parseExcel } = require("../services/excelService");

/**
 * POST /api/upload
 * Reçoit le fichier Excel, lit les données, retourne un JSON propre.
 */
const handleUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const filePath = req.file.path;

  try {
    const { data, fields } = parseExcel(filePath);

    // Supprime le fichier après lecture (pas de stockage persistant)
    fs.unlink(filePath, (err) => {
      if (err) console.warn("Impossible de supprimer le fichier temporaire :", err.message);
    });

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      total: data.length,
      fields,
      data,
    });
  } catch (error) {
    // Nettoyage en cas d'erreur
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(422).json({
      error: "Impossible de lire le fichier Excel",
      details: error.message,
    });
  }
};

module.exports = { handleUpload };
