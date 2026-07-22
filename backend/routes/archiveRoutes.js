const express = require("express");
const {
  searchArchives,
  getDocumentTypes,
  getAnnees,
  getAllArchives,
  deleteArchive,
  deleteAllArchives,
} = require("../controllers/archiveController");

const router = express.Router();

router.get("/search", searchArchives);
router.get("/types", getDocumentTypes);
router.get("/annees", getAnnees);
router.get("/", getAllArchives);
router.delete("/all", deleteAllArchives);
router.delete("/:id", deleteArchive);

module.exports = router;