const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const {
  search,
  getBoiteDetail,
  getFilterOptions,
} = require('../controllers/searchController');
const { getForPrint } = require('../controllers/printController');


router.get('/', auth, search);
router.get('/boite', auth, getBoiteDetail);
router.get('/filters', auth, getFilterOptions);
router.get('/print', auth, getForPrint);

module.exports = router;