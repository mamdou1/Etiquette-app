const { ArchiveModel } = require("../models");

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

module.exports = {
  searchArchives,
  getDocumentTypes,
  getAnnees,
  getAllArchives,
  deleteArchive,
  deleteAllArchives,
};