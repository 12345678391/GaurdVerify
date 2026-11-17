const mongoose = require('mongoose');
const Supervisor = require('../models/Supervisor');
const Guard = require('../models/Guard');
const Site = require('../models/Site');
const { logAudit } = require('../middleware/audit');

// Helper to validate all assignedSites exist and belong strictly to the authenticated company
const validateAssignedSites = async (companyId, assignedSites) => {
  if (!assignedSites || !Array.isArray(assignedSites) || assignedSites.length === 0) {
    return { valid: true, sanitizedSites: [] };
  }

  for (const siteId of assignedSites) {
    if (!siteId || !mongoose.Types.ObjectId.isValid(siteId)) {
      return { valid: false, message: 'One or more selected sites are invalid.' };
    }
  }

  const foundSites = await Site.find({
    _id: { $in: assignedSites },
    companyId,
    isDeleted: false,
  }).select('_id');

  if (foundSites.length !== assignedSites.length) {
    return { valid: false, message: 'One or more selected sites are invalid.' };
  }

  return { valid: true, sanitizedSites: assignedSites };
};

// @desc    Get all supervisors
// @route   GET /api/supervisors
// @access  Private
exports.getSupervisors = async (req, res) => {
  try {
    const supQuery = {
      isDeleted: false,
    };
    if (req.companyId) {
      supQuery.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      supQuery.companyId = req.query.companyId;
    }

    const supervisors = await Supervisor.find(supQuery)
      .populate('assignedSites', 'siteName siteId city')
      .sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      supervisors.map(async (sup) => {
        const guardQuery = {
          assignedSupervisor: sup._id,
          employmentStatus: 'Active',
          isDeleted: false,
        };
        if (req.companyId) {
          guardQuery.companyId = req.companyId;
        }
        const guardCount = await Guard.countDocuments(guardQuery);
        const obj = sup.toObject();
        obj.guardCount = guardCount;
        return obj;
      })
    );

    res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Supervisor
// @route   POST /api/supervisors
// @access  Private
exports.createSupervisor = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Platform administrators cannot create company supervisors directly. Please operate within a registered company account.',
      });
    }

    const fullName = req.body.fullName || req.body.name;
    const mobileNumber = req.body.mobileNumber || req.body.phone;
    const { email, assignedSites, employmentStatus, alertPreferences } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Full Name and Mobile Number are required.',
      });
    }

    if (assignedSites !== undefined) {
      if (!Array.isArray(assignedSites)) {
        return res.status(400).json({
          success: false,
          message: 'assignedSites must be an array of site IDs.',
        });
      }

      const siteValidation = await validateAssignedSites(req.companyId, assignedSites);
      if (!siteValidation.valid) {
        return res.status(400).json({
          success: false,
          message: siteValidation.message,
        });
      }
    }

    const count = await Supervisor.countDocuments({ companyId: req.companyId });
    const supervisorId = `GC-SUP-${201 + count}`;

    const supervisor = await Supervisor.create({
      companyId: req.companyId,
      supervisorId,
      fullName,
      email,
      mobileNumber,
      assignedSites: assignedSites || [],
      employmentStatus: employmentStatus || 'Active',
      alertPreferences: alertPreferences || { sms: true, call: true, email: true },
    });

    await logAudit(
      req,
      'SUPERVISOR_CREATE',
      'Supervisor',
      supervisor._id,
      `Registered supervisor ${supervisor.fullName}`
    );

    const populated = await Supervisor.findById(supervisor._id).populate('assignedSites');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Supervisor
// @route   PUT /api/supervisors/:id
// @access  Private
exports.updateSupervisor = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      isDeleted: false,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { supervisorId: req.params.id }] }
        : { supervisorId: req.params.id }),
    };

    delete req.body.companyId;
    delete req.body._id;
    delete req.body.supervisorId;

    if (req.body.name && !req.body.fullName) req.body.fullName = req.body.name;
    if (req.body.phone && !req.body.mobileNumber) req.body.mobileNumber = req.body.phone;

    if (req.body.assignedSites !== undefined) {
      if (!Array.isArray(req.body.assignedSites)) {
        return res.status(400).json({
          success: false,
          message: 'assignedSites must be an array of site IDs.',
        });
      }

      const siteValidation = await validateAssignedSites(req.companyId, req.body.assignedSites);
      if (!siteValidation.valid) {
        return res.status(400).json({
          success: false,
          message: siteValidation.message,
        });
      }
    }

    const supervisor = await Supervisor.findOneAndUpdate(
      lookupQuery,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedSites');

    if (!supervisor) return res.status(404).json({ success: false, message: 'Supervisor not found.' });

    await logAudit(
      req,
      'SUPERVISOR_UPDATE',
      'Supervisor',
      supervisor._id,
      `Updated supervisor ${supervisor.fullName}`
    );

    res.status(200).json({ success: true, data: supervisor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Supervisor
// @route   DELETE /api/supervisors/:id
// @access  Private
exports.deleteSupervisor = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { supervisorId: req.params.id }] }
        : { supervisorId: req.params.id }),
    };

    const supervisor = await Supervisor.findOne(lookupQuery);
    if (!supervisor) return res.status(404).json({ success: false, message: 'Supervisor not found.' });

    supervisor.isDeleted = true;
    supervisor.employmentStatus = 'Inactive';
    await supervisor.save();

    await logAudit(
      req,
      'SUPERVISOR_DEACTIVATE',
      'Supervisor',
      supervisor._id,
      `Deactivated supervisor ${supervisor.fullName}`
    );

    res.status(200).json({ success: true, message: 'Supervisor deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
