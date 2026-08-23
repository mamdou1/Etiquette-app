const express = require('express');
const router = express.Router();
const { requireAuth: auth } = require('../middleware/authMiddleware');
const {
  getAllAgences,
  getAgenceById,
  createAgence,
  updateAgence,
  deleteAgence,
  deleteAgencePermanent,
  getStats,
  getHierarchy,  // ⚠️ Cette fonction doit exister dans agenceController.js
} = require('../controllers/agenceController');

router.get('/', auth, getAllAgences);
router.get('/stats', auth, getStats);
router.get('/:id/hierarchy', auth, getHierarchy);  // ⚠️ LIGNE 15 - L'erreur vient d'ici !
router.get('/:id', auth, getAgenceById);
router.post('/', auth, createAgence);
router.put('/:id', auth, updateAgence);
router.delete('/:id', auth, deleteAgence);
router.delete('/:id/permanent', auth, deleteAgencePermanent);

module.exports = router;