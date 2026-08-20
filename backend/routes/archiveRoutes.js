// routes/archiveRoutes.js
const express = require("express");
const {
  searchArchives,
  getDocumentTypes,
  getAnnees,
  getAllArchives,
  deleteArchive,
  deleteAllArchives,
  getArchivesGrouped,  // ✅ AJOUTER
  getBoiteDetail,      // ✅ AJOUTER
} = require("../controllers/archiveController");

const router = express.Router();

// ✅ NOUVELLES ROUTES - À METTRE EN PREMIER
router.get("/grouped", getArchivesGrouped);
router.get("/boite/:numero/detail", getBoiteDetail);

// Routes existantes
router.get("/search", searchArchives);
router.get("/types", getDocumentTypes);
router.get("/annees", getAnnees);
router.get("/", getAllArchives);
router.delete("/all", deleteAllArchives);
router.delete("/:id", deleteArchive);

module.exports = router;