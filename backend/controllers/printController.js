const { MetaFieldValueModel } = require('../models');

// ─── GET /api/print ───────────────────────────────────────────
// Récupérer les données pour l'impression par niveau
const getForPrint = async (req, res) => {
  try {
    const { agence_id, type_document_id, annee } = req.query;
    
    const data = await MetaFieldValueModel.getForPrint({
      agenceId: agence_id ? parseInt(agence_id) : undefined,
      typeDocumentId: type_document_id ? parseInt(type_document_id) : undefined,
      annee: annee || undefined,
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data: data,
    });
  } catch (error) {
    console.error('❌ getForPrint error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des données",
    });
  }
};

module.exports = {
  getForPrint,
};