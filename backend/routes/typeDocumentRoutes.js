const express = require('express');
const router = express.Router();
const { requireAuth: auth } = require('../middleware/authMiddleware');
const {
  getAll,
  getById,
  create,
  assignToAgences,
  update,
  remove,
  removePermanent,
} = require('../controllers/typeDocumentController');

// Routes protégées par authentification
router.get('/', auth, getAll);
router.get('/:id', auth, getById);
router.post('/', auth, create);
router.post('/:id/assign', auth, assignToAgences);  // ✅ Route d'assignation
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);
router.delete('/:id/permanent', auth, removePermanent);

module.exports = router;