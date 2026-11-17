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
const del = (p, t) => httpRequest('DELETE', p, null, t);

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
  console.log('🛡️  AUTOGUARD DEMO LOGIN & READ-ONLY WORKSPACE VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Test 1: POST /api/auth/demo-login
  console.log('--- Test 1: Demo Login Authentication ---');
  const demoRes = await post('/api/auth/demo-login', {});
  assert(demoRes.status === 200, `POST /api/auth/demo-login responds with HTTP 200 (Got: ${demoRes.status})`);
  assert(demoRes.body?.success === true, 'Response indicates success: true');
  const demoToken = demoRes.body?.token;
  assert(!!demoToken, 'Valid JWT token returned for demo session');
  const demoAdmin = demoRes.body?.admin;
  assert(demoAdmin?.role === 'demo_user', `Role is strictly assigned as demo_user (Got: ${demoAdmin?.role})`);
  assert(demoAdmin?.isDemo === true, 'Admin profile contains isDemo: true flag');
  assert(demoAdmin?.company?.name === 'AutoGuard Demo Security Services', 'Company is AutoGuard Demo Security Services');
  assert(demoAdmin?.company?.isDemo === true, 'Company profile contains isDemo: true flag');

  // Test 2: Demo Workspace Read Access
  console.log('\n--- Test 2: Demo Workspace Read Access (Isolated Data) ---');
  const overview = await get('/api/dashboard/overview', demoToken);
  assert(overview.status === 200, `Demo user can access /api/dashboard/overview (Status: ${overview.status})`);
  assert(overview.body?.data?.totalCompanies === undefined || overview.body?.data?.totalCompanies === null, 'Platform totalCompanies metric is not exposed to demo user');
  assert(overview.body?.data?.totalGuards >= 3, `Demo dashboard reflects sample guards count (Count: ${overview.body?.data?.totalGuards})`);

  const guardsList = await get('/api/guards', demoToken);
  assert(guardsList.status === 200, `Demo user can list guards (Status: ${guardsList.status})`);
  assert(Array.isArray(guardsList.body?.data), 'Guards returned as array');
  assert(guardsList.body?.data?.length >= 3, `Demo workspace contains sample guards (Found: ${guardsList.body?.data?.length})`);
  const demoGuard = guardsList.body?.data?.[0];
  assert(demoGuard?.fullName?.includes('Demo'), `Demo guard clearly identified with sample tag: ${demoGuard?.fullName}`);

  const shiftsList = await get('/api/shifts', demoToken);
  assert(shiftsList.status === 200, `Demo user can list duty shifts (Status: ${shiftsList.status})`);
  assert(shiftsList.body?.data?.length >= 2, `Demo workspace contains sample shifts (Found: ${shiftsList.body?.data?.length})`);

  const sitesList = await get('/api/sites', demoToken);
  assert(sitesList.status === 200, `Demo user can list sites (Status: ${sitesList.status})`);

  const callsList = await get('/api/calls', demoToken);
  assert(callsList.status === 200, `Demo user can list call records (Status: ${callsList.status})`);

  // Test 3: Read-Only Enforcement (All write operations must be blocked)
  console.log('\n--- Test 3: Read-Only Enforcement (Mutation Rejection) ---');

  // 3.1 Attempt to create a guard
  const createGuardRes = await post('/api/guards', { fullName: 'Hacked Guard', mobileNumber: '+91 99999 99999' }, demoToken);
  assert(createGuardRes.status === 403, `POST /api/guards rejected with HTTP 403 Forbidden (Got: ${createGuardRes.status})`);
  assert(createGuardRes.body?.isDemo === true, 'Rejection response identifies isDemo: true');
  assert(createGuardRes.body?.message?.includes('Demo Mode'), 'Rejection message clearly explains demo read-only restrictions');

  // 3.2 Attempt to edit a guard
  const editGuardRes = await put(`/api/guards/${demoGuard._id}`, { fullName: 'Modified Guard Name' }, demoToken);
  assert(editGuardRes.status === 403, `PUT /api/guards/:id rejected with HTTP 403 Forbidden (Got: ${editGuardRes.status})`);

  // 3.3 Attempt to delete a guard
  const deleteGuardRes = await del(`/api/guards/${demoGuard._id}`, demoToken);
  assert(deleteGuardRes.status === 403, `DELETE /api/guards/:id rejected with HTTP 403 Forbidden (Got: ${deleteGuardRes.status})`);

  // 3.4 Attempt to create a shift
  const createShiftRes = await post('/api/shifts', { shiftName: 'Malicious Shift' }, demoToken);
  assert(createShiftRes.status === 403, `POST /api/shifts rejected with HTTP 403 Forbidden (Got: ${createShiftRes.status})`);

  // 3.5 Attempt to initiate a telephony call
  const callRes = await post('/api/calls/initiate', { guardId: demoGuard._id }, demoToken);
  assert(callRes.status === 403, `POST /api/calls/initiate rejected with HTTP 403 Forbidden (Got: ${callRes.status})`);

  // Test 4: Gating against Platform Administration & Real Company Data
  console.log('\n--- Test 4: Gating Against Platform Admin & Real Companies ---');

  // 4.1 Demo user cannot list platform companies
  const platformListRes = await get('/api/company/platform/companies', demoToken);
  assert(platformListRes.status === 403, `Demo user blocked from /api/company/platform/companies with HTTP 403 (Got: ${platformListRes.status})`);

  // 4.2 Demo user cannot add a company
  const addCompRes = await post('/api/company/platform/companies', { companyName: 'Unauthorized Corp' }, demoToken);
  assert(addCompRes.status === 403, `Demo user blocked from adding companies with HTTP 403 (Got: ${addCompRes.status})`);

  // 4.3 Demo user cannot access real company guard records by ID
  // Find a real company guard from database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect');
  const realGuard = await mongoose.connection.db.collection('guards').findOne({
    fullName: { $not: /Demo/ },
  });

  if (realGuard) {
    const crossGuardRes = await get(`/api/guards/${realGuard._id}`, demoToken);
    assert(crossGuardRes.status === 404, `Demo user cannot access real company guard by ID (HTTP 404 Isolated; Got: ${crossGuardRes.status})`);
  }
  await mongoose.disconnect();

  // Test 5: Verify Existing Logins Remain Fully Functional
  console.log('\n--- Test 5: Existing Authentication Behavior Preserved ---');
  const headAdminLogin = await post('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(headAdminLogin.status === 200, `Platform Head Admin login works normally (HTTP 200; Got: ${headAdminLogin.status})`);
  assert(headAdminLogin.body?.admin?.role === 'super_admin', 'Platform Head Admin role intact');

  const companyOwnerLogin = await post('/api/auth/login', {
    email: 'owner@secureshield.in',
    password: 'Owner@SecureShield2026',
  });
  assert(companyOwnerLogin.status === 200, `Company Owner login works normally (HTTP 200; Got: ${companyOwnerLogin.status})`);
  assert(companyOwnerLogin.body?.admin?.role === 'company_owner', 'Company Owner role intact');

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
