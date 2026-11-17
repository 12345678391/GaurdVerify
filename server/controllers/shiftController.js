const mongoose = require('mongoose');
const Shift = require('../models/Shift');
const Guard = require('../models/Guard');
const ShiftAssignment = require('../models/ShiftAssignment');
const { logAudit } = require('../middleware/audit');

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
exports.getShifts = async (req, res) => {
  try {
    const shiftQuery = {
      isDeleted: false,
    };
    if (req.companyId) {
      shiftQuery.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      shiftQuery.companyId = req.query.companyId;
    }

    const shifts = await Shift.find(shiftQuery).sort({ startTime: 1 });

    const shiftsWithCounts = await Promise.all(
      shifts.map(async (shift) => {
        const guardQuery = {
          assignedShift: shift._id,
          employmentStatus: 'Active',
          isDeleted: false,
        };
        if (req.companyId) {
          guardQuery.companyId = req.companyId;
        }
        const guardCount = await Guard.countDocuments(guardQuery);
        const obj = shift.toObject();
        obj.guardCount = guardCount;
        return obj;
      })
    );

    res.status(200).json({ success: true, data: shiftsWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Shift
// @route   POST /api/shifts
// @access  Private
exports.createShift = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Platform administrators cannot create company shifts directly. Please operate within a registered company account.',
      });
    }

    const {
      shiftName,
      name,
      startTime,
      endTime,
      isOvernight,
      verificationIntervalMinutes,
      workingDays,
      description,
    } = req.body;

    const resolvedShiftName = (shiftName || name || '').trim();

    if (!resolvedShiftName || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Shift Name, Start Time, and End Time are required.',
      });
    }

    const count = await Shift.countDocuments({ companyId: req.companyId });
    const shiftId = `GC-SHF-${String(count + 1).padStart(2, '0')}`;

    // Auto-detect overnight shift if endTime < startTime
    const autoOvernight = isOvernight !== undefined ? isOvernight : endTime < startTime;

    const shift = await Shift.create({
      companyId: req.companyId,
      shiftId,
      shiftName: resolvedShiftName,
      startTime,
      endTime,
      isOvernight: autoOvernight,
      verificationIntervalMinutes: verificationIntervalMinutes || 30,
      workingDays: workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      description,
    });

    await logAudit(req, 'SHIFT_CREATE', 'Shift', shift._id, `Created shift ${shift.shiftName} (${startTime} - ${endTime})`);
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Shift
// @route   PUT /api/shifts/:id
// @access  Private
exports.updateShift = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      isDeleted: false,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { shiftId: req.params.id }] }
        : { shiftId: req.params.id }),
    };

    // Strip immutable / tenant identifiers to prevent payload tampering
    delete req.body.companyId;
    delete req.body._id;
    delete req.body.shiftId;

    if (req.body.name && !req.body.shiftName) {
      req.body.shiftName = req.body.name;
    }

    // Auto-detect overnight shift if endTime and startTime are updated
    if (req.body.isOvernight === undefined && req.body.startTime && req.body.endTime) {
      req.body.isOvernight = req.body.endTime < req.body.startTime;
    }

    if (req.body.status) {
      req.body.isActive = req.body.status === 'Active';
    }

    const shift = await Shift.findOneAndUpdate(
      lookupQuery,
      req.body,
      { new: true, runValidators: true }
    );

    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });

    // Include updated guard count
    const guardCount = await Guard.countDocuments({
      assignedShift: shift._id,
      employmentStatus: 'Active',
      isDeleted: false,
      companyId: req.companyId,
    });
    const shiftObj = shift.toObject();
    shiftObj.guardCount = guardCount;

    await logAudit(req, 'SHIFT_UPDATE', 'Shift', shift._id, `Updated shift ${shift.shiftName}`);
    res.status(200).json({ success: true, data: shiftObj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Shift
// @route   DELETE /api/shifts/:id
// @access  Private
exports.deleteShift = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { shiftId: req.params.id }] }
        : { shiftId: req.params.id }),
    };

    const shift = await Shift.findOne(lookupQuery);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found.' });

    shift.isDeleted = true;
    shift.isActive = false;
    await shift.save();

    // Safely handle active guard assignments without breaking historical attendance/calls
    const affectedGuards = await Guard.countDocuments({
      assignedShift: shift._id,
      companyId: req.companyId,
      isDeleted: false,
    });
    if (affectedGuards > 0) {
      await Guard.updateMany(
        { assignedShift: shift._id, companyId: req.companyId, isDeleted: false },
        { $set: { assignedShift: null } }
      );
    }

    await logAudit(
      req,
      'SHIFT_DEACTIVATE',
      'Shift',
      shift._id,
      `Deactivated shift ${shift.shiftName} (${affectedGuards} guards unassigned)`
    );

    res.status(200).json({
      success: true,
      message: 'Shift deactivated successfully.',
      affectedGuards,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
