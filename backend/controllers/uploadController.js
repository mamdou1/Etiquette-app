const fs = require("fs");
const { parseExcel } = require("../services/excelService");
const { enrichirEtStocker } = require("../services/enrichissementService");

const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const filePath = req.file.path;

  try {
    const { data, fields } = parseExcel(filePath);

    const { enriched, savedCount, agenceTrouvees, nouvellesAgences } = 
      await enrichirEtStocker(data);

    const allFields = [...fields];
    const newFields = Object.keys(enriched[0] || {}).filter(
      (key) => !fields.includes(key)
    );
    allFields.push(...newFields);

    fs.unlink(filePath, (err) => {
      if (err) console.warn("Impossible de supprimer le fichier temporaire :", err.message);
    });

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      total: enriched.length,
      fields: allFields,
      data: enriched,
      savedCount: savedCount,
      enriched: true,
      agenceTrouvees,
      nouvellesAgences,
      originalCount: data.length,
      enrichedCount: enriched.length,
    });
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(422).json({
      error: "Impossible de traiter le fichier Excel",
      details: error.message,
    });
  }
};

module.exports = { handleUpload };