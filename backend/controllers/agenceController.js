const { AgenceModel } = require("../models");

// ─── GET /api/agences ─────────────────────────────────────────
// Récupère toutes les agences (avec filtre actif/inactif)
const getAllAgences = async (req, res) => {
  try {
    const { active } = req.query;
    const agences = await AgenceModel.findAll(
      active !== undefined ? active === "true" : undefined
    );
    res.status(200).json({
      success: true,
      count: agences.length,
      data: agences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des agences",
    });
  }
};

// ─── GET /api/agences/:id ─────────────────────────────────────
// Récupère une agence par ID
// controllers/agenceController.js
const getAgenceById = async (req, res) => {
  console.log('🔍 ===== getAgenceById appelé ====');
  console.log('🔍 req.params:', req.params);
  console.log('🔍 ID reçu:', req.params.id);
  
  try {
    const id = parseInt(req.params.id);
    console.log('🔍 ID parsé:', id);
    
    if (isNaN(id)) {
      console.log('❌ ID invalide');
      return res.status(400).json({
        success: false,
        message: "ID invalide",
      });
    }

    console.log('🔍 Appel de AgenceModel.findById avec ID:', id);
    const agence = await AgenceModel.findById(id);
    console.log('🔍 Résultat:', agence);
    
    if (!agence) {
      console.log('❌ Agence non trouvée');
      return res.status(404).json({
        success: false,
        message: "Agence non trouvée",
      });
    }

    console.log('✅ Agence trouvée');
    res.status(200).json({
      success: true,
      data: agence,
    });
  } catch (error) {
    console.error('❌ ERREUR:', error);
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération de l'agence",
    });
  }
};

// ─── POST /api/agences ────────────────────────────────────────
// Crée une nouvelle agence
const createAgence = async (req, res) => {
  try {
    const { nom, code } = req.body;
    
    // ✅ Le code est optionnel, si non fourni on utilise le nom
    if (!nom) {
      return res.status(400).json({
        success: false,
        message: "Le nom de l'agence est obligatoire",
      });
    }

    // Vérifier si l'agence existe déjà
    const existing = await AgenceModel.findByNom(nom);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Une agence avec ce nom existe déjà",
      });
    }

    // ✅ Créer avec le code (ou le nom comme code)
    const agence = await AgenceModel.findOrCreate(nom, code || nom);
    
    res.status(201).json({
      success: true,
      message: "Agence créée avec succès",
      data: agence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la création",
    });
  }
};

// ─── PUT /api/agences/:id ─────────────────────────────────────
// Met à jour une agence
const updateAgence = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide",
      });
    }

    const { nom, code, active } = req.body;

    // Vérifier si l'agence existe
    const agence = await AgenceModel.findById(id);
    if (!agence) {
      return res.status(404).json({
        success: false,
        message: "Agence non trouvée",
      });
    }

    // Vérifier les doublons (sauf pour l'agence elle-même)
    if (nom && nom !== agence.nom) {
      const existing = await AgenceModel.findByNom(nom);
      if (existing && existing.id !== id) {
        return res.status(400).json({
          success: false,
          message: "Une autre agence utilise déjà ce nom",
        });
      }
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (nom !== undefined) updateData.nom = nom;
    if (code !== undefined) updateData.code = code || nom || agence.nom;
    if (active !== undefined) updateData.active = active;

    const updated = await AgenceModel.update(id, updateData);
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Erreur lors de la mise à jour",
      });
    }

    const updatedAgence = await AgenceModel.findById(id);

    res.status(200).json({
      success: true,
      message: "Agence mise à jour avec succès",
      data: updatedAgence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la mise à jour",
    });
  }
};

// ─── DELETE /api/agences/:id ──────────────────────────────────
// Désactive une agence (soft delete)
const deleteAgence = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide",
      });
    }

    const agence = await AgenceModel.findById(id);
    if (!agence) {
      return res.status(404).json({
        success: false,
        message: "Agence non trouvée",
      });
    }

    // Si déjà inactif, on ne fait rien
    if (!agence.active) {
      return res.status(400).json({
        success: false,
        message: "Cette agence est déjà désactivée",
      });
    }

    const deleted = await AgenceModel.softDelete(id);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Erreur lors de la désactivation",
      });
    }

    res.status(200).json({
      success: true,
      message: "Agence désactivée avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la désactivation",
    });
  }
};

// ─── DELETE /api/agences/:id/permanent ────────────────────────
// Supprime définitivement une agence
const deleteAgencePermanent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "ID invalide",
      });
    }

    const agence = await AgenceModel.findById(id);
    if (!agence) {
      return res.status(404).json({
        success: false,
        message: "Agence non trouvée",
      });
    }

    const deleted = await AgenceModel.deletePermanent(id);
    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: "Erreur lors de la suppression définitive",
      });
    }

    res.status(200).json({
      success: true,
      message: "Agence supprimée définitivement",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la suppression définitive",
    });
  }
};

// ─── GET /api/agences/stats ───────────────────────────────────
// Statistiques des agences
const getStats = async (req, res) => {
  try {
    const total = await AgenceModel.count();
    const active = await AgenceModel.count(true);
    const inactive = await AgenceModel.count(false);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des statistiques",
    });
  }
};

module.exports = {
  getAllAgences,
  getAgenceById,
  createAgence,
  updateAgence,
  deleteAgence,
  deleteAgencePermanent,
  getStats,
};