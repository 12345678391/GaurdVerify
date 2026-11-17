const AttendanceRecord = require('../models/AttendanceRecord');
const Guard = require('../models/Guard');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const CallLog = require('../models/CallLog');

// @desc    Get Attendance Records with Date Filter & Aggregates
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const { date, startDate, endDate, site, shift, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (req.companyId) {
      query.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (site) query.siteId = site;
    if (shift) query.shiftId = shift;
    if (status) query.dutyStatus = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AttendanceRecord.countDocuments(query);
    const records = await AttendanceRecord.find(query)
      .populate('guardId', 'fullName guardId mobileNumber employeeId')
      .populate('siteId', 'siteName siteId city')
      .populate('shiftId', 'shiftName startTime endTime isOvernight')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Detailed Attendance Reports & Summaries for Export
// @route   GET /api/attendance/reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const { reportType = 'daily', startDate, endDate, siteId, shiftId } = req.query;

    const matchQuery = {};
    if (req.companyId) {
      matchQuery.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      matchQuery.companyId = req.query.companyId;
    }

    if (startDate || endDate) {
      matchQuery.date = {};
      if (startDate) matchQuery.date.$gte = startDate;
      if (endDate) matchQuery.date.$lte = endDate;
    }

    if (siteId) matchQuery.siteId = siteId;
    if (shiftId) matchQuery.shiftId = shiftId;

    const records = await AttendanceRecord.find(matchQuery)
      .populate('guardId', 'fullName guardId mobileNumber employeeId designation')
      .populate('siteId', 'siteName siteId city')
      .populate('shiftId', 'shiftName startTime endTime')
      .sort({ date: -1 });

    // Aggregate statistics
    let totalPresent = 0;
    let totalCalls = 0;
    let totalConfirmed = 0;
    let totalMissed = 0;
    let totalAssistance = 0;

    records.forEach((r) => {
      if (r.dutyStatus === 'Present') totalPresent += 1;
      totalCalls += r.totalCallsTriggered || 0;
      totalConfirmed += r.totalConfirmedCalls || 0;
      totalMissed += r.totalMissedCalls || 0;
      totalAssistance += r.totalAssistanceRequests || 0;
    });

    const responseRate = totalCalls > 0 ? ((totalConfirmed / totalCalls) * 100).toFixed(1) : '100';

    res.status(200).json({
      success: true,
      summary: {
        totalRecords: records.length,
        totalPresent,
        totalCalls,
        totalConfirmed,
        totalMissed,
        totalAssistance,
        responseRate: `${responseRate}%`,
      },
      data: records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
