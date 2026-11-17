const mongoose = require('mongoose');
const Site = require('../models/Site');
const Guard = require('../models/Guard');
const Supervisor = require('../models/Supervisor');
const { logAudit } = require('../middleware/audit');

// Helper to validate assignedSupervisor exists and belongs strictly to the authenticated company
const validateSupervisor = async (companyId, supervisorId) => {
  if (!supervisorId) return { valid: true };
  if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
    return { valid: false, message: 'Invalid supervisor selection.' };
  }
  const supervisor = await Supervisor.findOne({
    _id: supervisorId,
    companyId,
    isDeleted: false,
  });
  if (!supervisor) {
    return { valid: false, message: 'Invalid supervisor selection.' };
  }
  return { valid: true };
};

// @desc    Get all sites
// @route   GET /api/sites
// @access  Private
exports.getSites = async (req, res) => {
  try {
    const siteQuery = {
      isDeleted: false,
    };
    if (req.companyId) {
      siteQuery.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      siteQuery.companyId = req.query.companyId;
    }

    const sites = await Site.find(siteQuery)
      .populate('assignedSupervisor', 'fullName supervisorId mobileNumber')
      .sort({ createdAt: -1 });

    // Include dynamic count of active guards assigned to each site
    const sitesWithCounts = await Promise.all(
      sites.map(async (site) => {
        const guardQuery = {
          assignedSite: site._id,
          employmentStatus: 'Active',
          isDeleted: false,
        };
        if (req.companyId) {
          guardQuery.companyId = req.companyId;
        }
        const guardCount = await Guard.countDocuments(guardQuery);
        const siteObj = site.toObject();
        siteObj.guardCount = guardCount;
        return siteObj;
      })
    );

    res.status(200).json({ success: true, data: sitesWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Site
// @route   POST /api/sites
// @access  Private
exports.createSite = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Platform administrators cannot create company sites directly. Please operate within a registered company account.',
      });
    }

    const siteName = req.body.siteName || req.body.name;
    const { address, city, state, contactNumber, assignedSupervisor, guardCapacity } = req.body;

    if (!siteName || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Site name, address, and city are required.',
      });
    }

    if (assignedSupervisor) {
      const supValidation = await validateSupervisor(req.companyId, assignedSupervisor);
      if (!supValidation.valid) {
        return res.status(400).json({
          success: false,
          message: supValidation.message,
        });
      }
    }

    const count = await Site.countDocuments({ companyId: req.companyId });
    const siteId = `GC-SIT-${101 + count}`;

    const site = await Site.create({
      companyId: req.companyId,
      siteId,
      siteName,
      address,
      city,
      state: state || 'Haryana',
      contactNumber,
      assignedSupervisor: assignedSupervisor || null,
      guardCapacity: guardCapacity || 5,
    });

    await logAudit(req, 'SITE_CREATE', 'Site', site._id, `Created site ${site.siteName}`);

    const populated = await Site.findById(site._id).populate('assignedSupervisor');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Site
// @route   PUT /api/sites/:id
// @access  Private
exports.updateSite = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      isDeleted: false,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { siteId: req.params.id }] }
        : { siteId: req.params.id }),
    };

    // Strip protected / tenant immutable fields
    delete req.body.companyId;
    delete req.body._id;
    delete req.body.siteId;

    if (req.body.name && !req.body.siteName) {
      req.body.siteName = req.body.name;
    }

    if (req.body.assignedSupervisor !== undefined && req.body.assignedSupervisor) {
      const supValidation = await validateSupervisor(req.companyId, req.body.assignedSupervisor);
      if (!supValidation.valid) {
        return res.status(400).json({
          success: false,
          message: supValidation.message,
        });
      }
    }

    const site = await Site.findOneAndUpdate(
      lookupQuery,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedSupervisor');

    if (!site) return res.status(404).json({ success: false, message: 'Site not found.' });

    await logAudit(req, 'SITE_UPDATE', 'Site', site._id, `Updated site ${site.siteName}`);
    res.status(200).json({ success: true, data: site });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete/Deactivate Site
// @route   DELETE /api/sites/:id
// @access  Private
exports.deleteSite = async (req, res) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const lookupQuery = {
      companyId: req.companyId,
      ...(isObjectId
        ? { $or: [{ _id: req.params.id }, { siteId: req.params.id }] }
        : { siteId: req.params.id }),
    };

    const site = await Site.findOne(lookupQuery);
    if (!site) return res.status(404).json({ success: false, message: 'Site not found.' });

    site.isDeleted = true;
    site.status = 'Inactive';
    await site.save();

    await logAudit(req, 'SITE_DEACTIVATE', 'Site', site._id, `Deactivated site ${site.siteName}`);

    res.status(200).json({ success: true, message: 'Site deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
