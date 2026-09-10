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

  const agence_id = req.body.agence_id ? parseInt(req.body.agence_id) : null;
  const type_document_id = req.body.type_document_id ? parseInt(req.body.type_document_id) : null;

  if (!agence_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      success: false,
      error: "agence_id est requis" 
    });
  }
  if (!type_document_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      success: false,
      error: "type_document_id est requis" 
    });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      success: false,
      error: "Format non supporté. Utilisez .xlsx ou .xls" 
    });
  }

  if (req.file.size > MAX_FILE_SIZE) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ 
      success: false,
      error: "Fichier trop volumineux (max 10 MB)" 
    });
  }

  const filePath = req.file.path;

  try {
    console.log(`📄 Traitement du fichier: ${req.file.originalname}`);
    console.log(`📌 Agence: ${agence_id}, Type: ${type_document_id}`);
    
    // ✅ Lire TOUTES les feuilles
    const { data, fields, availableYears, yearData, totalRows, sheets } = parseExcel(filePath);
    
    if (!data || data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(422).json({
        success: false,
        error: "Le fichier Excel est vide ou mal formaté"
      });
    }

    console.log(`📊 ${data.length} lignes trouvées dans ${sheets.length} feuille(s)`);
    console.log(`📅 Années disponibles: ${availableYears.join(', ')}`);

    // ✅ Appel à enrichirEtStocker avec validation intégrée
    const result = await enrichirEtStocker(data, agence_id, type_document_id);

    // ✅ Ajouter les années disponibles au résultat
    result.availableYears = availableYears;
    result.yearData = yearData;
    result.sheets = sheets;
    result.totalRows = totalRows;

    const allFields = [...fields];
    const newFields = Object.keys(result.enriched[0] || {}).filter(
      (key) => !fields.includes(key)
    );
    allFields.push(...newFields);

    fs.unlink(filePath, (err) => {
      if (err) console.warn("⚠️ Impossible de supprimer le fichier temporaire :", err.message);
    });

    console.log(`✅ Traitement terminé: ${result.totalBoites} boîtes traitées`);

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      totalLignes: result.totalLignes || 0,
      totalBoites: result.totalBoites || 0,
      savedCount: result.savedCount || 0,
      metaFieldsCrees: result.metaFieldsCrees || 0,
      metaFields: result.metaFields || [],
      fields: allFields,
      data: result.enriched || [],
      agenceTrouvees: result.agenceTrouvees || [],
      typesTrouves: result.typesTrouves || [],
      champsDetectes: Object.keys(data[0] || {}),
      message: result.message || `✅ ${result.totalBoites || 0} boîtes sauvegardées avec succès`,
      // ✅ AJOUT : Informations sur les feuilles/années
      availableYears: availableYears,
      sheets: sheets,
      yearData: yearData,
      totalRows: totalRows
    });

  } catch (error) {
    console.error("❌ Erreur traitement:", error.message);
    
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    return res.status(422).json({
      success: false,
      error: error.message || "Impossible de traiter le fichier Excel",
      details: error.message,
    });
  }
};

module.exports = { handleUpload };