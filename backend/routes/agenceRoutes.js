const express = require("express");
const {
  getAllAgences,
  getAgenceById,
  createAgence,
  updateAgence,
  deleteAgence,
  deleteAgencePermanent,
  getStats,
} = require("../controllers/agenceController");

const router = express.Router();

// GET /api/agences/stats - Statistiques
router.get("/stats", getStats);

// GET /api/agences - Récupérer toutes les agences
router.get("/", getAllAgences);

// GET /api/agences/:id - Récupérer une agence par ID
router.get("/:id", getAgenceById);

// POST /api/agences - Créer une agence
router.post("/", createAgence);

// PUT /api/agences/:id - Mettre à jour une agence
router.put("/:id", updateAgence);

// DELETE /api/agences/:id - Désactiver une agence (soft delete)
router.delete("/:id", deleteAgence);

// DELETE /api/agences/:id/permanent - Supprimer définitivement
router.delete("/:id/permanent", deleteAgencePermanent);

module.exports = router;