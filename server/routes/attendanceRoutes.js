const express = require('express');
const router = express.Router();
const { getAttendance, getReports } = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getAttendance);
router.get('/reports', getReports);

module.exports = router;
