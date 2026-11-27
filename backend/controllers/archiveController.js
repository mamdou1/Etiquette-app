// controllers/archiveController.js
const { ArchiveModel } = require("../models");
const { pool } = require("../config/database");

const searchArchives = async (req, res) => {
  try {
    const { type_document, annee, agence_nom, numero_boite, date_debut, date_fin } = req.query;

    const results = await ArchiveModel.search({
      type_document,
      annee,
      agence_nom,
      numero_boite,
      date_debut,
      date_fin,
    });

    const total = await ArchiveModel.count({
      type_document,
      annee,
      agence_nom,
    });

    res.status(200).json({
      success: true,
      data: results,
      total,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la recherche",
    });
  }
};

const getDocumentTypes = async (req, res) => {
  try {
    const types = await ArchiveModel.getDocumentTypes();
    res.status(200).json({
      success: true,
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des types",
    });
  }
};

const getAnnees = async (req, res) => {
  try {
    const annees = await ArchiveModel.getAnnees();
    res.status(200).json({
      success: true,
      data: annees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des années",
    });
  }
};

const getAllArchives = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset) : undefined;

    const archives = await ArchiveModel.findAll(limit, offset);
    const total = await ArchiveModel.count();

    res.status(200).json({
      success: true,
      data: archives,
      total,
      count: archives.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des archives",
    });
  }
};

const deleteArchive = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide",
      });
    }

    const deleted = await ArchiveModel.deleteById(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Archive non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      message: "Archive supprimée avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la suppression",
    });
  }
};

const deleteAllArchives = async (req, res) => {
  try {
    await ArchiveModel.deleteAll();
    res.status(200).json({
      success: true,
      message: "Toutes les archives ont été supprimées",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la suppression",
    });
  }
};

// ─── GET /api/archives/grouped ──────────────────────────────
const getArchivesGrouped = async (req, res) => {
  try {
    const { type_document, annee, agence_nom, numero_boite, date_debut, date_fin } = req.query;
    
    let query = `
      SELECT 
        numero_boite,
        MIN(agence_id) as agence_id,
        GROUP_CONCAT(DISTINCT agence_nom SEPARATOR ', ') as agence_nom,
        GROUP_CONCAT(DISTINCT type_document SEPARATOR ', ') as types_documents,
        GROUP_CONCAT(DISTINCT caissiers SEPARATOR ', ') as caissiers,
        GROUP_CONCAT(DISTINCT annee SEPARATOR ', ') as annees,
        GROUP_CONCAT(DISTINCT observation SEPARATOR ' | ') as observations,
        COUNT(*) as total_documents,
        MIN(date_production) as date_debut,
        MAX(date_production) as date_fin,
        GROUP_CONCAT(id) as archive_ids
      FROM archives
      WHERE 1=1
    `;
    
    const values = [];
    
    if (type_document) {
      query += " AND type_document LIKE ?";
      values.push(`%${type_document}%`);
    }
    if (annee) {
      query += " AND annee = ?";
      values.push(annee);
    }
    if (agence_nom) {
      query += " AND agence_nom LIKE ?";
      values.push(`%${agence_nom}%`);
    }
    if (numero_boite) {
      query += " AND numero_boite LIKE ?";
      values.push(`%${numero_boite}%`);
    }
    if (date_debut) {
      query += " AND STR_TO_DATE(date_production, '%d/%m/%Y') >= ?";
      values.push(date_debut);
    }
    if (date_fin) {
      query += " AND STR_TO_DATE(date_production, '%d/%m/%Y') <= ?";
      values.push(date_fin);
    }
    
    query += `
      GROUP BY numero_boite
      ORDER BY numero_boite ASC
    `;
    
    const [rows] = await pool.execute(query, values);
    
    const groupedData = rows.map(row => ({
      ...row,
      archive_ids: row.archive_ids ? row.archive_ids.split(',').map(Number) : [],
      types_documents_list: row.types_documents ? row.types_documents.split(', ').filter(Boolean) : [],
      caissiers_list: row.caissiers ? row.caissiers.split(', ').filter(Boolean) : [],
      annees_list: row.annees ? row.annees.split(', ').filter(Boolean) : [],
      observations_list: row.observations ? row.observations.split(' | ').filter(Boolean) : [],
    }));
    
    res.status(200).json({
      success: true,
      count: groupedData.length,
      data: groupedData,
    });
  } catch (error) {
    console.error('❌ Erreur getArchivesGrouped:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors du regroupement des archives",
    });
  }
};

// ─── GET /api/archives/boite/:numero/detail ──────────────────
const getBoiteDetail = async (req, res) => {
  try {
    const { numero } = req.params;
    
    const [archives] = await pool.execute(
      `SELECT 
        a.*,
        ag.nom as agence_nom,
        ag.code as agence_code
      FROM archives a
      LEFT JOIN agences ag ON a.agence_id = ag.id
      WHERE a.numero_boite = ?
      ORDER BY a.date_production DESC`,
      [numero]
    );
    
    if (archives.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune archive trouvée pour cette boîte",
      });
    }
    
    const detail = {
      numero_boite: numero,
      agence: {
        id: archives[0].agence_id,
        nom: archives[0].agence_nom,
        code: archives[0].agence_code,
      },
      statistiques: {
        total_documents: archives.length,
        types_documents: [...new Set(archives.map(a => a.type_document).filter(Boolean))],
        caissiers: [...new Set(archives.map(a => a.caissiers).filter(Boolean))],
        annees: [...new Set(archives.map(a => a.annee).filter(Boolean))],
        periodes: {
          debut: archives[archives.length - 1]?.date_production || null,
          fin: archives[0]?.date_production || null,
        }
      },
      documents: archives.map(a => ({
        id: a.id,
        date_production: a.date_production,
        type_document: a.type_document,
        caissiers: a.caissiers,
        annee: a.annee,
        observation: a.observation,
        source: a.source,
        created_at: a.created_at,
      })),
      observations: archives.map(a => a.observation).filter(Boolean),
    };
    
    res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error('❌ Erreur getBoiteDetail:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des détails",
    });
  }
};

// ─── ✅ NOUVEAU : GET /api/archives/print ─────────────────────
// Récupérer les archives pour l'impression (par agence, type, annee)
const getForPrint = async (req, res) => {
  try {
    const { agence_id, type_document_id, annee } = req.query;
    
    const archives = await ArchiveModel.getForPrint({
      agenceId: agence_id ? parseInt(agence_id) : undefined,
      typeDocumentId: type_document_id ? parseInt(type_document_id) : undefined,
      annee: annee || undefined,
    });

    res.status(200).json({
      success: true,
      count: archives.length,
      data: archives,
    });
  } catch (error) {
    console.error('❌ getForPrint error:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des archives pour l'impression",
    });
  }
};

module.exports = {
  searchArchives,
  getDocumentTypes,
  getAnnees,
  getAllArchives,
  deleteArchive,
  deleteAllArchives,
  getArchivesGrouped,
  getBoiteDetail,
  getForPrint,  // ✅ NOUVEAU
};