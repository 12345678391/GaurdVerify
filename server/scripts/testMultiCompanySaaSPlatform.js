require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const http = require('http');
const mongoose = require('mongoose');

const PORT = 5000;

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
  console.log('🛡️  AUTOGUARD MULTI-COMPANY SAAS PLATFORM VERIFICATION SUITE');
  console.log('========================================================================\n');

  // --- SECTION 1: PLATFORM OWNER / SUPER ADMIN ---
  console.log('--- Section 1: Platform Owner Central Management ---');

  const adminLoginRes = await post('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(adminLoginRes.status === 200, 'Platform Owner logs in successfully via common /api/auth/login');
  assert(adminLoginRes.body?.admin?.role === 'super_admin', 'Role confirmed as super_admin');
  const platformToken = adminLoginRes.body?.token;
  assert(!!platformToken, 'Platform Admin token received');

  // Fetch all companies with operational summaries
  const companiesRes = await get('/api/company/platform/companies', platformToken);
  assert(companiesRes.status === 200, 'Platform Owner lists all companies via /api/company/platform/companies');
  assert(Array.isArray(companiesRes.body?.data), 'Companies returned as array');
  assert(companiesRes.body?.data?.length >= 2, `Multiple companies registered on platform (Count: ${companiesRes.body?.data?.length})`);

  // Verify operational summary fields exist
  const firstComp = companiesRes.body?.data?.[0];
  assert(firstComp?.guardsCount !== undefined, 'Company record includes guardsCount operational metric');
  assert(firstComp?.sitesCount !== undefined, 'Company record includes sitesCount operational metric');
  assert(firstComp?.shiftsCount !== undefined, 'Company record includes shiftsCount operational metric');
  assert(firstComp?.supervisorsCount !== undefined, 'Company record includes supervisorsCount operational metric');
  assert(firstComp?.callsCount !== undefined, 'Company record includes callsCount operational metric');

  // --- SECTION 2: COMPANY ONBOARDING ---
  console.log('\n--- Section 2: Independent Company Onboarding ---');

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testNewEmail = `saas-owner-${uniqueSuffix}@ironcladsecurity.in`;
  const testNewCompanyCode = `IC-${uniqueSuffix}`;

  const onboardingPayload = {
    companyName: `IronClad Protection Services ${uniqueSuffix}`,
    registrationNumber: `CIN-U74999DL2026PTC${uniqueSuffix}`,
    contactPerson: 'Major Devender Singh',
    officialEmail: testNewEmail,
    contactNumber: '+91 98111 88776',
    officeAddress: 'Level 4, DLF Horizon Tower, Golf Course Road',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122002',
    status: 'active',
    initialPassword: 'IronCladOwner@2026!',
    companyCode: testNewCompanyCode,
  };

  const createRes = await post('/api/company/platform/companies', onboardingPayload, platformToken);
  assert(createRes.status === 201, `Platform Owner creates new company (HTTP 201; Status: ${createRes.status})`);
  assert(createRes.body?.success === true, 'Response indicates success: true');
  assert(createRes.body?.message?.includes('registered successfully'), 'Clear success message returned');
  const createdCompany = createRes.body?.company;
  assert(createdCompany?.name === onboardingPayload.companyName, 'Company Name matches');
  assert(createdCompany?.code === testNewCompanyCode, `Company unique identifier assigned: ${createdCompany?.code}`);
  assert(createdCompany?.owner?.email === testNewEmail, 'Initial Company Owner account created and linked');
  assert(createdCompany?.owner?.role === 'company_owner', 'Owner role is company_owner');

  // Verify in MongoDB: password is never in plaintext and mustChangePassword is true
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect');
  const db = mongoose.connection.db;
  const ownerDbRecord = await db.collection('admins').findOne({ email: testNewEmail });
  assert(ownerDbRecord !== null, 'Owner admin document verified in MongoDB');
  assert(ownerDbRecord.password !== 'IronCladOwner@2026!', 'Owner password is cryptographically hashed');
  assert(ownerDbRecord.password.startsWith('$2'), 'Bcrypt hash format verified ($2a$ / $2b$)');
  assert(ownerDbRecord.mustChangePassword === true, 'mustChangePassword flag is true on first creation');
  assert(ownerDbRecord.companyId.toString() === createdCompany.id.toString(), 'Owner account bound to company ID');

  // Test duplicate prevention
  const duplicateRes = await post('/api/company/platform/companies', onboardingPayload, platformToken);
  assert(duplicateRes.status === 409, `Duplicate email registration rejected with HTTP 409 Conflict (Got: ${duplicateRes.status})`);

  // --- SECTION 3: COMPANY OWNER LOGIN & WORKSPACE ---
  console.log('\n--- Section 3: Company Owner Authentication & Workspace ---');

  const ownerLoginRes = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'IronCladOwner@2026!',
  });
  assert(ownerLoginRes.status === 200, 'Company Owner logs in successfully via common /api/auth/login');
  assert(ownerLoginRes.body?.admin?.mustChangePassword === true, 'Owner session signals mustChangePassword: true');
  const ownerToken = ownerLoginRes.body?.token;

  // Change password workflow
  const changePassRes = await post(
    '/api/auth/change-password',
    {
      currentPassword: 'IronCladOwner@2026!',
      newPassword: 'IronCladPermanent@2026#',
      confirmPassword: 'IronCladPermanent@2026#',
    },
    ownerToken
  );
  assert(changePassRes.status === 200, 'Owner completes mandatory first-time password change');

  // Log in with new permanent password
  const permLoginRes = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'IronCladPermanent@2026#',
  });
  assert(permLoginRes.status === 200, 'Owner logs in with permanent password');
  const permOwnerToken = permLoginRes.body?.token;
  assert(permLoginRes.body?.admin?.mustChangePassword === false, 'mustChangePassword is now false');

  // Verify Owner Workspace Management
  const ownerGuards = await get('/api/guards', permOwnerToken);
  assert(ownerGuards.status === 200, 'Owner can access Guard Management');
  assert(ownerGuards.body?.data?.length === 0, 'New company starts with empty, clean, isolated guard roster');

  const ownerShifts = await get('/api/shifts', permOwnerToken);
  assert(ownerShifts.status === 200, 'Owner can access Shift Management');

  const ownerSites = await get('/api/sites', permOwnerToken);
  assert(ownerSites.status === 200, 'Owner can access Site Management');

  const ownerCalls = await get('/api/calls', permOwnerToken);
  assert(ownerCalls.status === 200, 'Owner can access Call Records');

  const ownerDashboard = await get('/api/dashboard/overview', permOwnerToken);
  assert(ownerDashboard.status === 200, 'Owner can access Centralized Dashboard Overview');
  assert(ownerDashboard.body?.data?.totalCompanies === undefined, 'Owner dashboard does NOT expose platform company counts');

  // Owner cannot access platform administration
  const ownerAccessPlatform = await get('/api/company/platform/companies', permOwnerToken);
  assert(ownerAccessPlatform.status === 403, 'Company Owner blocked from Platform Company Management (HTTP 403)');

  // --- SECTION 4: COMPANY STATUS & LIFECYCLE MANAGEMENT ---
  console.log('\n--- Section 4: Suspend, Reactivate & Password Reset ---');

  // Suspend company
  const suspendRes = await patch(`/api/company/platform/companies/${createdCompany.id}/status`, { status: 'suspended' }, platformToken);
  assert(suspendRes.status === 200, 'Platform Owner suspends company');

  // Suspended company owner login rejected
  const blockedLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'IronCladPermanent@2026#',
  });
  assert(blockedLogin.status === 403, 'Suspended company owner is immediately blocked from logging in (HTTP 403)');

  // Reactivate company
  const reactivateRes = await patch(`/api/company/platform/companies/${createdCompany.id}/status`, { status: 'active' }, platformToken);
  assert(reactivateRes.status === 200, 'Platform Owner reactivates company');

  const unblockedLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'IronCladPermanent@2026#',
  });
  assert(unblockedLogin.status === 200, 'Reactivated company owner logs in successfully');

  // Secure password reset by Platform Owner
  const resetPassRes = await post(
    `/api/company/platform/companies/${createdCompany.id}/reset-password`,
    { password: 'PlatformResetPassword@2026!' },
    platformToken
  );
  assert(resetPassRes.status === 200, 'Platform Owner securely resets company owner password');

  // Verify new password works
  const resetLogin = await post('/api/auth/login', {
    email: testNewEmail,
    password: 'PlatformResetPassword@2026!',
  });
  assert(resetLogin.status === 200, 'Owner logs in with reset password');

  // Clean up test company records from MongoDB
  await db.collection('admins').deleteOne({ _id: ownerDbRecord._id });
  await db.collection('companies').deleteOne({ _id: new mongoose.Types.ObjectId(createdCompany.id) });
  await mongoose.disconnect();
  console.log('   Test company and owner records cleaned up cleanly from database.');

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
