const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const {
  searchArchives,
  getDocumentTypes,
  getAnnees,
  getAllArchives,
  deleteArchive,
  deleteAllArchives,
  getArchivesGrouped,
  getBoiteDetail,
  getForPrint,  // ✅ NOUVEAU
} = require('../controllers/archiveController');

router.get('/search', auth, searchArchives);
router.get('/types', auth, getDocumentTypes);
router.get('/annees', auth, getAnnees);
router.get('/', auth, getAllArchives);
router.get('/grouped', auth, getArchivesGrouped);
router.get('/print', auth, getForPrint);  // ✅ NOUVEAU
router.get('/boite/:numero/detail', auth, getBoiteDetail);
router.delete('/:id', auth, deleteArchive);
router.delete('/all', auth, deleteAllArchives);

module.exports = router;