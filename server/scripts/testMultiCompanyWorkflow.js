require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 5055; // Use dedicated test port
let mongodProc = null;
let serverInstance = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest(method, pathName, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {};
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: pathName,
        method,
        headers,
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const post = (p, b, t) => httpRequest('POST', p, b, t);
const get = (p, t) => httpRequest('GET', p, null, t);
const put = (p, b, t) => httpRequest('PUT', p, b, t);
const patch = (p, b, t) => httpRequest('PATCH', p, b, t);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🛡️  AUTOGUARD SINGLE LOGIN & MULTI-COMPANY MANAGEMENT VERIFICATION TEST');
  console.log('========================================================================\n');

  // 1. Start MongoDB if not already listening
  const mongodPath = 'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';
  const dbPath = 'C:\\GuardVerify\\data\\db';

  console.log('1. Starting / Connecting to MongoDB...');
  mongodProc = spawn(mongodPath, ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1']);

  mongodProc.stdout.on('data', (d) => {
    // console.log('[mongod]', d.toString());
  });

  mongodProc.stderr.on('data', (d) => {
    console.error('[mongod err]', d.toString());
  });

  mongodProc.on('error', (err) => {
    console.error('[mongod spawn error]', err);
  });

  mongodProc.on('exit', (code) => {
    console.log('[mongod exited with code]', code);
  });

  // Wait for MongoDB to be responsive
  let connected = false;
  for (let i = 0; i < 20; i++) {
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/guardconnect', { serverSelectionTimeoutMS: 1000 });
      connected = true;
      break;
    } catch (err) {
      await sleep(500);
    }
  }

  if (!connected) {
    console.error('Failed to connect to MongoDB. Aborting.');
    if (mongodProc) mongodProc.kill();
    process.exit(1);
  }
  console.log('   MongoDB connection established.\n');

  // 2. Start Express Server
  console.log('2. Starting AutoGuard Express Application...');
  const express = require('express');
  const cors = require('cors');

  const authRoutes = require('../routes/authRoutes');
  const guardRoutes = require('../routes/guardRoutes');
  const siteRoutes = require('../routes/siteRoutes');
  const shiftRoutes = require('../routes/shiftRoutes');
  const supervisorRoutes = require('../routes/supervisorRoutes');
  const callRoutes = require('../routes/callRoutes');
  const attendanceRoutes = require('../routes/attendanceRoutes');
  const dashboardRoutes = require('../routes/dashboardRoutes');
  const notificationRoutes = require('../routes/notificationRoutes');
  const settingsRoutes = require('../routes/settingsRoutes');
  const companyRoutes = require('../routes/companyRoutes');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/guards', guardRoutes);
  app.use('/api/sites', siteRoutes);
  app.use('/api/shifts', shiftRoutes);
  app.use('/api/supervisors', supervisorRoutes);
  app.use('/api/calls', callRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/company', companyRoutes);

  await new Promise((resolve) => {
    serverInstance = app.listen(PORT, resolve);
  });
  console.log(`   Express test instance listening on port ${PORT}.\n`);

  // Ensure head admin and seed data exist
  const Admin = require('../models/Admin');
  const Company = require('../models/Company');

  let headAdmin = await Admin.findOne({ email: 'headadmin@autoguard.com' });
  if (!headAdmin) {
    headAdmin = await Admin.create({
      fullName: 'Vikrant Malhotra (Head Admin)',
      email: 'headadmin@autoguard.com',
      password: 'Admin@AutoGuard2026',
      role: 'super_admin',
      isActive: true,
      companyId: null,
    });
  } else {
    headAdmin.password = 'Admin@AutoGuard2026';
    headAdmin.isActive = true;
    await headAdmin.save();
  }

  let testCompA = await Company.findOne({ code: 'SECURESHIELD' });
  if (!testCompA) {
    testCompA = await Company.create({
      name: 'SecureShield Solutions Pvt Ltd',
      code: 'SECURESHIELD',
      email: 'operations@secureshield.in',
      phone: '+91 98765 43210',
      address: 'Tower 4, DLF Cyber City, Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
      status: 'active',
      isActive: true,
    });
  }

  let compAOwner = await Admin.findOne({ email: 'owner@secureshield.in' });
  if (!compAOwner) {
    compAOwner = await Admin.create({
      companyId: testCompA._id,
      fullName: 'Rajiv Mehra',
      email: 'owner@secureshield.in',
      password: 'Owner@SecureShield2026',
      phone: '+91 98110 12345',
      role: 'company_owner',
      isActive: true,
    });
    testCompA.ownerId = compAOwner._id;
    await testCompA.save();
  } else {
    compAOwner.password = 'Owner@SecureShield2026';
    compAOwner.isActive = true;
    await compAOwner.save();
  }

  // =========================================================================
  // TEST SUITE 1: SINGLE LOGIN PAGE
  // =========================================================================
  console.log('--- Test Suite 1: Single Common Login Page ---');
  let platformAdminToken = null;
  let companyOwnerToken = null;

  // 1.1 Platform Admin Login
  const loginRes1 = await post('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(loginRes1.status === 200, 'Platform Administrator logs in successfully via common /api/auth/login');
  assert(loginRes1.body?.admin?.role === 'super_admin', 'Platform Administrator role is preserved (super_admin)');
  platformAdminToken = loginRes1.body?.token;
  assert(!!platformAdminToken, 'JWT token returned for Platform Administrator session');

  // 1.2 Company Owner Login via EXACT SAME endpoint
  const loginRes2 = await post('/api/auth/login', {
    email: 'owner@secureshield.in',
    password: 'Owner@SecureShield2026',
  });
  assert(loginRes2.status === 200, 'Company Owner logs in successfully via common /api/auth/login');
  assert(loginRes2.body?.admin?.role === 'company_owner', 'Company Owner role is preserved (company_owner)');
  assert(loginRes2.body?.admin?.company?.name === 'SecureShield Solutions Pvt Ltd', 'Company Owner correctly bound to their company');
  companyOwnerToken = loginRes2.body?.token;
  assert(!!companyOwnerToken, 'JWT token returned for Company Owner session');

  // 1.3 Invalid password rejected
  const badLogin = await post('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'WrongPassword123!',
  });
  assert(badLogin.status === 401, 'Invalid password correctly rejected with 401');

  // =========================================================================
  // TEST SUITE 2: DASHBOARD ACCESS FOR BOTH ROLES
  // =========================================================================
  console.log('\n--- Test Suite 2: Dashboard Overview & Role Adaptation ---');
  const dashPlatform = await get('/api/dashboard/overview', platformAdminToken);
  assert(dashPlatform.status === 200, 'Platform Administrator can access /api/dashboard/overview');
  assert(dashPlatform.body?.data?.totalCompanies >= 1, 'Platform Admin dashboard contains totalCompanies metric');

  const dashCompany = await get('/api/dashboard/overview', companyOwnerToken);
  assert(dashCompany.status === 200, 'Company Owner can access /api/dashboard/overview');
  assert(dashCompany.body?.data?.totalCompanies === undefined, 'Company Owner dashboard does not expose platform-level company metrics');

  // =========================================================================
  // TEST SUITE 3: COMPANY MANAGEMENT (ADD, LIST, SEARCH, DETAILS, EDIT, STATUS)
  // =========================================================================
  console.log('\n--- Test Suite 3: Company Management (Platform Administrator) ---');

  // 3.1 Fetch Company List
  const listRes = await get('/api/company/platform/companies', platformAdminToken);
  assert(listRes.status === 200, 'Platform Administrator can list companies via /api/company/platform/companies');
  assert(Array.isArray(listRes.body?.data), 'Companies returned as an array');

  // 3.2 Add Company with All Required Form Fields
  const uniqueCode = `TS-${Date.now().toString().slice(-4)}`;
  const testNewEmail = `contact-${Date.now()}@titanshield.in`;
  const addCompanyPayload = {
    companyName: 'Titan Shield Security Pvt Ltd',
    registrationNumber: 'CIN-U74999DL2026PTC123456',
    contactPerson: 'Vikramaditya Oberoi',
    officialEmail: testNewEmail,
    contactNumber: '+91 98110 55443',
    officeAddress: 'Level 5, DLF Cyber Park',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122002',
    status: 'active',
    initialPassword: 'TitanOwner@2026!',
    companyCode: uniqueCode,
  };

  const addRes = await post('/api/company/platform/companies', addCompanyPayload, platformAdminToken);
  assert(addRes.status === 201, `Platform Administrator can Add Company (Status: ${addRes.status})`);
  const createdCompany = addRes.body?.company;
  assert(createdCompany?.name === 'Titan Shield Security Pvt Ltd', 'Created company name matches');
  assert(createdCompany?.code === uniqueCode, `Unique company ID generated: ${createdCompany?.code}`);
  assert(createdCompany?.registrationNumber === 'CIN-U74999DL2026PTC123456', 'Registration number saved permanently in MongoDB');
  assert(createdCompany?.contactPerson === 'Vikramaditya Oberoi', 'Contact person saved permanently in MongoDB');
  assert(createdCompany?.owner?.email === testNewEmail, 'Initial Company Owner account created and linked');

  // Verify in MongoDB that password is NEVER stored in plaintext
  const ownerInDb = await Admin.findById(createdCompany.owner.id);
  assert(ownerInDb !== null, 'Owner admin document verified in MongoDB');
  assert(ownerInDb.password !== 'TitanOwner@2026!', 'Owner password is cryptographically hashed (not plaintext)');
  assert(ownerInDb.password.startsWith('$2'), 'Bcrypt hash format verified');

  // 3.3 Newly Created Company Owner Login via Common Login Page
  const newOwnerLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'TitanOwner@2026!',
  });
  assert(newOwnerLogin.status === 200, 'Newly registered Company Owner logs in via common login page successfully');
  const newOwnerToken = newOwnerLogin.body?.token;
  assert(!!newOwnerToken, 'New Company Owner receives active JWT token');

  // 3.4 View Company Details
  const viewRes = await get(`/api/company/platform/companies/${createdCompany.id}`, platformAdminToken);
  assert(viewRes.status === 200, 'Platform Administrator can view company details by ID');
  assert(viewRes.body?.data?.registrationNumber === 'CIN-U74999DL2026PTC123456', 'Company details include registrationNumber');
  assert(viewRes.body?.data?.contactPerson === 'Vikramaditya Oberoi', 'Company details include contactPerson');

  // 3.5 Edit Company Details
  const editPayload = {
    companyName: 'Titan Shield Global Security Services',
    registrationNumber: 'CIN-U74999DL2026PTC999999',
    contactPerson: 'Vikramaditya Oberoi (MD)',
    contactNumber: '+91 98110 99999',
    officeAddress: 'Level 6, Tower B, Cyber Park',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122002',
    status: 'active',
  };

  const editRes = await put(`/api/company/platform/companies/${createdCompany.id}`, editPayload, platformAdminToken);
  assert(editRes.status === 200, 'Platform Administrator can edit company details via PUT');
  assert(editRes.body?.company?.name === 'Titan Shield Global Security Services', 'Updated company name verified');
  assert(editRes.body?.company?.registrationNumber === 'CIN-U74999DL2026PTC999999', 'Updated registration number verified');

  // 3.6 Activate / Deactivate Company
  const suspendRes = await patch(`/api/company/platform/companies/${createdCompany.id}/status`, { status: 'suspended' }, platformAdminToken);
  assert(suspendRes.status === 200, 'Platform Administrator can suspend / deactivate company');

  // Verify that suspended company owner login is blocked immediately
  const blockedLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'TitanOwner@2026!',
  });
  assert(blockedLogin.status === 403, 'Suspended company owner is immediately blocked from logging in (HTTP 403)');

  // Reactivate company
  const reactivateRes = await patch(`/api/company/platform/companies/${createdCompany.id}/status`, { status: 'active' }, platformAdminToken);
  assert(reactivateRes.status === 200, 'Platform Administrator can reactivate company');

  // Verify owner can log in again
  const unblockedLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'TitanOwner@2026!',
  });
  assert(unblockedLogin.status === 200, 'Reactivated company owner can log in again successfully');

  // 3.7 Set / Reset Owner Password Securely
  const resetPassRes = await post(`/api/company/platform/companies/${createdCompany.id}/reset-password`, {
    password: 'NewTitanPassword@2026!',
  }, platformAdminToken);
  assert(resetPassRes.status === 200, 'Platform Administrator can securely reset company owner password');

  // Verify login with old password fails
  const oldPassLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'TitanOwner@2026!',
  });
  assert(oldPassLogin.status === 401, 'Old password fails after reset');

  // Verify login with new password succeeds
  const newPassLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'NewTitanPassword@2026!',
  });
  assert(newPassLogin.status === 200, 'Login with new reset password succeeds');

  let titanOwnerToken = newPassLogin.body?.token;
  if (newPassLogin.body?.admin?.mustChangePassword) {
    const changePassRes = await post('/api/auth/change-password', {
      currentPassword: 'NewTitanPassword@2026!',
      newPassword: 'FinalTitanPassword@2026!',
      confirmPassword: 'FinalTitanPassword@2026!',
    }, titanOwnerToken);
    if (changePassRes.body?.token) {
      titanOwnerToken = changePassRes.body.token;
    }
  }

  // =========================================================================
  // TEST SUITE 4: MULTI-COMPANY DATA ISOLATION
  // =========================================================================
  console.log('\n--- Test Suite 4: Multi-Company Data Isolation ---');

  // 4.1 Company Owner CANNOT access Platform Admin endpoints
  const companyOwnerAccessPlatform = await get('/api/company/platform/companies', companyOwnerToken);
  assert(companyOwnerAccessPlatform.status === 403, 'Company Owner blocked from Company Management API (HTTP 403 Forbidden)');

  const companyOwnerAddCompany = await post('/api/company/platform/companies', { name: 'Unauthorized Corp' }, companyOwnerToken);
  assert(companyOwnerAddCompany.status === 403, 'Company Owner blocked from adding companies (HTTP 403 Forbidden)');

  // 4.2 Guard Registration in Company A
  const Guard = require('../models/Guard');
  const guardPayloadA = {
    fullName: 'Ramesh Singh',
    mobileNumber: '+91 98101 23456',
    fatherName: 'Harish Singh',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122001',
    designation: 'Security Guard',
    emergencyContactNumber: '+91 98101 00000',
    identityDocType: 'Aadhaar Card',
  };

  const guardResA = await post('/api/guards', guardPayloadA, companyOwnerToken);
  assert(guardResA.status === 201, 'Company A owner registers guard successfully');
  const guardA = guardResA.body?.data;
  assert(guardA?.companyId?.toString() === testCompA._id.toString(), 'Guard A associated with Company A in MongoDB');

  // 4.3 Company B Owner attempts to access Company A's guard
  const crossAccessGuard = await get(`/api/guards/${guardA._id}`, titanOwnerToken);
  assert(crossAccessGuard.status === 404, 'Company B cannot access Company A guard by ID (HTTP 404 Not Found - Isolated)');

  // 4.4 Company B attempts to edit Company A's guard
  const crossEditGuard = await put(`/api/guards/${guardA._id}`, { fullName: 'Hacked Name' }, titanOwnerToken);
  assert(crossEditGuard.status === 404, 'Company B cannot edit Company A guard (HTTP 404 Not Found - Isolated)');

  // 4.5 Verify Guard A in MongoDB was NOT modified
  const verifyGuardA = await Guard.findById(guardA._id);
  assert(verifyGuardA.fullName === 'Ramesh Singh', 'Guard A record remains intact and unmodified');

  // 4.6 List guards for Company B: must NOT contain Company A's guard
  const listGuardsB = await get('/api/guards', titanOwnerToken);
  const guardIdsB = (listGuardsB.body?.data || []).map((g) => g._id);
  assert(!guardIdsB.includes(guardA._id.toString()), 'Company B guards list does not contain Company A guard');

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  // Clean up
  if (serverInstance) serverInstance.close();
  await mongoose.disconnect();
  if (mongodProc) mongodProc.kill();

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  if (serverInstance) serverInstance.close();
  if (mongodProc) mongodProc.kill();
  process.exit(1);
});
