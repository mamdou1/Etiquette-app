const fs = require("fs");
const path = require("path");
const { parseExcel } = require("../services/excelService");
const { enrichirEtStocker } = require("../services/enrichissementService");
const { now, elapsed } = require("../utils/performance");

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
  const parseStartedAt = now();

  try {
    if (req.perf) req.perf.log('upload-context-validated', elapsed(req.perf.fileReceivedAt || req.perf.startedAt), {
      fileBytes: req.file.size,
    });
    
    // ✅ Lire TOUTES les feuilles
    const { data, fields, availableYears, yearData, totalRows, sheets, ignoredSheets } = parseExcel(filePath, req.perf);
    if (req.perf) req.perf.log('excel-parse-total-controller', elapsed(parseStartedAt), {
      sheets: sheets.length,
      rows: totalRows,
      fields: fields.length,
    });
    
    if (!data || data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(422).json({
        success: false,
        error: "Le fichier Excel est vide ou mal formaté"
      });
    }

    console.log('📊 Classeur traité', { rows: data.length, sheets: sheets.length, availableYears: availableYears.length });

    // ✅ Appel à enrichirEtStocker avec validation intégrée
    const enrichmentStartedAt = now();
    const result = await enrichirEtStocker(data, agence_id, type_document_id, req.perf);
    if (req.perf) req.perf.log('enrichment-and-persistence-total', elapsed(enrichmentStartedAt), {
      rows: result.totalLignes || 0,
      boxes: result.totalBoites || 0,
      labels: result.enriched?.length || 0,
    });

    // ✅ Ajouter les années disponibles au résultat
    result.availableYears = availableYears;
    result.yearData = yearData;
    result.sheets = sheets;
    result.totalRows = totalRows;

    const allFields = [...new Set(result.enriched.flatMap(label => Object.keys(label.metaValues)))];

    fs.unlink(filePath, (err) => {
      if (err) console.warn("⚠️ Nettoyage du fichier temporaire impossible", { errorName: err?.name || 'Error' });
    });

    console.log('✅ Import terminé', { boxes: result.totalBoites || 0, rows: result.totalLignes || 0 });

    const responseStartedAt = now();
    const responseBody = {
      success: true,
      filename: req.file.originalname,
      totalLignes: result.totalLignes || 0,
      totalBoites: result.totalBoites || 0,
      savedCount: result.savedCount || 0,
      metaFieldsCrees: result.metaFieldsCrees || 0,
      metaFields: result.metaFields || [],
      fields: allFields,
      data: result.enriched || [],
      enriched: result.enriched || [],
      boxField: result.boxField,
      agenceTrouvees: result.agenceTrouvees || [],
      typesTrouves: result.typesTrouves || [],
      champsDetectes: Object.keys(data[0] || {}),
      message: result.message || `✅ ${result.totalBoites || 0} boîtes sauvegardées avec succès`,
      // ✅ AJOUT : Informations sur les feuilles/années
      availableYears: availableYears,
      sheets: sheets,
      ignoredSheets: ignoredSheets,
      yearData: yearData,
      totalRows: totalRows
    };
    const responsePreparationMs = elapsed(responseStartedAt);
    if (req.perf) req.perf.log('upload-response-preparation', responsePreparationMs, {
      rows: totalRows,
      boxes: result.totalBoites || 0,
      labels: result.enriched?.length || 0,
      sheets: sheets.length,
      fields: allFields.length,
    });
    const jsonStartedAt = now();
    res.status(200).json(responseBody);
    if (req.perf) req.perf.log('upload-response-json-call', elapsed(jsonStartedAt), {
      statusCode: 200,
      labels: result.enriched?.length || 0,
    });

  } catch (error) {
    console.error("❌ Erreur traitement import", { errorName: error?.name || 'Error' });
    
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    return res.status(422).json({
      success: false,
      error: error.message || "Impossible de traiter le fichier Excel",
      details: error.message,
      code: error.code || undefined,
      validationErrors: Array.isArray(error.validationErrors)
        ? error.validationErrors
        : undefined,
    });
  }
};

module.exports = { handleUpload };
