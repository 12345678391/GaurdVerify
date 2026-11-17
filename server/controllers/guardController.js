const mongoose = require('mongoose');
const Guard = require('../models/Guard');
const Shift = require('../models/Shift');
const Site = require('../models/Site');
const Supervisor = require('../models/Supervisor');
const ShiftAssignment = require('../models/ShiftAssignment');
const AttendanceRecord = require('../models/AttendanceRecord');
const CallLog = require('../models/CallLog');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/audit');

// Helper to validate foreign-key relationships belong to the authenticated company
const validateGuardRelationships = async (companyId, { assignedSite, assignedShift, assignedSupervisor }) => {
  if (assignedSite) {
    if (!mongoose.Types.ObjectId.isValid(assignedSite)) {
      return { valid: false, message: 'Invalid site selection.' };
    }
    const site = await Site.findOne({
      _id: assignedSite,
      companyId,
      isDeleted: false,
    });
    if (!site) {
      return { valid: false, message: 'Invalid site selection.' };
    }
  }

  if (assignedShift) {
    if (!mongoose.Types.ObjectId.isValid(assignedShift)) {
      return { valid: false, message: 'Invalid shift selection.' };
    }
    const shift = await Shift.findOne({
      _id: assignedShift,
      companyId,
      isDeleted: false,
    });
    if (!shift) {
      return { valid: false, message: 'Invalid shift selection.' };
    }
  }

  if (assignedSupervisor) {
    if (!mongoose.Types.ObjectId.isValid(assignedSupervisor)) {
      return { valid: false, message: 'Invalid supervisor selection.' };
    }
    const supervisor = await Supervisor.findOne({
      _id: assignedSupervisor,
      companyId,
      isDeleted: false,
    });
    if (!supervisor) {
      return { valid: false, message: 'Invalid supervisor selection.' };
    }
  }

  return { valid: true };
};

// Helper to generate next unique guard ID: GC-GRD-1001 onwards
const generateNextGuardId = async (companyId) => {
  const count = await Guard.countDocuments({ companyId });
  const nextNum = 1001 + count;
  return `GC-GRD-${nextNum}`;
};

