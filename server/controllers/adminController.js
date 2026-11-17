const crypto = require('crypto');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const { logAudit } = require('../middleware/audit');

/**
 * Generate a cryptographically secure temporary password.
 * High-entropy 12-character string with guaranteed uppercase, lowercase, numbers, and symbols.
 */
function generateSecureTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';

  const pick = (charset, n) => {
    const bytes = crypto.randomBytes(n);
    let res = '';
    for (let i = 0; i < n; i++) {
      res += charset[bytes[i] % charset.length];
    }
    return res;
  };

  const allChars = upper + lower + digits + symbols;
  const guaranteed = pick(upper, 2) + pick(lower, 2) + pick(digits, 2) + pick(symbols, 2);
  const remaining = pick(allChars, 4);

  const combined = (guaranteed + remaining).split('');
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join('');
}

// @desc    Get list of all platform & company administrators
// @route   GET /api/company/platform/admins
// @access  Private (super_admin, platform_admin)
exports.getPlatformAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .populate('companyId', 'name code city state')
      .select('-password')
      .sort({ createdAt: -1 });

    const formatted = admins.map((a) => ({
      id: a._id,
      fullName: a.fullName,
      email: a.email,
      aliasEmail: a.aliasEmail,
      role: a.role,
      company: a.companyId
        ? {
            id: a.companyId._id,
            name: a.companyId.name,
            code: a.companyId.code,
            location: `${a.companyId.city || ''}${a.companyId.city && a.companyId.state ? ', ' : ''}${a.companyId.state || ''}`,
          }
        : null,
      isActive: a.isActive,
      mustChangePassword: Boolean(a.mustChangePassword),
      lastLogin: a.lastLogin,
      createdAt: a.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve administrator list.',
    });
  }
};

// @desc    Create a new Platform Admin or Company Admin
// @route   POST /api/company/platform/admins
// @access  Private (super_admin for platform_admin; super_admin & platform_admin for company_admin)
exports.createPlatformAdminAccount = async (req, res) => {
  try {
    const { fullName, email, role, companyId, phone } = req.body;

    // Validate name
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required (minimum 2 characters).',
      });
    }

    // Validate email
    const cleanEmail = email?.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
    }

    // Validate role
    if (!role || !['platform_admin', 'company_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "platform_admin" or "company_admin".',
      });
    }

    // Role-specific authorization
    if (role === 'platform_admin' && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Main Admin can create Platform Admin accounts.',
      });
    }

    // Company Admin requires an active company
    let targetCompany = null;
    if (role === 'company_admin') {
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'An assigned company is required for Company Admin accounts.',
        });
      }
      targetCompany = await Company.findById(companyId);
      if (!targetCompany) {
        return res.status(404).json({
          success: false,
          message: 'The selected company does not exist.',
        });
      }
      if (!targetCompany.isActive || targetCompany.status === 'suspended') {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign administrator to a suspended or inactive company.',
        });
      }
    }

    // Duplicate email & alias collision check
    const existingAdmin = await Admin.findOne({
      $or: [{ email: cleanEmail }, { aliasEmail: cleanEmail }],
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: `An administrator account with email ${cleanEmail} already exists.`,
      });
    }

    // Automatically generate cryptographically secure temporary password
    const temporaryPassword = generateSecureTemporaryPassword();

    // Create administrator document
    const newAdmin = await Admin.create({
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone?.trim() || '',
      password: temporaryPassword, // Hashed by bcrypt pre-save hook in Admin model
      role,
      companyId: role === 'company_admin' ? targetCompany._id : null,
      isActive: true,
      mustChangePassword: true, // Mandatory change on first login
    });

    await logAudit(
      req,
      'ADMIN_CREATE',
      'Admin',
      newAdmin._id,
      `${req.admin.role === 'super_admin' ? 'Main Admin' : 'Platform Admin'} ${req.admin.fullName} created ${role === 'platform_admin' ? 'Platform Admin' : 'Company Admin'} ${newAdmin.fullName} (${newAdmin.email}).`
    ).catch(() => {});

    // Return temporary password ONLY ONCE in the creation response
    res.status(201).json({
      success: true,
      message: `${role === 'platform_admin' ? 'Platform Admin' : 'Company Admin'} created successfully.`,
      temporaryPassword,
      admin: {
        id: newAdmin._id,
        fullName: newAdmin.fullName,
        email: newAdmin.email,
        role: newAdmin.role,
        company: targetCompany ? { id: targetCompany._id, name: targetCompany.name, code: targetCompany.code } : null,
        isActive: newAdmin.isActive,
        mustChangePassword: newAdmin.mustChangePassword,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create administrator account.',
    });
  }
};

// @desc    Toggle administrator active/inactive status
// @route   PATCH /api/company/platform/admins/:id/status
// @access  Private (super_admin, platform_admin)
exports.toggleAdminStatus = async (req, res) => {
  try {
    const target = await Admin.findById(req.params.id);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found.',
      });
    }

    // Prevent self-deactivation
    if (target._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own administrator account.',
      });
    }

    // Protect primary Head Admin account
    if (
      target.email === 'headadmin@autoguard.com' ||
      target.aliasEmail === 'vikrant@autoguardsecurity.com' ||
      target.role === 'super_admin'
    ) {
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Platform administrators cannot deactivate Super Admin accounts.',
        });
      }
      if (target.email === 'headadmin@autoguard.com') {
        return res.status(403).json({
          success: false,
          message: 'The primary Head Admin account cannot be deactivated.',
        });
      }
    }

    target.isActive = !target.isActive;
    await target.save();

    await logAudit(
      req,
      'ADMIN_STATUS_UPDATE',
      'Admin',
      target._id,
      `Administrator ${target.fullName} status updated to ${target.isActive ? 'Active' : 'Deactivated'} by ${req.admin.fullName}.`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Administrator "${target.fullName}" is now ${target.isActive ? 'active' : 'deactivated'}.`,
      admin: {
        id: target._id,
        fullName: target.fullName,
        email: target.email,
        isActive: target.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update administrator status.',
    });
  }
};

// @desc    Reset administrator password (generates temporary password & sets mustChangePassword)
// @route   POST /api/company/platform/admins/:id/reset-password
// @access  Private (super_admin, platform_admin)
exports.resetAdminPassword = async (req, res) => {
  try {
    const target = await Admin.findById(req.params.id);
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found.',
      });
    }

    // Platform Admin cannot reset Super Admin
    if (req.admin.role === 'platform_admin' && target.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Platform administrators cannot reset Super Admin passwords.',
      });
    }

    // Generate new temporary password
    const temporaryPassword = generateSecureTemporaryPassword();
    target.password = temporaryPassword; // Hashed by bcrypt pre-save hook
    target.mustChangePassword = true;
    await target.save();

    await logAudit(
      req,
      'ADMIN_PASSWORD_RESET',
      'Admin',
      target._id,
      `Password reset for administrator ${target.fullName} by ${req.admin.fullName}.`
    ).catch(() => {});

    // Return temporary password ONLY ONCE in the reset response
    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${target.fullName}.`,
      temporaryPassword,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset administrator password.',
    });
  }
};

exports.generateSecureTemporaryPassword = generateSecureTemporaryPassword;

