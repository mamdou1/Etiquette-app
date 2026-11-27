const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const {
  getAllAgences,
  getAgenceById,
  createAgence,
  updateAgence,
  deleteAgence,
  deleteAgencePermanent,
  getStats,
  getHierarchy,
  createBoite,
  getBoitesByAgence,
  getBoitesByType,
  deleteBoite,
  getAgenceStats,
} = require('../controllers/agenceController');

// Routes CRUD
router.get('/', auth, getAllAgences);
router.get('/stats', auth, getStats);
router.get('/:id/hierarchy', auth, getHierarchy);
router.get('/:id', auth, getAgenceById);
router.post('/', auth, createAgence);
router.put('/:id', auth, updateAgence);
router.delete('/:id', auth, deleteAgence);
router.delete('/:id/permanent', auth, deleteAgencePermanent);

// ✅ Routes pour les boîtes (ajout manuel)
router.post('/boites', auth, createBoite);
router.get('/:id/boites', auth, getBoitesByAgence);
router.get('/:id/types/:typeId/boites', auth, getBoitesByType);
router.delete('/:id/types/:typeId/boites/:numero', auth, deleteBoite);
router.get('/:id/stats', auth, getAgenceStats);

module.exports = router;