// @desc    Get all guards with filters, pagination, search
// @route   GET /api/guards
// @access  Private
exports.getGuards = async (req, res) => {
  try {
    const {
      search,
      site,
      shift,
      supervisor,
      employmentStatus,
      attendanceStatus,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (req.query.includeArchived === 'true' || employmentStatus === 'Archived' || employmentStatus === 'Inactive') {
      // Allow fetching archived/soft-deleted guards
    } else {
      query.isDeleted = false;
    }

    if (req.companyId) {
      query.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    if (site) query.assignedSite = site;
    if (shift) query.assignedShift = shift;
    if (supervisor) query.assignedSupervisor = supervisor;
    if (employmentStatus) query.employmentStatus = employmentStatus;
    if (attendanceStatus) query.attendanceStatus = attendanceStatus;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { guardId: searchRegex },
        { mobileNumber: searchRegex },
        { employeeId: searchRegex },
        { city: searchRegex },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const total = await Guard.countDocuments(query);
    const guards = await Guard.find(query)
      .populate('assignedSite', 'siteName siteId city')
      .populate('assignedShift', 'shiftName startTime endTime isOvernight')
      .populate('assignedSupervisor', 'fullName supervisorId mobileNumber')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: guards,
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

// @desc    Get single guard by ID
// @route   GET /api/guards/:id
// @access  Private
exports.getGuardById = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const guardQuery = {
      isDeleted: false,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { guardId: req.params.id }] }
        : { guardId: req.params.id }),
    };
    if (req.companyId) {
      guardQuery.companyId = req.companyId;
    }

    const guard = await Guard.findOne(guardQuery)
      .populate('assignedSite')
      .populate('assignedShift')
      .populate('assignedSupervisor');

    if (!guard) {
      return res.status(404).json({ success: false, message: 'Guard not found.' });
    }

    res.status(200).json({ success: true, data: guard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create/Register New Guard
// @route   POST /api/guards
// @access  Private
exports.createGuard = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Platform administrators cannot directly register guards. Please operate within a registered company account.',
      });
    }

    const {
      fullName,
      name,
      fatherName,
      dateOfBirth,
      gender,
      mobileNumber,
      phone,
      email,
      alternateMobileNumber,
      emergencyContactNumber,
      emergencyContact,
      residentialAddress,
      address,
      city,
      state,
      pinCode,
      profilePhotoUrl,
      employeeId,
      dateOfJoining,
      joiningDate,
      designation,
      assignedSite,
      assignedSupervisor,
      assignedShift,
      employmentStatus,
      policeVerificationStatus,
      trainingStatus,
      identityDocType,
      identityDocNumber,
    } = req.body;

    const resolvedFullName = (fullName || name || '').trim();
    const resolvedMobileNumber = (mobileNumber || phone || '').trim();

    if (!resolvedFullName || !resolvedMobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Full Name and Mobile Number are required fields.',
      });
    }

    // Validate relationships belong to the authenticated company
    const relCheck = await validateGuardRelationships(req.companyId, {
      assignedSite,
      assignedShift,
      assignedSupervisor,
    });
    if (!relCheck.valid) {
      return res.status(400).json({
        success: false,
        message: relCheck.message,
      });
    }

    // Auto-generate unique guard ID
    const guardId = await generateNextGuardId(req.companyId);

    const guard = await Guard.create({
      companyId: req.companyId,
      guardId,
      fullName: resolvedFullName,
      fatherName,
      dateOfBirth,
      gender: gender || 'Male',
      email: email ? email.trim() : '',
      mobileNumber: resolvedMobileNumber,
      alternateMobileNumber,
      emergencyContactNumber: emergencyContactNumber || emergencyContact,
      residentialAddress: residentialAddress || address || 'Headquarters Post',
      city: city || 'Gurugram',
      state: state || 'Haryana',
      pinCode: pinCode || '122002',
      profilePhotoUrl,
      employeeId: employeeId || guardId,
      dateOfJoining: dateOfJoining || joiningDate || new Date(),
      designation: designation || 'Security Guard',
      assignedSite: assignedSite || null,
      assignedSupervisor: assignedSupervisor || null,
      assignedShift: assignedShift || null,
      employmentStatus: employmentStatus || 'Active',
      policeVerificationStatus: policeVerificationStatus || 'Pending',
      trainingStatus: trainingStatus || 'Completed',
      identityDocType: identityDocType || 'Aadhaar Card',
      identityDocNumber,
    });

    // Create initial shift assignment record if assigned
    if (assignedShift && assignedSite) {
      await ShiftAssignment.create({
        companyId: req.companyId,
        guardId: guard._id,
        shiftId: assignedShift,
        siteId: assignedSite,
        supervisorId: assignedSupervisor || null,
        startDate: new Date(),
        status: 'Active',
        assignedBy: req.admin?._id,
      });
    }

    // Notification
    await Notification.create({
      companyId: req.companyId,
      recipientType: 'Admin',
      title: 'New Guard Registered',
      message: `Guard ${guard.fullName} (${guard.guardId}) has been registered and added to roster.`,
      type: 'GUARD_REGISTERED',
      severity: 'info',
      guardId: guard._id,
      siteId: assignedSite || null,
    });

    await logAudit(
      req,
      'GUARD_CREATE',
      'Guard',
      guard._id,
      `Registered guard ${guard.fullName} with ID ${guard.guardId}`
    );

    const populatedGuard = await Guard.findById(guard._id)
      .populate('assignedSite')
      .populate('assignedShift')
      .populate('assignedSupervisor');

    res.status(201).json({
      success: true,
      message: 'Guard registered successfully in database.',
      data: populatedGuard,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Guard
// @route   PUT /api/guards/:id
// @access  Private
exports.updateGuard = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      isDeleted: false,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { guardId: req.params.id }] }
        : { guardId: req.params.id }),
    };

    let guard = await Guard.findOne(lookupQuery);

    if (!guard) {
      return res.status(404).json({ success: false, message: 'Guard not found.' });
    }

    // Validate relationships if any are being updated
    const relCheck = await validateGuardRelationships(req.companyId, {
      assignedSite: req.body.assignedSite,
      assignedShift: req.body.assignedShift,
      assignedSupervisor: req.body.assignedSupervisor,
    });
    if (!relCheck.valid) {
      return res.status(400).json({
        success: false,
        message: relCheck.message,
      });
    }

    // Strip immutable / tenant-specific identifiers
    delete req.body.companyId;
    delete req.body._id;
    delete req.body.guardId;

    // Field normalization for flexible frontend mapping
    if (req.body.name && !req.body.fullName) req.body.fullName = req.body.name;
    if (req.body.phone && !req.body.mobileNumber) req.body.mobileNumber = req.body.phone;
    if (req.body.address && !req.body.residentialAddress) req.body.residentialAddress = req.body.address;
    if (req.body.emergencyContact && !req.body.emergencyContactNumber) req.body.emergencyContactNumber = req.body.emergencyContact;
    if (req.body.avatar && !req.body.profilePhotoUrl) req.body.profilePhotoUrl = req.body.avatar;
    if (req.body.joiningDate && !req.body.dateOfJoining) req.body.dateOfJoining = req.body.joiningDate;

    const previousShift = guard.assignedShift?.toString();
    const newShift = req.body.assignedShift?.toString();

    // Check if shift assignment changed
    if (newShift && previousShift !== newShift) {
      await ShiftAssignment.updateMany(
        { guardId: guard._id, status: 'Active' },
        { status: 'Completed', endDate: new Date() }
      );

      await ShiftAssignment.create({
        companyId: req.companyId,
        guardId: guard._id,
        shiftId: newShift,
        siteId: (req.body.assignedSite !== undefined ? req.body.assignedSite : guard.assignedSite) || null,
        supervisorId: (req.body.assignedSupervisor !== undefined ? req.body.assignedSupervisor : guard.assignedSupervisor) || null,
        startDate: new Date(),
        status: 'Active',
        assignedBy: req.admin?._id,
      });

      await Notification.create({
        companyId: req.companyId,
        recipientType: 'Admin',
        title: 'Shift Assignment Changed',
        message: `Shift re-assigned for Guard ${guard.fullName} (${guard.guardId}).`,
        type: 'SHIFT_ASSIGNMENT_CHANGED',
        severity: 'info',
        guardId: guard._id,
      });
    }

    guard = await Guard.findOneAndUpdate(
      { _id: guard._id, companyId: req.companyId, isDeleted: false },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('assignedSite')
      .populate('assignedShift')
      .populate('assignedSupervisor');

    await logAudit(
      req,
      'GUARD_UPDATE',
      'Guard',
      guard._id,
      `Updated profile for guard ${guard.fullName}`
    );

    res.status(200).json({
      success: true,
      message: 'Guard details updated successfully.',
      data: guard,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Deactivate Guard (Soft delete)
// @route   DELETE /api/guards/:id
// @access  Private
exports.deleteGuard = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { guardId: req.params.id }] }
        : { guardId: req.params.id }),
    };

    const guard = await Guard.findOne(lookupQuery);

    if (!guard) {
      return res.status(404).json({ success: false, message: 'Guard not found.' });
    }

    guard.isDeleted = true;
    guard.employmentStatus = 'Inactive';
    guard.currentDutyStatus = 'Off Duty';
    await guard.save();

    await ShiftAssignment.updateMany(
      { guardId: guard._id, status: 'Active' },
      { status: 'Cancelled', endDate: new Date() }
    );

    await logAudit(
      req,
      'GUARD_DEACTIVATE',
      'Guard',
      guard._id,
      `Deactivated guard ${guard.fullName} (${guard.guardId})`
    );

    res.status(200).json({
      success: true,
      message: 'Guard deactivated successfully while preserving historical data.',
      data: guard,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Guard Attendance History
// @route   GET /api/guards/:id/attendance
// @access  Private
exports.getGuardAttendance = async (req, res) => {
  try {
    const records = await AttendanceRecord.find({
      guardId: req.params.id,
      companyId: req.companyId,
    })
      .populate('shiftId', 'shiftName startTime endTime')
      .populate('siteId', 'siteName')
      .sort({ date: -1 })
      .limit(30);

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Guard Call Logs
// @route   GET /api/guards/:id/call-logs
// @access  Private
exports.getGuardCallLogs = async (req, res) => {
  try {
    const logs = await CallLog.find({
      guardId: req.params.id,
      companyId: req.companyId,
    })
      .populate('siteId', 'siteName')
      .populate('shiftId', 'shiftName')
      .sort({ initiationTime: -1 })
      .limit(50);

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Guard Shift History
// @route   GET /api/guards/:id/shifts
// @access  Private
exports.getGuardShifts = async (req, res) => {
  try {
    const shifts = await ShiftAssignment.find({
      guardId: req.params.id,
      companyId: req.companyId,
    })
      .populate('shiftId')
      .populate('siteId')
      .populate('supervisorId')
      .sort({ startDate: -1 });

    res.status(200).json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
