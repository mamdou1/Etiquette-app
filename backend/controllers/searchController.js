const { pool } = require("../config/database");  // ✅ AJOUTER CETTE LIGNE
const { MetaFieldValueModel } = require('../models');

// ─── GET /api/search ──────────────────────────────────────────
const search = async (req, res) => {
  try {
    const { 
      agence, 
      type, 
      annee, 
      numero_boite, 
      valeur,
      agence_id,
      type_document_id
    } = req.query;

    const filters = {
      agence: agence || undefined,
      type: type || undefined,
      annee: annee || undefined,
      numero_boite: numero_boite || undefined,
      valeur: valeur || undefined,
      agence_id: agence_id ? parseInt(agence_id) : undefined,
      type_document_id: type_document_id ? parseInt(type_document_id) : undefined,
    };

    const results = await MetaFieldValueModel.searchHierarchy(filters);
    const total = await MetaFieldValueModel.countSearchResults(filters);

    res.status(200).json({
      success: true,
      count: total,
      data: results,
      filters: filters,
    });
  } catch (error) {
    console.error('❌ search error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la recherche',
    });
  }
};

// ─── GET /api/search/boite ────────────────────────────────────
const getBoiteDetail = async (req, res) => {
  try {
    const { agence_id, type_document_id, numero_boite } = req.query;

    if (!agence_id || !type_document_id || !numero_boite) {
      return res.status(400).json({
        success: false,
        message: 'agence_id, type_document_id et numero_boite sont requis',
      });
    }

    const detail = await MetaFieldValueModel.getBoiteDetail(
      parseInt(agence_id),
      parseInt(type_document_id),
      numero_boite
    );

    if (!detail) {
      return res.status(404).json({
        success: false,
        message: 'Boîte non trouvée',
      });
    }

    res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error('❌ getBoiteDetail error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des détails',
    });
  }
};

// ─── GET /api/search/filters ──────────────────────────────────
const getFilterOptions = async (req, res) => {
  try {
    const [agences] = await pool.execute(
      'SELECT id, nom FROM agences ORDER BY nom ASC'
    );
    const [types] = await pool.execute(
      'SELECT id, nom FROM type_documents WHERE active = 1 ORDER BY nom ASC'
    );
    const [annees] = await pool.execute(
      'SELECT DISTINCT annee FROM meta_field_values WHERE annee IS NOT NULL AND annee != "" ORDER BY annee DESC'
    );

    res.status(200).json({
      success: true,
      data: {
        agences: agences,
        types: types,
        annees: annees.map(a => a.annee),
      },
    });
  } catch (error) {
    console.error('❌ getFilterOptions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des filtres',
    });
  }
};

module.exports = {
  search,
  getBoiteDetail,
  getFilterOptions,
};