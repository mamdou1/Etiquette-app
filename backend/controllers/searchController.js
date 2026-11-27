const { pool } = require("../config/database");
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
      type_document_id,
      rayon,           // ✅ NOUVEAU
      travers,         // ✅ NOUVEAU
      date_debut,      // ✅ NOUVEAU - Date de début (format YYYY-MM-DD)
      date_fin,        // ✅ NOUVEAU - Date de fin (format YYYY-MM-DD)
    } = req.query;

    const filters = {
      agence: agence || undefined,
      type: type || undefined,
      annee: annee || undefined,
      numero_boite: numero_boite || undefined,
      valeur: valeur || undefined,
      agence_id: agence_id ? parseInt(agence_id) : undefined,
      type_document_id: type_document_id ? parseInt(type_document_id) : undefined,
      rayon: rayon || undefined,             // ✅ NOUVEAU
      travers: travers || undefined,         // ✅ NOUVEAU
      date_debut: date_debut || undefined,   // ✅ NOUVEAU
      date_fin: date_fin || undefined,       // ✅ NOUVEAU
    };

    // ✅ Validation du format des dates
    if (date_debut && !/^\d{4}-\d{2}-\d{2}$/.test(date_debut)) {
      return res.status(400).json({
        success: false,
        message: 'date_debut doit être au format YYYY-MM-DD',
      });
    }
    if (date_fin && !/^\d{4}-\d{2}-\d{2}$/.test(date_fin)) {
      return res.status(400).json({
        success: false,
        message: 'date_fin doit être au format YYYY-MM-DD',
      });
    }
    if (date_debut && date_fin && date_debut > date_fin) {
      return res.status(400).json({
        success: false,
        message: 'date_debut doit être antérieure à date_fin',
      });
    }

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

    // ✅ NOUVEAU - Récupérer les valeurs distinctes de Rayon
    const [rayons] = await pool.execute(
      `SELECT DISTINCT mfv.value AS rayon
       FROM meta_field_values mfv
       INNER JOIN meta_fields mf ON mf.id = mfv.meta_field_id
       WHERE (LOWER(mf.name) LIKE '%rayon%' OR LOWER(mf.label) LIKE '%rayon%')
         AND mfv.value IS NOT NULL AND mfv.value != ''
       ORDER BY mfv.value ASC`
    );

    // ✅ NOUVEAU - Récupérer les valeurs distinctes de Travers
    const [travers] = await pool.execute(
      `SELECT DISTINCT mfv.value AS travers
       FROM meta_field_values mfv
       INNER JOIN meta_fields mf ON mf.id = mfv.meta_field_id
       WHERE (LOWER(mf.name) LIKE '%travers%' OR LOWER(mf.label) LIKE '%travers%')
         AND mfv.value IS NOT NULL AND mfv.value != ''
       ORDER BY mfv.value ASC`
    );

    res.status(200).json({
      success: true,
      data: {
        agences: agences,
        types: types,
        annees: annees.map(a => a.annee),
        rayons: rayons.map(r => r.rayon),       // ✅ NOUVEAU
        travers: travers.map(t => t.travers),   // ✅ NOUVEAU
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