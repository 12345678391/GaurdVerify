const express = require('express');
const router = express.Router();
const { getShifts, createShift, updateShift, deleteShift } = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getShifts)
  .post(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), createShift);

router.route('/:id')
  .put(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), updateShift)
  .delete(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), deleteShift);

module.exports = router;
