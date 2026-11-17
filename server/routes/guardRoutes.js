const express = require('express');
const router = express.Router();
const {
  getGuards,
  getGuardById,
  createGuard,
  updateGuard,
  deleteGuard,
  getGuardAttendance,
  getGuardCallLogs,
  getGuardShifts,
} = require('../controllers/guardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getGuards)
  .post(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), createGuard);

router.route('/:id')
  .get(getGuardById)
  .put(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), updateGuard)
  .delete(authorize('company_owner', 'company_admin', 'admin', 'supervisor_admin', 'super_admin'), deleteGuard);

router.get('/:id/attendance', getGuardAttendance);
router.get('/:id/call-logs', getGuardCallLogs);
router.get('/:id/shifts', getGuardShifts);

module.exports = router;
