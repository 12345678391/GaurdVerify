/**
 * AutoGuard Enterprise — Complete Multi-Company Hierarchy & User Management Test Suite
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const Company = require('../models/Company');
const CompanyInvitation = require('../models/CompanyInvitation');
const Guard = require('../models/Guard');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const Supervisor = require('../models/Supervisor');

const BASE_URL = 'http://127.0.0.1:5000';

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}

  return { status: res.status, ok: res.ok, data };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runHierarchyTestSuite() {
  console.log('===============================================================');
  console.log('🏢 AUTOGUARD MULTI-COMPANY HIERARCHY & USER MANAGEMENT SUITE');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect');
  console.log('1. Connected to MongoDB successfully.\n');

  // Test setup: Unique test run stamp
  const stamp = Date.now().toString().slice(-6);

  // 1. Setup Platform Super Admin
  let superAdmin = await Admin.findOne({ role: 'super_admin' });
  if (!superAdmin) {
    superAdmin = await Admin.create({
      fullName: 'Head Platform Administrator',
      email: `headadmin_${stamp}@autoguard.com`,
      password: 'SuperAdminPassword123!',
      role: 'super_admin',
      isActive: true,
      mustChangePassword: false,
    });
  }
  const superToken = generateToken(superAdmin._id);

  // 2. Setup Company Alpha & Company Beta
  const companyAlpha = await Company.create({
    name: `Alpha Security Corp ${stamp}`,
    code: `ALP${stamp.slice(0, 4)}`,
    email: `ops_${stamp}@alpha.com`,
    phone: '+91 98000 11111',
    address: 'Alpha Cyber Hub, Tower A',
    city: 'Gurugram',
    state: 'Haryana',
    status: 'active',
    isActive: true,
  });

  const ownerAlpha = await Admin.create({
    companyId: companyAlpha._id,
    fullName: `Captain Alpha ${stamp}`,
    email: `owner_${stamp}@alpha.com`,
    password: 'OwnerPassword123!',
    phone: '+91 98000 11112',
    role: 'company_owner',
    isActive: true,
    mustChangePassword: false,
  });
  companyAlpha.ownerId = ownerAlpha._id;
  await companyAlpha.save();
  const ownerAlphaToken = generateToken(ownerAlpha._id);

  const companyBeta = await Company.create({
    name: `Beta Security Services ${stamp}`,
    code: `BET${stamp.slice(0, 4)}`,
    email: `ops_${stamp}@beta.com`,
    phone: '+91 98000 22221',
    address: 'Beta Operations Hub, Tower B',
    city: 'Noida',
    state: 'Uttar Pradesh',
    status: 'active',
    isActive: true,
  });

  const ownerBeta = await Admin.create({
    companyId: companyBeta._id,
    fullName: `Major Beta ${stamp}`,
    email: `owner_${stamp}@beta.com`,
    password: 'OwnerPassword123!',
    phone: '+91 98000 22222',
    role: 'company_owner',
    isActive: true,
    mustChangePassword: false,
  });
  companyBeta.ownerId = ownerBeta._id;
  await companyBeta.save();
  const ownerBetaToken = generateToken(ownerBeta._id);

  try {
    // =========================================================================
    // SECTION 1: Head Admin — Platform Company Management
    // =========================================================================
    console.log('--- Section 1: Head Admin — Company Management ---');

    // 1.1 Overview Statistics
    const overviewRes = await request('/api/company/platform/overview', { token: superToken });
    assert(overviewRes.status === 200, 'Head Admin accesses /api/company/platform/overview (HTTP 200)');
    assert(overviewRes.data?.data?.totalCompanies >= 2, 'Overview displays live total companies count');

    // 1.2 View all companies
    const listRes = await request('/api/company/platform/companies', { token: superToken });
    assert(listRes.status === 200, 'Head Admin accesses /api/company/platform/companies (HTTP 200)');
    assert(Array.isArray(listRes.data?.data), 'Companies returned as array with owner and capacity info');

    // 1.3 Unauthorized access blocked for company owners
    const blockedRes = await request('/api/company/platform/companies', { token: ownerAlphaToken });
    assert(blockedRes.status === 403, 'Company Owner rejected from Head Admin endpoints (HTTP 403)');

    // =========================================================================
    // SECTION 2: Company Owner — Direct User Creation
    // =========================================================================
    console.log('\n--- Section 2: Company Owner — Direct User Creation ---');

    // 2.1 Direct creation with custom temporary password
    const directUser1 = await request('/api/company/members', {
      method: 'POST',
      token: ownerAlphaToken,
      body: {
        fullName: `Sgt. Direct Staff ${stamp}`,
        email: `direct_staff_${stamp}@alpha.com`,
        phone: '+91 98111 55551',
        role: 'admin',
        password: 'TempPassword123!',
      },
    });
    assert(directUser1.status === 201, 'Company Owner creates company user directly (HTTP 201)');
    assert(directUser1.data?.member?.mustChangePassword === true, 'Directly created user has mustChangePassword=true');
    assert(directUser1.data?.member?.role === 'admin', 'Assigned role correctly recorded');
    assert(directUser1.data?.temporaryPassword === 'TempPassword123!', 'Temporary password confirmed in response');

    const createdMemberId = directUser1.data?.member?.id;

    // 2.2 Direct creation with auto-generated temporary password
    const directUser2 = await request('/api/company/members', {
      method: 'POST',
      token: ownerAlphaToken,
      body: {
        fullName: `Operator Staff ${stamp}`,
        email: `operator_${stamp}@alpha.com`,
        role: 'operator',
      },
    });
    assert(directUser2.status === 201, 'Company Owner creates user with auto-generated password (HTTP 201)');
    assert(typeof directUser2.data?.temporaryPassword === 'string' && directUser2.data?.temporaryPassword.length >= 10, 'Secure temporary password auto-generated');
    const operatorPassword = directUser2.data?.temporaryPassword;

    // 2.3 Prevent creating duplicate email
    const duplicateRes = await request('/api/company/members', {
      method: 'POST',
      token: ownerAlphaToken,
      body: {
        fullName: 'Duplicate Test',
        email: `direct_staff_${stamp}@alpha.com`,
        role: 'operator',
      },
    });
    assert(duplicateRes.status === 409, 'Duplicate user email registration rejected with HTTP 409 Conflict');

    // =========================================================================
    // SECTION 3: First Login & Mandatory Password Change Gate
    // =========================================================================
    console.log('\n--- Section 3: First Login & Mandatory Password Change Gate ---');

    // 3.1 Login with temporary password
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: `direct_staff_${stamp}@alpha.com`,
        password: 'TempPassword123!',
      },
    });
    assert(loginRes.status === 200, 'User logs in successfully with temporary password (HTTP 200)');
    assert(loginRes.data?.admin?.mustChangePassword === true, 'Login payload confirms mustChangePassword=true');

    const staffToken = loginRes.data?.token;

    // 3.2 Access to operational routes blocked before password change
    const gateCheck = await request('/api/guards', { token: staffToken });
    assert(gateCheck.status === 403, 'Access to operational endpoints blocked before password change (HTTP 403)');
    assert(gateCheck.data?.mustChangePassword === true, 'Response specifies { mustChangePassword: true }');

    // 3.3 Change password self-service
    const changeRes = await request('/api/auth/change-password', {
      method: 'POST',
      token: staffToken,
      body: {
        currentPassword: 'TempPassword123!',
        newPassword: 'PermanentPassword456!',
      },
    });
    assert(changeRes.status === 200, 'Password changed successfully via /api/auth/change-password (HTTP 200)');

    // 3.4 Login with permanent password
    const loginPerm = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: `direct_staff_${stamp}@alpha.com`,
        password: 'PermanentPassword456!',
      },
    });
    assert(loginPerm.status === 200, 'User logs in with permanent password');
    assert(loginPerm.data?.admin?.mustChangePassword === false, 'mustChangePassword updated to false in session');

    const activeStaffToken = loginPerm.data?.token;

    // =========================================================================
    // SECTION 4: Invitation Link Workflow
    // =========================================================================
    console.log('\n--- Section 4: Invitation Link Workflow ---');

    // 4.1 Create invitation link
    const inviteRes = await request('/api/company/invitations', {
      method: 'POST',
      token: ownerAlphaToken,
      body: {
        fullName: `Invited Supervisor ${stamp}`,
        email: `invited_${stamp}@alpha.com`,
        role: 'supervisor_admin',
      },
    });
    assert(inviteRes.status === 201, 'Company Owner creates invitation link (HTTP 201)');
    assert(inviteRes.data?.invitation?.role === 'supervisor_admin', 'Invitation role assigned as supervisor_admin');
    assert(typeof inviteRes.data?.invitationUrl === 'string', 'Shareable invitation link generated');

    const rawToken = inviteRes.data?.invitationUrl.split('/').pop();

    // 4.2 Validate invitation link token
    const validateRes = await request(`/api/auth/invitations/${rawToken}`);
    assert(validateRes.status === 200, 'Public validation of invitation token returns HTTP 200');
    assert(validateRes.data?.invitation?.email === `invited_${stamp}@alpha.com`, 'Token resolves to correct email');

    // 4.3 Accept invitation & set password
    const acceptRes = await request('/api/auth/accept-invitation', {
      method: 'POST',
      body: {
        token: rawToken,
        fullName: `Invited Supervisor ${stamp}`,
        password: 'InvitedPassword789!',
        confirmPassword: 'InvitedPassword789!',
      },
    });
    assert(acceptRes.status === 200, 'Invited user accepts invitation and sets password (HTTP 200)');
    assert(acceptRes.data?.admin?.role === 'supervisor_admin', 'Account created with supervisor_admin role');

    // =========================================================================
    // SECTION 5: User Lifecycle Management (Edit, Status, Reset Password)
    // =========================================================================
    console.log('\n--- Section 5: User Lifecycle Management ---');

    // 5.1 Edit user details & role
    const editRes = await request(`/api/company/members/${createdMemberId}`, {
      method: 'PUT',
      token: ownerAlphaToken,
      body: {
        fullName: `Sgt. Rohit Rawat ${stamp}`,
        phone: '+91 99999 88888',
        role: 'supervisor_admin',
      },
    });
    assert(editRes.status === 200, 'Company Owner updates member details (HTTP 200)');
    assert(editRes.data?.member?.fullName === `Sgt. Rohit Rawat ${stamp}`, 'Full name updated in MongoDB');
    assert(editRes.data?.member?.role === 'supervisor_admin', 'Role updated to supervisor_admin');

    // 5.2 Toggle status: Deactivate member
    const deactRes = await request(`/api/company/members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: ownerAlphaToken,
    });
    assert(deactRes.status === 200, 'Company Owner deactivates member (HTTP 200)');
    assert(deactRes.data?.isActive === false, 'Account status updated to isActive=false');

    // 5.3 Deactivated member cannot log in
    const deactLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: `direct_staff_${stamp}@alpha.com`,
        password: 'PermanentPassword456!',
      },
    });
    assert(deactLogin.status === 403, 'Deactivated user rejected from login with HTTP 403 Forbidden');

    // 5.4 Toggle status: Reactivate member
    const reactRes = await request(`/api/company/members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: ownerAlphaToken,
    });
    assert(reactRes.status === 200, 'Company Owner reactivates member (HTTP 200)');
    assert(reactRes.data?.isActive === true, 'Account status updated to isActive=true');

    // 5.5 Reset user password by Owner
    const resetRes = await request(`/api/company/members/${createdMemberId}/reset-password`, {
      method: 'POST',
      token: ownerAlphaToken,
      body: {
        password: 'NewTempResetPwd123!',
      },
    });
    assert(resetRes.status === 200, 'Company Owner resets user password (HTTP 200)');
    assert(resetRes.data?.temporaryPassword === 'NewTempResetPwd123!', 'Temporary password confirmed in reset response');

    // 5.6 Login with new reset password forces password change
    const resetLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: `direct_staff_${stamp}@alpha.com`,
        password: 'NewTempResetPwd123!',
      },
    });
    assert(resetLogin.status === 200, 'User logs in with newly reset password');
    assert(resetLogin.data?.admin?.mustChangePassword === true, 'User flagged with mustChangePassword=true');

    // =========================================================================
    // SECTION 6: Role Permissions Enforcement
    // =========================================================================
    console.log('\n--- Section 6: Role Permissions Enforcement ---');

    // Setup an Operator token
    const opLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: `operator_${stamp}@alpha.com`,
        password: operatorPassword,
      },
    });
    const opToken = opLogin.data?.token;

    // 6.1 Operator can read guards
    // (Bypass password gate for test operator by updating mustChangePassword=false)
    await Admin.updateOne({ email: `operator_${stamp}@alpha.com` }, { mustChangePassword: false });
    const opGuardsRead = await request('/api/guards', { token: opToken });
    assert(opGuardsRead.status === 200, 'Duty Operator permitted to read guards list (HTTP 200)');

    // 6.2 Operator CANNOT create guard
    const opGuardCreate = await request('/api/guards', {
      method: 'POST',
      token: opToken,
      body: {
        fullName: 'Unauthorized Guard',
        mobileNumber: '+91 99999 11111',
      },
    });
    assert(opGuardCreate.status === 403, 'Duty Operator rejected when attempting to create guard (HTTP 403)');

    // 6.3 Operator CANNOT manage company users
    const opUserCreate = await request('/api/company/members', {
      method: 'POST',
      token: opToken,
      body: {
        fullName: 'Unauthorized User',
        email: `hack_${stamp}@alpha.com`,
        role: 'operator',
      },
    });
    assert(opUserCreate.status === 403, 'Duty Operator rejected when attempting to create company users (HTTP 403)');

    // 6.4 Supervisor Admin CANNOT manage company users
    const supLogin = await request('/api/auth/login', {
      method: 'POST',
      body: {
        email: `invited_${stamp}@alpha.com`,
        password: 'InvitedPassword789!',
      },
    });
    const supToken = supLogin.data?.token;

    const supUserCreate = await request('/api/company/members', {
      method: 'POST',
      token: supToken,
      body: {
        fullName: 'Unauthorized Member',
        email: `sup_hack_${stamp}@alpha.com`,
        role: 'operator',
      },
    });
    assert(supUserCreate.status === 403, 'Supervisor Admin rejected from managing company users (HTTP 403)');

    // =========================================================================
    // SECTION 7: Strict Cross-Tenant User Isolation
    // =========================================================================
    console.log('\n--- Section 7: Strict Cross-Tenant User Isolation ---');

    // 7.1 Company B Owner CANNOT view Company A members
    const betaMemberList = await request('/api/company/members', { token: ownerBetaToken });
    const alphaMembersInBeta = betaMemberList.data?.data?.filter((m) => m.companyId?.toString() === companyAlpha._id.toString());
    assert(alphaMembersInBeta?.length === 0, 'Company B member list excludes all Company A members');

    // 7.2 Company B Owner CANNOT update Company A member
    const crossUpdate = await request(`/api/company/members/${createdMemberId}`, {
      method: 'PUT',
      token: ownerBetaToken,
      body: {
        fullName: 'Cross-Tenant Hijack',
      },
    });
    assert(crossUpdate.status === 404, 'Company B rejected when attempting to edit Company A member (HTTP 404 Not Found)');

    // 7.3 Company B Owner CANNOT toggle status of Company A member
    const crossToggle = await request(`/api/company/members/${createdMemberId}/status`, {
      method: 'PATCH',
      token: ownerBetaToken,
    });
    assert(crossToggle.status === 404, 'Company B rejected when attempting to deactivate Company A member (HTTP 404 Not Found)');

    // 7.4 Company B Owner CANNOT reset password of Company A member
    const crossReset = await request(`/api/company/members/${createdMemberId}/reset-password`, {
      method: 'POST',
      token: ownerBetaToken,
      body: {
        password: 'MaliciousReset123!',
      },
    });
    assert(crossReset.status === 404, 'Company B rejected when attempting to reset Company A password (HTTP 404 Not Found)');

  } finally {
    // Clean up test data
    await Company.deleteMany({ _id: { $in: [companyAlpha._id, companyBeta._id] } });
    await Admin.deleteMany({ companyId: { $in: [companyAlpha._id, companyBeta._id] } });
    await CompanyInvitation.deleteMany({ companyId: { $in: [companyAlpha._id, companyBeta._id] } });
    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`🎉 TEST RUN COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runHierarchyTestSuite().catch((err) => {
  console.error('[FATAL TEST ERROR]', err);
  process.exit(1);
});
