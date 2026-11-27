const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const {
  getByType,
  getById,
  create,
  batchCreate,  // ✅ NOUVEAU
  update,
  remove,
  removePermanent,
} = require('../controllers/metaFieldController');

// Routes pour les champs d'un type
router.get('/types-document/:typeId/meta-fields', auth, getByType);
router.post('/types-document/:typeId/meta-fields', auth, create);
router.post('/types-document/:typeId/meta-fields/batch', auth, batchCreate);  // ✅ NOUVEAU

// Routes pour un champ spécifique
router.get('/meta-fields/:id', auth, getById);
router.put('/meta-fields/:id', auth, update);
router.delete('/meta-fields/:id', auth, remove);
router.delete('/meta-fields/:id/permanent', auth, removePermanent);

module.exports = router;