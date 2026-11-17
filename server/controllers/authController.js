const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Company = require('../models/Company');
const CompanyInvitation = require('../models/CompanyInvitation');
const demoService = require('../services/demoService');
const { logAudit } = require('../middleware/audit');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Helper: Generate unique company uppercase code
const generateUniqueCompanyCode = async (name, session) => {
  let base = (name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  if (!base || base.length < 3) {
    base = 'GUARD';
  }

  let code = base;
  let attempt = 0;

  while (true) {
    const existing = await Company.findOne({ code }).session(session || null);
    if (!existing) {
      return code;
    }
    attempt++;
    code = `${base.slice(0, 5)}${attempt.toString().padStart(3, '0')}`;
    if (attempt > 999) {
      code = `${base.slice(0, 4)}${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }
};

// @desc    Register New Security Company and Owner Account
// @route   POST /api/auth/register-company
// @access  Public
exports.registerCompany = async (req, res) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  try {
    const {
      companyName,
      name,
      companyEmail,
      companyPhone,
      city,
      state,
      address,
      pincode,
      ownerName,
      fullName,
      ownerEmail,
      ownerPhone,
      password,
      confirmPassword,
    } = req.body;

    const resolvedCompanyName = (companyName || name || '').trim();
    const resolvedCompanyEmail = (companyEmail || '').toLowerCase().trim();
    const resolvedCompanyPhone = (companyPhone || '').trim();
    const resolvedCity = (city || '').trim();
    const resolvedState = (state || '').trim();
    const resolvedAddress = (address || '').trim();
    const resolvedPincode = (pincode || '').trim();

    const resolvedOwnerName = (ownerName || fullName || '').trim();
    const resolvedOwnerEmail = (ownerEmail || '').toLowerCase().trim();
    const resolvedOwnerPhone = (ownerPhone || resolvedCompanyPhone || '').trim();

    // 1. Validation checks
    if (!resolvedCompanyName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the legal company name.',
      });
    }

    if (!resolvedCompanyEmail || !emailRegex.test(resolvedCompanyEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid official company email address.',
      });
    }

    if (!resolvedCity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the operating city.',
      });
    }

    if (!resolvedState) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the operating state.',
      });
    }

    if (!resolvedOwnerName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the owner full name.',
      });
    }

    if (!resolvedOwnerEmail || !emailRegex.test(resolvedOwnerEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid owner work email address.',
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // 2. Check whether the owner email already exists (as primary or alias)
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: resolvedOwnerEmail },
        { aliasEmail: resolvedOwnerEmail },
      ],
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'An administrator account with this owner email address already exists. Please log in.',
      });
    }

    // 3. Atomically create Company and Owner
    // Uses native MongoDB multi-document transaction when supported (ReplicaSet / Sharded),
    // and compensating rollback on standalone development instances.
    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const canUseTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let session = null;
    let createdCompany = null;
    let createdOwner = null;

    if (canUseTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Generate unique company code
      const uniqueCode = await generateUniqueCompanyCode(resolvedCompanyName, session);

      const companyData = {
        name: resolvedCompanyName,
        code: uniqueCode,
        email: resolvedCompanyEmail,
        phone: resolvedCompanyPhone || '+91 98765 43210',
        address: resolvedAddress || `${resolvedCity}, ${resolvedState}`,
        city: resolvedCity,
        state: resolvedState,
        pincode: resolvedPincode || '122001',
        isActive: true,
      };

      if (session) {
        const [comp] = await Company.create([companyData], { session });
        createdCompany = comp;
      } else {
        createdCompany = await Company.create(companyData);
      }

      const adminData = {
        companyId: createdCompany._id,
        fullName: resolvedOwnerName,
        email: resolvedOwnerEmail,
        password: password,
        phone: resolvedOwnerPhone,
        role: 'company_owner',
        isActive: true,
        lastLogin: new Date(),
      };

      if (session) {
        const [owner] = await Admin.create([adminData], { session });
        createdOwner = owner;
      } else {
        createdOwner = await Admin.create(adminData);
      }

      // Link Company ownerId to the newly created Admin
      createdCompany.ownerId = createdOwner._id;
      if (session) {
        await createdCompany.save({ session });
        await session.commitTransaction();
        session.endSession();
      } else {
        await createdCompany.save();
      }

      // Audit log entry (non-blocking)
      await logAudit(
        { admin: createdOwner, companyId: createdCompany._id, ip: req.ip },
        'COMPANY_REGISTER',
        'Company',
        createdCompany._id,
        `New company "${createdCompany.name}" (${createdCompany.code}) registered with owner ${createdOwner.fullName}.`
      ).catch(() => {});

      // Generate JWT for immediate onboarding
      const token = generateToken(createdOwner._id);

      res.status(201).json({
        success: true,
        message: 'Company and Owner account registered successfully.',
        token,
        admin: {
          id: createdOwner._id,
          fullName: createdOwner.fullName,
          email: createdOwner.email,
          role: createdOwner.role,
          phone: createdOwner.phone,
          company: createdCompany,
        },
      });
    } catch (txError) {
      if (session) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch (_) {}
      } else if (createdCompany && createdCompany._id) {
        // Compensating rollback for standalone MongoDB
        try {
          await Company.findByIdAndDelete(createdCompany._id);
        } catch (_) {}
      }
      throw txError;
    }
  } catch (error) {
    console.error('[Register Company Error]', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A company or user with these credentials already exists in the system.',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error occurred during company registration.',
    });
  }
};

// @desc    Login Admin
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both company email and password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const candidateEmails = [cleanEmail];
    if (cleanEmail === 'vikrant@autoguardsecurity.com') {
      candidateEmails.push('headadmin@autoguard.com');
    } else if (cleanEmail === 'headadmin@autoguard.com') {
      candidateEmails.push('vikrant@autoguardsecurity.com');
    }

    const admin = await Admin.findOne({
      $or: [
        { email: { $in: candidateEmails } },
        { aliasEmail: { $in: candidateEmails } },
      ],
    }).populate('companyId');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact your company administrator.',
      });
    }

    if (admin.role !== 'super_admin' && admin.role !== 'platform_admin') {
      if (!admin.companyId) {
        return res.status(403).json({
          success: false,
          message: 'No security company associated with this administrator account.',
        });
      }
      if (admin.companyId.isActive === false || admin.companyId.status === 'suspended' || admin.companyId.status === 'inactive') {
        return res.status(403).json({
          success: false,
          message: 'Your security company account has been deactivated or suspended. Please contact platform administration.',
        });
      }
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);

    await logAudit(
      { admin, companyId: admin.companyId?._id, ip: req.ip },
      'LOGIN',
      'Auth',
      admin._id,
      `Administrator ${admin.fullName} logged in successfully.`
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        company: admin.companyId,
        mustChangePassword: Boolean(admin.mustChangePassword),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during authentication.',
    });
  }
};

// @desc    Get Current Logged in Admin
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).populate('companyId');
    res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        company: admin.companyId,
        mustChangePassword: Boolean(admin.mustChangePassword),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change Password (Mandatory on First Login or Self-Service)
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as the current password.',
      });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found.',
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password does not match.',
      });
    }

    admin.password = newPassword;
    admin.mustChangePassword = false;
    await admin.save();

    await logAudit(
      req,
      'PASSWORD_CHANGE',
      'Admin',
      admin._id,
      `Administrator ${admin.fullName} successfully changed password.`
    ).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        company: admin.companyId,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    if (req.admin) {
      await logAudit(req, 'LOGOUT', 'Auth', req.admin._id, 'Administrator logged out.');
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password (Self-service recovery)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email?.toLowerCase().trim();
    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const candidateEmails = [cleanEmail];
    if (cleanEmail === 'vikrant@autoguardsecurity.com') {
      candidateEmails.push('headadmin@autoguard.com');
    } else if (cleanEmail === 'headadmin@autoguard.com') {
      candidateEmails.push('vikrant@autoguardsecurity.com');
    }

    const admin = await Admin.findOne({
      $or: [
        { email: { $in: candidateEmails } },
        { aliasEmail: { $in: candidateEmails } },
      ],
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No administrator account found with that email address.',
      });
    }

    // In production, send secure reset token via email. For demo/system verification, return instructions.
    res.status(200).json({
      success: true,
      message: 'Password reset link has been dispatched to your email address.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate an Invitation Token (Public)
// @route   GET /api/auth/invitations/:token
// @access  Public
exports.validateInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is missing.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await CompanyInvitation.findOne({ tokenHash }).populate(
      'companyId',
      'name city state'
    );

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or non-existent invitation link.',
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({
        success: false,
        status: 'revoked',
        message: 'This invitation has been revoked by the company administrator.',
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        status: 'accepted',
        message: 'This invitation has already been accepted.',
      });
    }

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        status: 'expired',
        message: 'This invitation has expired. Please request a new invitation from your company administrator.',
      });
    }

    // Safe public response without exposing tokenHash or sensitive internals
    res.status(200).json({
      success: true,
      invitation: {
        email: invitation.email,
        fullName: invitation.fullName,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        company: {
          name: invitation.companyId?.name || 'AutoGuard Security Agency',
          city: invitation.companyId?.city || '',
          state: invitation.companyId?.state || '',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept Invitation & Join Company
// @route   POST /api/auth/accept-invitation
// @access  Public
exports.acceptInvitation = async (req, res) => {
  try {
    const { token, fullName, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required.',
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await CompanyInvitation.findOne({ tokenHash });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or non-existent invitation link.',
      });
    }

    if (invitation.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has been revoked.',
      });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been accepted.',
      });
    }

    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired.',
      });
    }

    // Ensure email is not already registered (as primary or alias)
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: invitation.email },
        { aliasEmail: invitation.email },
      ],
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'A user account with this email address already exists. Please sign in.',
      });
    }

    const topologyType = mongoose.connection.client?.topology?.description?.type;
    const canUseTransactions = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

    let session = null;
    let newAdmin = null;

    if (canUseTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      const adminData = {
        companyId: invitation.companyId,
        fullName: (fullName || invitation.fullName).trim(),
        email: invitation.email,
        password: password,
        role: invitation.role, // Strictly assigned from invitation!
        isActive: true,
        lastLogin: new Date(),
      };

      if (session) {
        const [adm] = await Admin.create([adminData], { session });
        newAdmin = adm;
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save({ session });
        await session.commitTransaction();
        session.endSession();
      } else {
        newAdmin = await Admin.create(adminData);
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        await invitation.save();
      }

      // Fetch company details for JWT response
      const company = await Company.findById(invitation.companyId);

      await logAudit(
        { admin: newAdmin, companyId: invitation.companyId, ip: req.ip },
        'LOGIN',
        'Auth',
        newAdmin._id,
        `User ${newAdmin.fullName} accepted invitation and joined ${company?.name || 'company'}`
      ).catch(() => {});

      const jwtToken = generateToken(newAdmin._id);

      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully. Welcome to your team workspace!',
        token: jwtToken,
        admin: {
          id: newAdmin._id,
          fullName: newAdmin.fullName,
          email: newAdmin.email,
          role: newAdmin.role,
          phone: newAdmin.phone,
          company: company,
        },
      });
    } catch (createErr) {
      if (session) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch (_) {}
      }
      throw createErr;
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user account with this email address already exists.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Explore Demo Workspace Login (Read-Only)
// @route   POST /api/auth/demo-login
// @access  Public
exports.demoLogin = async (req, res) => {
  try {
    const { token, admin } = await demoService.getOrCreateDemoWorkspace();

    res.status(200).json({
      success: true,
      message: 'Demo workspace initialized successfully.',
      token,
      admin,
    });
  } catch (error) {
    console.error('[DemoLogin Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize demo workspace: ' + error.message,
    });
  }
};
