const express = require('express');
const router = express.Router();
const {
  createInvitation,
  getInvitations,
  revokeInvitation,
  getCompanyMembers,
  createCompanyMember,
  updateCompanyMember,
  toggleCompanyMemberStatus,
  resetCompanyMemberPassword,
  getPlatformOverview,
  getPlatformCompanies,
  getPlatformCompanyById,
  createPlatformCompany,
  updatePlatformCompany,
  updatePlatformCompanyStatus,
  managePlatformCompanyOwner,
  resetCompanyOwnerPassword,
} = require('../controllers/companyController');
const {
  getPlatformAdmins,
  createPlatformAdminAccount,
  toggleAdminStatus,
  resetAdminPassword,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All company routes require authentication
router.use(protect);

// =========================================================================
// LEVEL 1: HEAD ADMIN & PLATFORM ADMIN ROUTES
// Strictly restricted to super_admin and platform_admin roles
// =========================================================================
router.get('/platform/overview', authorize('super_admin', 'platform_admin'), getPlatformOverview);
router.get('/platform/companies', authorize('super_admin', 'platform_admin'), getPlatformCompanies);
router.get('/platform/companies/:id', authorize('super_admin', 'platform_admin'), getPlatformCompanyById);
router.post('/platform/companies', authorize('super_admin', 'platform_admin'), createPlatformCompany);
router.put('/platform/companies/:id', authorize('super_admin', 'platform_admin'), updatePlatformCompany);
router.patch('/platform/companies/:id', authorize('super_admin', 'platform_admin'), updatePlatformCompany);
router.patch('/platform/companies/:id/status', authorize('super_admin', 'platform_admin'), updatePlatformCompanyStatus);
router.post('/platform/companies/:id/owner', authorize('super_admin', 'platform_admin'), managePlatformCompanyOwner);
router.post('/platform/companies/:id/reset-password', authorize('super_admin', 'platform_admin'), resetCompanyOwnerPassword);

// Platform Admin & Company Admin Management
router.get('/platform/admins', authorize('super_admin', 'platform_admin'), getPlatformAdmins);
router.post('/platform/admins', authorize('super_admin', 'platform_admin'), createPlatformAdminAccount);
router.patch('/platform/admins/:id/status', authorize('super_admin', 'platform_admin'), toggleAdminStatus);
router.post('/platform/admins/:id/reset-password', authorize('super_admin', 'platform_admin'), resetAdminPassword);

// =========================================================================
// LEVEL 2: COMPANY TENANT ROUTES
// Invitation management (strictly restricted to company_owner, admin)
// =========================================================================
router
  .route('/invitations')
  .post(authorize('company_owner', 'super_admin', 'admin'), createInvitation)
  .get(authorize('company_owner', 'super_admin', 'admin'), getInvitations);

router
  .route('/invitations/:id')
  .delete(authorize('company_owner', 'super_admin', 'admin'), revokeInvitation);

// Company Member & Staff Management (Restricted to company_owner, company_admin, admin, super_admin)
router
  .route('/members')
  .get(getCompanyMembers)
  .post(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), createCompanyMember);

router
  .route('/members/:id')
  .put(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), updateCompanyMember);

router
  .route('/members/:id/status')
  .patch(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), toggleCompanyMemberStatus);

router
  .route('/members/:id/reset-password')
  .post(authorize('company_owner', 'company_admin', 'admin', 'super_admin'), resetCompanyMemberPassword);

module.exports = router;
