const crypto = require('crypto');
const CompanyInvitation = require('../models/CompanyInvitation');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Guard = require('../models/Guard');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const Supervisor = require('../models/Supervisor');
const CallLog = require('../models/CallLog');
const { logAudit } = require('../middleware/audit');
const { generateSecureTemporaryPassword } = require('./adminController');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// @desc    Create Company Member Invitation
// @route   POST /api/company/invitations
// @access  Private (company_owner, admin)
exports.createInvitation = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Platform administrators cannot create company invitations directly. Please operate within a registered company account.',
      });
    }

    const { email, fullName, role } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both member full name and work email.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Role restrictions: Cannot invite as company_owner or super_admin
    const allowedRoles = ['admin', 'supervisor_admin', 'operator'];
    const assignedRole = role || 'admin';
    if (!allowedRoles.includes(assignedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role "${role}". Supported invitation roles are: admin, supervisor_admin, operator.`,
      });
    }

    // Prevent inviting an already registered email (primary or alias)
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: cleanEmail },
        { aliasEmail: cleanEmail },
      ],
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: `A user with email ${cleanEmail} is already registered as an administrator.`,
      });
    }

    // If an active pending invitation already exists for this company & email, revoke it
    await CompanyInvitation.updateMany(
      {
        companyId: req.companyId,
        email: cleanEmail,
        status: 'pending',
      },
      {
        status: 'revoked',
      }
    );

    // Generate secure 32-byte cryptographic token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    // Set expiry to 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await CompanyInvitation.create({
      companyId: req.companyId,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: assignedRole,
      tokenHash,
      invitedBy: req.admin._id,
      status: 'pending',
      expiresAt,
    });

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const invitationUrl = `${appBaseUrl}/accept-invitation/${rawToken}`;

    await logAudit(
      req,
      'SETTINGS_UPDATE',
      'Invitation',
      invitation._id,
      `Generated invitation for ${cleanEmail} as ${assignedRole}`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Invitation generated successfully.',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        invitedBy: {
          id: req.admin._id,
          fullName: req.admin.fullName,
        },
      },
      invitationUrl,
      token: rawToken,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List All Invitations for Authenticated Company
// @route   GET /api/company/invitations
// @access  Private (company_owner, super_admin, admin)
exports.getInvitations = async (req, res) => {
  try {
    const invitations = await CompanyInvitation.find({ companyId: req.companyId })
      .populate('invitedBy', 'fullName email')
      .sort({ createdAt: -1 });

    const now = new Date();
    const formatted = invitations.map((inv) => {
      let currentStatus = inv.status;
      if (currentStatus === 'pending' && inv.expiresAt < now) {
        currentStatus = 'expired';
      }
      return {
        id: inv._id,
        email: inv.email,
        fullName: inv.fullName,
        role: inv.role,
        status: currentStatus,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: inv.invitedBy
          ? {
              id: inv.invitedBy._id,
              fullName: inv.invitedBy.fullName,
              email: inv.invitedBy.email,
            }
          : null,
        createdAt: inv.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Revoke a Pending Invitation
// @route   DELETE /api/company/invitations/:id
// @access  Private (company_owner, super_admin, admin)
exports.revokeInvitation = async (req, res) => {
  try {
    const invitation = await CompanyInvitation.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation record not found.',
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot revoke an invitation that has already been accepted.',
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been revoked.',
      });
    }

    invitation.status = 'revoked';
    await invitation.save();

    await logAudit(
      req,
      'SETTINGS_UPDATE',
      'Invitation',
      invitation._id,
      `Revoked invitation for ${invitation.email}`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Invitation revoked successfully.',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Registered Admins/Staff for Authenticated Company
// @route   GET /api/company/members
// @access  Private
exports.getCompanyMembers = async (req, res) => {
  try {
    const members = await Admin.find({ companyId: req.companyId })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Directly Create Company User/Staff Member
// @route   POST /api/company/members
// @access  Private (company_owner, company_admin, admin, super_admin)
exports.createCompanyMember = async (req, res) => {
  try {
    if (!req.companyId) {
      return res.status(403).json({
        success: false,
        message: 'A valid company account is required to create company staff.',
      });
    }

    const { fullName, email, role, phone, password } = req.body;

    const resolvedName = (fullName || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!resolvedName || resolvedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the user full name (at least 2 characters).',
      });
    }

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid work email address.',
      });
    }

    // Role validation
    const allowedRoles = ['company_admin', 'admin', 'supervisor_admin', 'operator'];
    const assignedRole = role || 'admin';
    if (!allowedRoles.includes(assignedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role "${role}". Supported roles are: company_admin, admin, supervisor_admin, operator.`,
      });
    }

    // Only company_owner and super_admin can create company_admin/admin accounts
    if (['company_admin', 'admin'].includes(assignedRole) && req.admin.role !== 'company_owner' && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the Company Owner can create Company Admin accounts.',
      });
    }

    // Duplicate check
    const existing = await Admin.findOne({
      $or: [{ email: cleanEmail }, { aliasEmail: cleanEmail }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An account with email ${cleanEmail} already exists in the system.`,
      });
    }

    // Password handling: Use provided password if valid, or auto-generate secure temporary password
    let initialPassword = password ? String(password).trim() : '';
    if (initialPassword && initialPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }
    if (!initialPassword) {
      initialPassword = generateSecureTemporaryPassword();
    }

    const newMember = await Admin.create({
      companyId: req.companyId,
      fullName: resolvedName,
      email: cleanEmail,
      phone: (phone || '').trim(),
      role: assignedRole,
      password: initialPassword, // Bcrypt hashed via pre('save') hook
      isActive: true,
      mustChangePassword: true, // Forces password change on first login
    });

    await logAudit(
      req,
      'USER_CREATE',
      'Admin',
      newMember._id,
      `Created company user ${newMember.fullName} (${newMember.email}) as ${newMember.role}`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: `User ${newMember.fullName} created successfully.`,
      member: {
        id: newMember._id,
        _id: newMember._id,
        fullName: newMember.fullName,
        email: newMember.email,
        phone: newMember.phone,
        role: newMember.role,
        isActive: newMember.isActive,
        mustChangePassword: newMember.mustChangePassword,
        createdAt: newMember.createdAt,
      },
      temporaryPassword: initialPassword,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Company User/Staff Details
// @route   PUT /api/company/members/:id
// @access  Private (company_owner, company_admin, admin, super_admin)
exports.updateCompanyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, role } = req.body;

    const member = await Admin.findOne({ _id: id, companyId: req.companyId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Company user not found.' });
    }

    // Role restriction: cannot escalate to company_owner or super_admin
    if (role && ['company_owner', 'super_admin', 'platform_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot assign company owner or platform super admin roles.',
      });
    }

    // Cannot demote company owner unless caller is super_admin
    if (member.role === 'company_owner' && role && role !== 'company_owner' && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change the role of the Company Owner.',
      });
    }

    // Only company_owner and super_admin can assign admin/company_admin roles
    if (role && ['company_admin', 'admin'].includes(role) && req.admin.role !== 'company_owner' && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the Company Owner can promote users to Company Admin.',
      });
    }

    if (fullName && fullName.trim().length >= 2) member.fullName = fullName.trim();
    if (phone !== undefined) member.phone = phone ? String(phone).trim() : '';
    if (role && ['company_admin', 'admin', 'supervisor_admin', 'operator'].includes(role)) {
      member.role = role;
    }

    await member.save();

    await logAudit(
      req,
      'USER_UPDATE',
      'Admin',
      member._id,
      `Updated user details for ${member.fullName} (${member.role})`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `User ${member.fullName} updated successfully.`,
      member: {
        id: member._id,
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        isActive: member.isActive,
        mustChangePassword: member.mustChangePassword,
        createdAt: member.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Company User Status (Activate/Deactivate)
// @route   PATCH /api/company/members/:id/status
// @access  Private (company_owner, company_admin, admin, super_admin)
exports.toggleCompanyMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Admin.findOne({ _id: id, companyId: req.companyId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Company user not found.' });
    }

    // Prevent self-deactivation
    if (member._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own active account.',
      });
    }

    // Prevent deactivating the Company Owner
    if (member.role === 'company_owner' && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'The primary Company Owner account cannot be deactivated.',
      });
    }

    member.isActive = !member.isActive;
    await member.save();

    const action = member.isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE';
    await logAudit(
      req,
      action,
      'Admin',
      member._id,
      `${member.isActive ? 'Activated' : 'Deactivated'} user account for ${member.fullName}`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `User ${member.fullName} has been ${member.isActive ? 'activated' : 'deactivated'}.`,
      isActive: member.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Company User Password
// @route   POST /api/company/members/:id/reset-password
// @access  Private (company_owner, company_admin, admin, super_admin)
exports.resetCompanyMemberPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const member = await Admin.findOne({ _id: id, companyId: req.companyId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Company user not found.' });
    }

    // Only super_admin or company_owner themselves can reset the owner's password
    if (member.role === 'company_owner' && req.admin.role !== 'company_owner' && req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the Company Owner or Platform Admin can reset the Company Owner password.',
      });
    }

    let tempPassword = password ? String(password).trim() : '';
    if (tempPassword && tempPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }
    if (!tempPassword) {
      tempPassword = generateSecureTemporaryPassword();
    }

    member.password = tempPassword; // Bcrypt hashed via pre('save') hook
    member.mustChangePassword = true;
    await member.save();

    await logAudit(
      req,
      'PASSWORD_RESET',
      'Admin',
      member._id,
      `Reset password for company user ${member.fullName}`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${member.fullName}.`,
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// LEVEL 1: HEAD ADMIN / SUPER ADMIN PLATFORM MANAGEMENT CONTROLLERS
// =========================================================================

// @desc    Get Platform Administration Overview (Total companies, guards, sites)
// @route   GET /api/company/platform/overview
// @access  Private (super_admin only)
exports.getPlatformOverview = async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalGuards,
      totalSites,
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: 'active', isActive: true }),
      Company.countDocuments({ $or: [{ status: 'suspended' }, { status: 'inactive' }, { isActive: false }] }),
      Guard.countDocuments({ isDeleted: false }),
      Site.countDocuments({ isDeleted: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        totalGuards,
        totalSites,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All Registered Security Companies with Owner and Capacity Details
// @route   GET /api/company/platform/companies
// @access  Private (super_admin only)
exports.getPlatformCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .populate('ownerId', 'fullName email phone isActive lastLogin')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      companies.map(async (comp) => {
        const [guardsCount, sitesCount, shiftsCount, supervisorsCount, callsCount] = await Promise.all([
          Guard.countDocuments({ companyId: comp._id, isDeleted: false }),
          Site.countDocuments({ companyId: comp._id, isDeleted: false }),
          Shift.countDocuments({ companyId: comp._id, isDeleted: false }),
          Supervisor.countDocuments({ companyId: comp._id, isDeleted: false }),
          CallLog.countDocuments({ companyId: comp._id }),
        ]);

        return {
          id: comp._id,
          name: comp.name,
          code: comp.code,
          registrationNumber: comp.registrationNumber || '',
          contactPerson: comp.contactPerson || comp.ownerId?.fullName || '',
          email: comp.email,
          phone: comp.phone,
          city: comp.city,
          state: comp.state,
          address: comp.address,
          pincode: comp.pincode,
          status: comp.status || (comp.isActive ? 'active' : 'suspended'),
          isActive: comp.isActive,
          createdAt: comp.createdAt,
          owner: comp.ownerId
            ? {
                id: comp.ownerId._id,
                fullName: comp.ownerId.fullName,
                email: comp.ownerId.email,
                phone: comp.ownerId.phone,
                isActive: comp.ownerId.isActive,
                lastLogin: comp.ownerId.lastLogin,
              }
            : null,
          guardsCount,
          sitesCount,
          shiftsCount,
          supervisorsCount,
          callsCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register New Security Company and Owner Account (Platform Admin)
// @route   POST /api/company/platform/companies
// @access  Private (super_admin, platform_admin)
exports.createPlatformCompany = async (req, res) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  try {
    const {
      name,
      companyName,
      registrationNumber,
      contactPerson,
      code,
      companyCode,
      email,
      officialEmail,
      companyEmail,
      phone,
      contactNumber,
      companyPhone,
      city,
      state,
      address,
      officeAddress,
      pincode,
      pinCode,
      status,
      ownerName,
      fullName,
      ownerEmail,
      ownerPhone,
      password,
      initialPassword,
      ownerPassword,
    } = req.body;

    const resolvedName = (name || companyName || '').trim();
    const resolvedRegNumber = (registrationNumber || '').trim();
    const resolvedContactPerson = (contactPerson || ownerName || fullName || '').trim();
    const resolvedEmail = (officialEmail || email || companyEmail || '').toLowerCase().trim();
    const resolvedPhone = (contactNumber || phone || companyPhone || '').trim();
    const resolvedAddress = (officeAddress || address || '').trim();
    const resolvedCity = (city || 'Gurugram').trim();
    const resolvedState = (state || 'Haryana').trim();
    const resolvedPincode = (pincode || pinCode || '122002').trim();
    const resolvedStatus = status && ['active', 'inactive', 'suspended'].includes(status) ? status : 'active';

    const resolvedOwnerName = resolvedContactPerson;
    const resolvedOwnerEmail = (ownerEmail || resolvedEmail).toLowerCase().trim();
    const resolvedOwnerPhone = (ownerPhone || resolvedPhone || '+91 98110 12345').trim();
    const resolvedPassword = initialPassword || password || ownerPassword;

    // Validation
    if (!resolvedName) {
      return res.status(400).json({ success: false, message: 'Company Name is required.' });
    }
    if (!resolvedContactPerson) {
      return res.status(400).json({ success: false, message: 'Contact Person is required.' });
    }
    if (!resolvedEmail || !emailRegex.test(resolvedEmail)) {
      return res.status(400).json({ success: false, message: 'Valid Official Email address is required.' });
    }
    if (!resolvedPhone) {
      return res.status(400).json({ success: false, message: 'Contact Number is required.' });
    }
    if (!resolvedAddress) {
      return res.status(400).json({ success: false, message: 'Office Address is required.' });
    }
    if (!resolvedCity || !resolvedState) {
      return res.status(400).json({ success: false, message: 'City and State are required.' });
    }
    if (!resolvedPincode) {
      return res.status(400).json({ success: false, message: 'PIN Code is required.' });
    }
    if (!resolvedPassword || resolvedPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Initial password must be at least 8 characters long.' });
    }

    // Check existing owner email across primary and alias fields
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: resolvedOwnerEmail },
        { aliasEmail: resolvedOwnerEmail },
      ],
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: `An administrator account with email ${resolvedOwnerEmail} already exists.`,
      });
    }

    // Handle unique company code / ID (custom or auto-generated)
    const customCode = (code || companyCode || '').toUpperCase().trim();
    let finalCode = customCode;
    if (finalCode) {
      const existingComp = await Company.findOne({ code: finalCode });
      if (existingComp) {
        return res.status(409).json({
          success: false,
          message: `Company ID / code "${finalCode}" is already in use by another agency.`,
        });
      }
    } else {
      let base = resolvedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (!base || base.length < 3) base = 'AG';
      const companyCount = await Company.countDocuments();
      const seqNumber = 1001 + companyCount;
      finalCode = `${base}-${seqNumber}`;
      let attempt = 0;
      while (true) {
        const existingComp = await Company.findOne({ code: finalCode });
        if (!existingComp) break;
        attempt++;
        finalCode = `${base}-${seqNumber + attempt}`;
      }
    }

    // Create Company in MongoDB
    const company = await Company.create({
      name: resolvedName,
      code: finalCode,
      registrationNumber: resolvedRegNumber,
      contactPerson: resolvedContactPerson,
      email: resolvedEmail,
      phone: resolvedPhone,
      address: resolvedAddress,
      city: resolvedCity,
      state: resolvedState,
      pincode: resolvedPincode,
      status: resolvedStatus,
      isActive: resolvedStatus === 'active',
    });

    // Create initial Company Owner/Admin account
    const owner = await Admin.create({
      companyId: company._id,
      fullName: resolvedOwnerName,
      email: resolvedOwnerEmail,
      password: resolvedPassword,
      phone: resolvedOwnerPhone,
      role: 'company_owner',
      isActive: resolvedStatus === 'active',
      mustChangePassword: false,
    });

    company.ownerId = owner._id;
    await company.save();

    await logAudit(
      req,
      'COMPANY_REGISTER',
      'Company',
      company._id,
      `Platform Admin registered company "${company.name}" (${company.code}) with owner ${owner.fullName}.`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Security company "${company.name}" registered successfully.`,
      company: {
        id: company._id,
        name: company.name,
        code: company.code,
        registrationNumber: company.registrationNumber,
        contactPerson: company.contactPerson,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        status: company.status,
        isActive: company.isActive,
        createdAt: company.createdAt,
        owner: {
          id: owner._id,
          fullName: owner.fullName,
          email: owner.email,
          phone: owner.phone,
          role: owner.role,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A company or user with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Single Security Company Details
// @route   GET /api/company/platform/companies/:id
// @access  Private (super_admin, platform_admin)
exports.getPlatformCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const comp = await Company.findById(id).populate('ownerId', 'fullName email phone isActive lastLogin createdAt');
    if (!comp) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const [guardsCount, sitesCount, shiftsCount, supervisorsCount, callsCount] = await Promise.all([
      Guard.countDocuments({ companyId: comp._id, isDeleted: false }),
      Site.countDocuments({ companyId: comp._id, isDeleted: false }),
      Shift.countDocuments({ companyId: comp._id, isDeleted: false }),
      Supervisor.countDocuments({ companyId: comp._id, isDeleted: false }),
      CallLog.countDocuments({ companyId: comp._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        id: comp._id,
        name: comp.name,
        code: comp.code,
        registrationNumber: comp.registrationNumber || '',
        contactPerson: comp.contactPerson || comp.ownerId?.fullName || '',
        email: comp.email,
        phone: comp.phone,
        address: comp.address,
        city: comp.city,
        state: comp.state,
        pincode: comp.pincode,
        status: comp.status || (comp.isActive ? 'active' : 'suspended'),
        isActive: comp.isActive,
        createdAt: comp.createdAt,
        owner: comp.ownerId
          ? {
              id: comp.ownerId._id,
              fullName: comp.ownerId.fullName,
              email: comp.ownerId.email,
              phone: comp.ownerId.phone,
              isActive: comp.ownerId.isActive,
              lastLogin: comp.ownerId.lastLogin,
            }
          : null,
        guardsCount,
        sitesCount,
        shiftsCount,
        supervisorsCount,
        callsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Security Company Details
// @route   PUT /api/company/platform/companies/:id
// @access  Private (super_admin, platform_admin)
exports.updatePlatformCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      companyName,
      registrationNumber,
      contactPerson,
      email,
      officialEmail,
      phone,
      contactNumber,
      address,
      officeAddress,
      city,
      state,
      pincode,
      pinCode,
      status,
    } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const resolvedName = (name || companyName || '').trim();
    if (resolvedName) company.name = resolvedName;
    if (registrationNumber !== undefined) company.registrationNumber = registrationNumber.trim();
    if (contactPerson !== undefined) company.contactPerson = contactPerson.trim();

    const resolvedEmail = (officialEmail || email || '').toLowerCase().trim();
    if (resolvedEmail) company.email = resolvedEmail;

    const resolvedPhone = (contactNumber || phone || '').trim();
    if (resolvedPhone) company.phone = resolvedPhone;

    const resolvedAddress = (officeAddress || address || '').trim();
    if (resolvedAddress) company.address = resolvedAddress;

    if (city) company.city = city.trim();
    if (state) company.state = state.trim();
    const resolvedPincode = (pincode || pinCode || '').trim();
    if (resolvedPincode) company.pincode = resolvedPincode;

    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      company.status = status;
      company.isActive = status === 'active';
      await Admin.updateMany(
        { companyId: company._id },
        { isActive: status === 'active' }
      );
    }

    await company.save();

    if (company.ownerId && (contactPerson || resolvedPhone)) {
      const owner = await Admin.findById(company.ownerId);
      if (owner) {
        if (contactPerson) owner.fullName = contactPerson.trim();
        if (resolvedPhone) owner.phone = resolvedPhone;
        await owner.save();
      }
    }

    await logAudit(
      req,
      'SETTINGS_UPDATE',
      'Company',
      company._id,
      `Platform Admin updated details for company "${company.name}".`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Company "${company.name}" updated successfully.`,
      company: {
        id: company._id,
        name: company.name,
        code: company.code,
        registrationNumber: company.registrationNumber,
        contactPerson: company.contactPerson,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        pincode: company.pincode,
        status: company.status,
        isActive: company.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Company Owner Password
// @route   POST /api/company/platform/companies/:id/reset-password
// @access  Private (super_admin, platform_admin)
exports.resetCompanyOwnerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    let owner = null;
    if (company.ownerId) {
      owner = await Admin.findById(company.ownerId);
    }
    if (!owner) {
      owner = await Admin.findOne({ companyId: company._id, role: 'company_owner' });
    }

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'No owner account found for this company.',
      });
    }

    owner.password = password;
    await owner.save();

    await logAudit(
      req,
      'PASSWORD_CHANGE',
      'Admin',
      owner._id,
      `Platform Admin reset owner password for company "${company.name}".`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Password for "${company.name}" owner (${owner.email}) has been securely reset.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate, Deactivate or Suspend a Company
// @route   PATCH /api/company/platform/companies/:id/status
// @access  Private (super_admin only)
exports.updatePlatformCompanyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    company.status = status;
    company.isActive = status === 'active';
    await company.save();

    // Synchronize company admins isActive
    await Admin.updateMany(
      { companyId: company._id },
      { isActive: status === 'active' }
    );

    await logAudit(
      req,
      'SETTINGS_UPDATE',
      'Company',
      company._id,
      `Head Admin changed company "${company.name}" status to "${status}".`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Company "${company.name}" status updated to "${status}".`,
      company: {
        id: company._id,
        name: company.name,
        status: company.status,
        isActive: company.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or Manage Company Owner Account
// @route   POST /api/company/platform/companies/:id/owner
// @access  Private (super_admin only)
exports.managePlatformCompanyOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, phone } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    let owner = null;
    if (company.ownerId) {
      owner = await Admin.findById(company.ownerId);
    }

    if (!owner && email) {
      const cleanEmail = email.toLowerCase().trim();
      owner = await Admin.findOne({
        $or: [
          { email: cleanEmail },
          { aliasEmail: cleanEmail },
        ],
      });
    }

    if (owner) {
      // Update existing owner
      if (fullName) owner.fullName = fullName.trim();
      if (phone) owner.phone = phone.trim();
      if (password) {
        if (password.length < 8) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }
        owner.password = password;
      }
      owner.isActive = company.isActive;
      await owner.save();

      await logAudit(
        req,
        'SETTINGS_UPDATE',
        'Admin',
        owner._id,
        `Head Admin updated owner account for company "${company.name}".`
      ).catch(() => {});

      return res.status(200).json({
        success: true,
        message: `Owner account for "${company.name}" updated successfully.`,
        owner: {
          id: owner._id,
          fullName: owner.fullName,
          email: owner.email,
          phone: owner.phone,
          role: owner.role,
          isActive: owner.isActive,
        },
      });
    }

    // Create new owner for this company
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Owner full name, email and password are required to create a new owner.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const cleanOwnerEmail = email.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: cleanOwnerEmail },
        { aliasEmail: cleanOwnerEmail },
      ],
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: `An administrator account with email ${email} already exists.`,
      });
    }

    const newOwner = await Admin.create({
      companyId: company._id,
      fullName: fullName.trim(),
      email: cleanOwnerEmail,
      password,
      phone: phone?.trim(),
      role: 'company_owner',
      isActive: company.isActive,
    });

    company.ownerId = newOwner._id;
    await company.save();

    await logAudit(
      req,
      'COMPANY_REGISTER',
      'Admin',
      newOwner._id,
      `Head Admin assigned new owner ${newOwner.fullName} to company "${company.name}".`
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Owner account created and linked to "${company.name}".`,
      owner: {
        id: newOwner._id,
        fullName: newOwner.fullName,
        email: newOwner.email,
        phone: newOwner.phone,
        role: newOwner.role,
        isActive: newOwner.isActive,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with these credentials already exists in the system.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
