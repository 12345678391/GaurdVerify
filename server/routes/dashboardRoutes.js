const express = require('express');
const router = express.Router();
const { getOverview, getAnalytics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/overview', getOverview);
router.get('/analytics', getAnalytics);

module.exports = router;
