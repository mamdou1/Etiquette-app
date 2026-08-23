const fs = require("fs");
const path = require("path");
const { parseExcel } = require("../services/excelService");
const { enrichirEtStocker } = require("../services/enrichissementService");

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier reçu" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Format non supporté. Utilisez .xlsx ou .xls" });
  }

  if (req.file.size > MAX_FILE_SIZE) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Fichier trop volumineux (max 10 MB)" });
  }

  const filePath = req.file.path;

  try {
    console.log(`📄 Traitement du fichier: ${req.file.originalname}`);
    
    const { data, fields } = parseExcel(filePath);
    
    if (!data || data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(422).json({
        error: "Le fichier Excel est vide ou mal formaté"
      });
    }

    const { 
      enriched, 
      savedCount, 
      doublonsIgnores,
      agenceTrouvees, 
      nouvellesAgences,
      typesTrouves,
      nouveauxTypes,
      relationsCreees,
      totalLignes,
      totalBoitesUniques,
      champsDetectes,
      isReimport
    } = await enrichirEtStocker(data);

    const allFields = [...fields];
    const newFields = Object.keys(enriched[0] || {}).filter(
      (key) => !fields.includes(key)
    );
    allFields.push(...newFields);

    fs.unlink(filePath, (err) => {
      if (err) console.warn("⚠️ Impossible de supprimer le fichier temporaire :", err.message);
    });

    console.log(`✅ Traitement terminé: ${enriched.length} lignes traitées`);

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      total: enriched.length,
      fields: allFields,
      data: enriched,
      savedCount: savedCount || 0,
      doublonsIgnores: doublonsIgnores || 0,
      enriched: true,
      agenceTrouvees: agenceTrouvees || [],
      nouvellesAgences: nouvellesAgences || [],
      typesTrouves: typesTrouves || [],
      nouveauxTypes: nouveauxTypes || [],
      relationsCreees: relationsCreees || [],
      originalCount: data.length,
      enrichedCount: enriched.length,
      totalBoitesUniques: totalBoitesUniques || 0,
      champsDetectes: champsDetectes || [],
      isReimport: isReimport || false
    });
  } catch (error) {
    console.error("❌ Erreur traitement:", error.message);
    
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    return res.status(422).json({
      error: "Impossible de traiter le fichier Excel",
      details: error.message,
    });
  }
};

module.exports = { handleUpload };