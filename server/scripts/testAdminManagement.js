require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

function httpRequest(method, path, body = null, token = null) {
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
        path,
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

const postJson = (path, body, token) => httpRequest('POST', path, body, token);
const getJson = (path, token) => httpRequest('GET', path, null, token);
const patchJson = (path, body, token) => httpRequest('PATCH', path, body, token);

async function runTests() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD PLATFORM ADMIN & COMPANY ADMIN MANAGEMENT TEST SUITE');
  console.log('=====================================================================\n');

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

  try {
    // Direct MongoDB connection for ground truth inspection
    await mongoose.connect(process.env.MONGODB_URI);
    const Admin = require('../models/Admin');
    const Company = require('../models/Company');

    // Clean up any previous test accounts
    const testPlatformEmail = 'test.platform.admin@autoguard.test';
    const testCompanyEmail = 'test.company.admin@primesecurity.test';
    await Admin.deleteMany({ email: { $in: [testPlatformEmail, testCompanyEmail] } });

    // Step 1: Main Admin Login
    console.log('--- Step 1: Main Admin Authentication ---');
    const loginRes = await postJson('/api/auth/login', {
      email: 'headadmin@autoguard.com',
      password: 'Admin@AutoGuard2026',
    });
    assert(loginRes.status === 200, `Main Admin authenticated (HTTP 200)`);
    assert(loginRes.body.admin?.role === 'super_admin', `Role is super_admin`);
    const headAdminToken = loginRes.body.token;

    // Step 2: Main Admin creates a Platform Admin
    console.log('\n--- Step 2: Main Admin Creates Platform Admin ---');
    const createPlatRes = await postJson(
      '/api/company/platform/admins',
      {
        fullName: 'Arjun Platform Admin',
        email: testPlatformEmail,
        role: 'platform_admin',
        phone: '9876543210',
      },
      headAdminToken
    );
    assert(createPlatRes.status === 201, `Platform Admin created (HTTP 201)`);
    assert(Boolean(createPlatRes.body.temporaryPassword), `Temporary password returned in creation response`);
    const platTempPassword = createPlatRes.body.temporaryPassword;
    assert(platTempPassword.length >= 8, `Temporary password satisfies minimum length requirement`);
    assert(createPlatRes.body.admin?.mustChangePassword === true, `mustChangePassword is true in response`);

    // Ground truth DB inspection
    const platAdminDb = await Admin.findOne({ email: testPlatformEmail });
    assert(Boolean(platAdminDb), `Platform Admin record exists in MongoDB`);
    assert(platAdminDb.role === 'platform_admin', `Role in MongoDB is strictly 'platform_admin'`);
    assert(platAdminDb.companyId === null, `companyId is null for Platform Admin`);
    assert(platAdminDb.mustChangePassword === true, `mustChangePassword is true in MongoDB`);

    // Step 3: Verify Passwords Stored as Bcrypt Hash (Not Plaintext)
    console.log('\n--- Step 3: Bcrypt Cryptographic Storage Verification ---');
    assert(
      platAdminDb.password !== platTempPassword,
      `Password in DB is NOT plaintext (Never stores plaintext)`
    );
    assert(
      platAdminDb.password.startsWith('$2a$') || platAdminDb.password.startsWith('$2b$'),
      `Password in DB is valid bcrypt hash: ${platAdminDb.password.substring(0, 15)}...`
    );
    const bcrypt = require('bcryptjs');
    const hashMatches = await bcrypt.compare(platTempPassword, platAdminDb.password);
    assert(hashMatches === true, `Bcrypt compare succeeds for generated temporary password`);

    // Step 4: Newly created Platform Admin logs in with temporary password
    console.log('\n--- Step 4: Platform Admin First Login with Temporary Password ---');
    const platLoginRes = await postJson('/api/auth/login', {
      email: testPlatformEmail,
      password: platTempPassword,
    });
    assert(platLoginRes.status === 200, `Platform Admin logged in with temporary password (HTTP 200)`);
    assert(platLoginRes.body.admin?.mustChangePassword === true, `Login response flags mustChangePassword: true`);
    const platToken = platLoginRes.body.token;

    // Step 5: Normal dashboard endpoints BLOCKED until password is changed
    console.log('\n--- Step 5: Dashboard Access Blocked While mustChangePassword === true ---');
    const blockedRes = await getJson('/api/company/platform/overview', platToken);
    assert(blockedRes.status === 403, `Access blocked with HTTP 403 (Got: ${blockedRes.status})`);
    assert(blockedRes.body.mustChangePassword === true, `Response contains mustChangePassword: true`);

    // Step 6: Platform Admin Changes Temporary Password
    console.log('\n--- Step 6: Platform Admin Changes Password ---');
    const newPlatPassword = 'NewSecurePlatform@2026!';
    const changePlatRes = await postJson(
      '/api/auth/change-password',
      {
        currentPassword: platTempPassword,
        newPassword: newPlatPassword,
      },
      platToken
    );
    assert(changePlatRes.status === 200, `Password changed successfully (HTTP 200)`);
    assert(changePlatRes.body.admin?.mustChangePassword === false, `mustChangePassword now false in response`);

    // Check DB
    const platAdminDbUpdated = await Admin.findOne({ email: testPlatformEmail });
    assert(platAdminDbUpdated.mustChangePassword === false, `mustChangePassword is false in MongoDB`);
    const newHashMatches = await bcrypt.compare(newPlatPassword, platAdminDbUpdated.password);
    assert(newHashMatches === true, `New permanent password verified via bcrypt`);

    // Step 7: Platform Admin logs in with NEW permanent password & accesses platform
    console.log('\n--- Step 7: Platform Admin Access with Permanent Password ---');
    const platLoginRes2 = await postJson('/api/auth/login', {
      email: testPlatformEmail,
      password: newPlatPassword,
    });
    assert(platLoginRes2.status === 200, `Platform Admin logged in with new permanent password`);
    assert(platLoginRes2.body.admin?.mustChangePassword === false, `mustChangePassword is false`);
    const platActiveToken = platLoginRes2.body.token;

    // Now platform overview should be accessible!
    const overviewRes = await getJson('/api/company/platform/overview', platActiveToken);
    assert(overviewRes.status === 200, `Platform overview now accessible (HTTP 200)`);

    // Step 8: Platform Admin creates a Company Admin
    console.log('\n--- Step 8: Platform Admin Creates Company Admin ---');
    // Get active company
    const primeCompany = await Company.findOne({ status: 'active' });
    assert(Boolean(primeCompany), `Found active company: ${primeCompany?.name} (${primeCompany?._id})`);

    const createCompAdminRes = await postJson(
      '/api/company/platform/admins',
      {
        fullName: 'Rohan Company Admin',
        email: testCompanyEmail,
        role: 'company_admin',
        companyId: primeCompany._id.toString(),
        phone: '9876500000',
      },
      platActiveToken
    );
    assert(createCompAdminRes.status === 201, `Company Admin created by Platform Admin (HTTP 201)`);
    assert(Boolean(createCompAdminRes.body.temporaryPassword), `Company Admin temporary password returned`);
    const compTempPassword = createCompAdminRes.body.temporaryPassword;
    assert(createCompAdminRes.body.admin?.mustChangePassword === true, `mustChangePassword is true`);

    const compAdminDb = await Admin.findOne({ email: testCompanyEmail });
    assert(Boolean(compAdminDb), `Company Admin record exists in MongoDB`);
    assert(compAdminDb.role === 'company_admin', `Role in MongoDB is strictly 'company_admin'`);
    assert(
      compAdminDb.companyId.toString() === primeCompany._id.toString(),
      `Company Admin companyId strictly matches target company`
    );

    // Step 9: Company Admin logs in and changes temporary password
    console.log('\n--- Step 9: Company Admin First Login & Password Change ---');
    const compLoginRes = await postJson('/api/auth/login', {
      email: testCompanyEmail,
      password: compTempPassword,
    });
    assert(compLoginRes.status === 200, `Company Admin logged in with temporary password`);
    assert(compLoginRes.body.admin?.mustChangePassword === true, `mustChangePassword is true`);
    const compToken = compLoginRes.body.token;

    const newCompPassword = 'CompanyAdminPass@2026!';
    const changeCompRes = await postJson(
      '/api/auth/change-password',
      {
        currentPassword: compTempPassword,
        newPassword: newCompPassword,
      },
      compToken
    );
    assert(changeCompRes.status === 200, `Company Admin password changed (HTTP 200)`);

    const compLoginRes2 = await postJson('/api/auth/login', {
      email: testCompanyEmail,
      password: newCompPassword,
    });
    assert(compLoginRes2.status === 200, `Company Admin logged in with permanent password`);
    const compActiveToken = compLoginRes2.body.token;

    // Step 10: Company Admin CANNOT access Platform Admin routes
    console.log('\n--- Step 10: Company Admin Blocked from Platform Admin Routes ---');
    const compBlockedOverview = await getJson('/api/company/platform/overview', compActiveToken);
    assert(
      compBlockedOverview.status === 403,
      `Company Admin blocked from /api/company/platform/overview (HTTP 403 Forbidden)`
    );

    const compBlockedAdmins = await getJson('/api/company/platform/admins', compActiveToken);
    assert(
      compBlockedAdmins.status === 403,
      `Company Admin blocked from /api/company/platform/admins (HTTP 403 Forbidden)`
    );

    const compBlockedCreate = await postJson(
      '/api/company/platform/admins',
      {
        fullName: 'Hacker Admin',
        email: 'hacker@test.com',
        role: 'platform_admin',
      },
      compActiveToken
    );
    assert(
      compBlockedCreate.status === 403,
      `Company Admin blocked from creating platform admins (HTTP 403 Forbidden)`
    );

    // Step 11: Company Admin CANNOT access another company's data
    console.log('\n--- Step 11: Company Admin Scoped Exclusively to Own Company ---');
    const guardsRes = await getJson('/api/guards', compActiveToken);
    assert(guardsRes.status === 200, `Company Admin retrieved guard list`);
    const returnedGuards = guardsRes.body.data || [];
    const allBelongToOwnCompany = returnedGuards.every(
      (g) => (g.companyId?._id || g.companyId || '').toString() === primeCompany._id.toString()
    );
    assert(
      allBelongToOwnCompany === true,
      `All returned guards (${returnedGuards.length}) belong strictly to Company Admin's company`
    );

    // Step 12: Duplicate email registration is rejected
    console.log('\n--- Step 12: Duplicate Email Registration Rejection ---');
    const dupRes = await postJson(
      '/api/company/platform/admins',
      {
        fullName: 'Duplicate Admin',
        email: testPlatformEmail,
        role: 'platform_admin',
      },
      headAdminToken
    );
    assert(dupRes.status === 409, `Duplicate email rejected with HTTP 409 Conflict`);
    assert(
      dupRes.body.message.includes('already exists'),
      `Duplicate error message confirms: "${dupRes.body.message}"`
    );

    // Step 13: Unauthorized users cannot create administrator accounts
    console.log('\n--- Step 13: Unauthorized Administrator Creation Blocked ---');
    const unauthRes = await postJson('/api/company/platform/admins', {
      fullName: 'No Auth Admin',
      email: 'noauth@test.com',
      role: 'platform_admin',
    });
    assert(unauthRes.status === 401, `Unauthenticated request rejected with HTTP 401 Unauthorized`);

    // Step 14: Platform Admin Toggles Company Admin Status
    console.log('\n--- Step 14: Toggle Administrator Active/Inactive Status ---');
    const toggleRes = await patchJson(
      `/api/company/platform/admins/${compAdminDb._id}/status`,
      {},
      platActiveToken
    );
    assert(toggleRes.status === 200, `Administrator status toggled (HTTP 200)`);
    assert(toggleRes.body.admin?.isActive === false, `Admin is now deactivated`);

    // Verify deactivated login fails
    const deactLogin = await postJson('/api/auth/login', {
      email: testCompanyEmail,
      password: newCompPassword,
    });
    assert(deactLogin.status === 403 || deactLogin.status === 401, `Deactivated administrator login rejected with HTTP 403/401 (Got: ${deactLogin.status})`);

    // Reactivate
    const reactivateRes = await patchJson(
      `/api/company/platform/admins/${compAdminDb._id}/status`,
      {},
      platActiveToken
    );
    assert(reactivateRes.status === 200, `Administrator reactivated`);
    assert(reactivateRes.body.admin?.isActive === true, `Admin is now active again`);

    // Step 15: Platform Admin Resets Company Admin Password
    console.log('\n--- Step 15: Administrator Password Reset ---');
    const resetRes = await postJson(
      `/api/company/platform/admins/${compAdminDb._id}/reset-password`,
      {},
      platActiveToken
    );
    assert(resetRes.status === 200, `Password reset initiated (HTTP 200)`);
    assert(Boolean(resetRes.body.temporaryPassword), `New temporary password generated`);
    const newResetTempPassword = resetRes.body.temporaryPassword;

    // Login with reset temporary password
    const resetLoginRes = await postJson('/api/auth/login', {
      email: testCompanyEmail,
      password: newResetTempPassword,
    });
    assert(resetLoginRes.status === 200, `Company Admin logged in with reset temporary password`);
    assert(resetLoginRes.body.admin?.mustChangePassword === true, `mustChangePassword is true again`);

    console.log('\n=====================================================================');
    console.log(`📊 TEST RESULTS: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('=====================================================================\n');

    await Admin.deleteMany({ email: { $in: [testPlatformEmail, testCompanyEmail] } });
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
