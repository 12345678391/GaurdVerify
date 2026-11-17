const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, updateAdminProfile } = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

router.put('/admin-profile', updateAdminProfile);

module.exports = router;
