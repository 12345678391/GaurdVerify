const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Company = require('../models/Company');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource. Please log in.',
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration error: JWT_SECRET is not configured.',
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or is deactivated.',
      });
    }

    // Force password change check
    if (admin.mustChangePassword) {
      const allowedPaths = ['/change-password', '/me', '/logout'];
      const currentPath = req.originalUrl || req.url || '';
      const isAllowed = allowedPaths.some((p) => currentPath.includes(p));
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          mustChangePassword: true,
          message: 'Password change is required before accessing system resources.',
        });
      }
    }

    // Level 1: Platform Super Admin & Platform Admin
    if (admin.role === 'super_admin' || admin.role === 'platform_admin') {
      req.admin = admin;
      req.companyId = null;
      req.isSuperAdmin = true;
      return next();
    }

    // Level 2: Company Admin / Staff - Validate Company Status
    if (!admin.companyId) {
      return res.status(403).json({
        success: false,
        message: 'No security agency is associated with this administrator account.',
      });
    }

    const company = await Company.findById(admin.companyId);
    if (!company || company.isActive === false || company.status === 'suspended' || company.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your company account has been suspended or deactivated. Please contact platform administration.',
      });
    }

    req.admin = admin;
    req.company = company;
    req.companyId = company._id;

    // Level 3: Demo Read-Only Enforcement
    if (admin.isDemo || admin.role === 'demo_user' || company.isDemo) {
      req.isDemo = true;
      const safePaths = ['/logout', '/me'];
      const currentPath = req.originalUrl || req.url || '';
      const isSafeAuthPath = safePaths.some((p) => currentPath.includes(p));
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isSafeAuthPath) {
        return res.status(403).json({
          success: false,
          isDemo: true,
          message: 'Demo Mode: All write operations (create, edit, delete, suspend) are disabled in the read-only demo workspace.',
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed or expired. Please sign in again.',
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.admin?.role || 'Guest'} is not authorized to perform this operation.`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
