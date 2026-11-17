const express = require('express');
const router = express.Router();
const { getSites, createSite, updateSite, deleteSite } = require('../controllers/siteController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSites)
  .post(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), createSite);

router.route('/:id')
  .put(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), updateSite)
  .delete(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), deleteSite);

module.exports = router;
