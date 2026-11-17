const Company = require('../models/Company');
const Admin = require('../models/Admin');
const { logAudit } = require('../middleware/audit');

// @desc    Get Current Company Settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    let company = null;
    if (req.companyId) {
      company = await Company.findById(req.companyId);
    } else if (req.isSuperAdmin) {
      company = await Company.findOne();
      if (!company) {
        return res.status(200).json({
          success: true,
          data: {
            name: 'AutoGuard Platform Administration',
            email: req.admin?.email || 'headadmin@autoguard.com',
            phone: '+91 98110 98110',
            city: 'Gurugram',
            state: 'Haryana',
            address: 'Cyber City Phase 2',
            pincode: '122002',
            settings: {
              timezone: 'Asia/Kolkata',
              dateFormat: 'DD/MM/YYYY',
              verificationIntervalMinutes: 30,
              retryIntervalMinutes: 5,
              maxRetryAttempts: 2,
              supervisorAlerts: true,
              missedCallAlerts: true,
              assistanceAlerts: true,
            },
          },
        });
      }
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company settings not found.' });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Company & Call Settings
// @route   PUT /api/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      logoUrl,
      settings,
    } = req.body;

    let company = null;
    if (req.companyId) {
      company = await Company.findById(req.companyId);
    } else if (req.isSuperAdmin) {
      company = await Company.findOne();
    }

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    if (name) company.name = name;
    if (phone) company.phone = phone;
    if (email) company.email = email;
    if (address) company.address = address;
    if (city) company.city = city;
    if (state) company.state = state;
    if (pincode) company.pincode = pincode;
    if (logoUrl !== undefined) company.logoUrl = logoUrl;

    if (settings) {
      company.settings = {
        ...company.settings.toObject(),
        ...settings,
      };
    }

    await company.save();
    await logAudit(req, 'SETTINGS_UPDATE', 'Settings', company._id, 'Company configuration & call settings updated.');

    res.status(200).json({
      success: true,
      message: 'System settings saved successfully.',
      data: company,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Admin Profile & Password
// @route   PUT /api/settings/admin-profile
// @access  Private
exports.updateAdminProfile = async (req, res) => {
  try {
    const { fullName, phone, currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);

    if (fullName) admin.fullName = fullName;
    if (phone) admin.phone = phone;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.',
        });
      }
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password does not match.',
        });
      }
      admin.password = newPassword;
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully.',
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
