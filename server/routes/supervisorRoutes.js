const express = require('express');
const router = express.Router();
const {
  getSupervisors,
  createSupervisor,
  updateSupervisor,
  deleteSupervisor,
} = require('../controllers/supervisorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSupervisors)
  .post(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), createSupervisor);

router.route('/:id')
  .put(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), updateSupervisor)
  .delete(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), deleteSupervisor);

module.exports = router;
