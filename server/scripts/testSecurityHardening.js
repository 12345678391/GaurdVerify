const http = require('http');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Site = require('../models/Site');
const Supervisor = require('../models/Supervisor');

function postJson(reqPath, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: reqPath,
        method: 'POST',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function putJson(reqPath, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: reqPath,
        method: 'PUT',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(reqPath, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: reqPath,
        method: 'GET',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runHardeningTests() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD PHASE 4: SECURITY HARDENING VERIFICATION SUITE');
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

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect');

  // --- Step 1: Alias Login for Existing Head Admin ---
  console.log('--- Test 1: Alias Login for Existing Head Admin ---');
  const headAdminLoginRes = await postJson('/api/auth/login', {
    email: 'vikrant@autoguardsecurity.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(headAdminLoginRes.status === 200, `Head Admin logs in via alias email (HTTP 200)`);
  assert(headAdminLoginRes.body.admin?.role === 'super_admin', `Role is super_admin`);
  const headAdminToken = headAdminLoginRes.body.token;

  // --- Step 2: Primary Email vs Existing Account's Alias Collision ---
  console.log('\n--- Test 2: Primary Email vs Existing Alias Collision ---');
  // Attempt to register a company whose ownerEmail matches Head Admin's alias
  const collisionRegRes = await postJson('/api/auth/register-company', {
    companyName: 'Collision Security Corp',
    companyEmail: 'ops@collision.test',
    city: 'Jaipur',
    state: 'Rajasthan',
    ownerName: 'Imposter Admin',
    ownerEmail: 'vikrant@autoguardsecurity.com',
    password: 'Password@123',
  });
  assert(
    collisionRegRes.status === 409,
    `Registering with an email that is an existing alias is rejected with HTTP 409 (Got: ${collisionRegRes.status})`
  );

  // Attempt to create platform company whose owner matches Head Admin's alias
  const platformCollisionRes = await postJson(
    '/api/company/platform/companies',
    {
      companyName: 'Platform Collision Security',
      companyEmail: 'ops@platcollision.test',
      city: 'Gurugram',
      state: 'Haryana',
      ownerName: 'Imposter Admin',
      ownerEmail: 'vikrant@autoguardsecurity.com',
      password: 'Password@123',
    },
    headAdminToken
  );
  assert(
    platformCollisionRes.status === 409,
    `Platform company creation with owner email matching existing alias is rejected with HTTP 409 (Got: ${platformCollisionRes.status})`
  );

  // --- Step 3: Duplicate Alias Email Rejection (Sparse Unique Index) ---
  console.log('\n--- Test 3: Duplicate Alias Email Rejection ---');
  const existingHeadAdmin = await Admin.findOne({ email: 'headadmin@autoguard.com' });
  assert(
    existingHeadAdmin && existingHeadAdmin.aliasEmail === 'vikrant@autoguardsecurity.com',
    `Existing Head Admin aliasEmail confirmed: ${existingHeadAdmin?.aliasEmail}`
  );

  // Attempt to directly create an admin document with a duplicate aliasEmail
  let duplicateIndexError = false;
  try {
    await Admin.create({
      fullName: 'Rogue Admin',
      email: 'rogue@autoguard.test',
      aliasEmail: 'vikrant@autoguardsecurity.com',
      password: 'Password@123',
      role: 'super_admin',
    });
  } catch (err) {
    if (err.code === 11000) {
      duplicateIndexError = true;
    }
  }
  assert(
    duplicateIndexError === true,
    `Direct creation with duplicate aliasEmail rejected by MongoDB E11000 duplicate key error`
  );

  // Clean up any test rogue admin if accidentally created
  await Admin.deleteOne({ email: 'rogue@autoguard.test' });

  // --- Step 4: Failed Login Does Not Log Password-Derived Information ---
  console.log('\n--- Test 4: Failed Login Does Not Log Password-Derived Information ---');
  // Inspect the authController.js file contents to ensure no [Login401Diag] or password leaks
  const fs = require('fs');
  const authControllerSrc = fs.readFileSync(path.join(__dirname, '../controllers/authController.js'), 'utf8');
  assert(!authControllerSrc.includes('[Login401Diag]'), `authController.js does not contain [Login401Diag]`);
  assert(!authControllerSrc.includes('firstCharCode'), `authController.js does not contain firstCharCode`);
  assert(!authControllerSrc.includes('lastCharCode'), `authController.js does not contain lastCharCode`);
  assert(!authControllerSrc.includes('isAutoGuard2026'), `authController.js does not contain hardcoded password checks`);

  // Perform a failed login call to ensure clean HTTP 401
  const badLoginRes = await postJson('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'WrongPassword123!',
  });
  assert(badLoginRes.status === 401, `Failed login returns HTTP 401 cleanly`);
  assert(badLoginRes.body.message === 'Invalid email or password.', `Message is generic and non-leaking`);

  // --- Step 5: Site Update Cannot Change companyId ---
  console.log('\n--- Test 5: Site Update Cannot Change companyId ---');
  const ownerALoginRes = await postJson('/api/auth/login', {
    email: 'owner@secureshield.in',
    password: 'Owner@SecureShield2026',
  });
  assert(ownerALoginRes.status === 200, `Company A Owner authenticated`);
  const ownerAToken = ownerALoginRes.body.token;
  const companyAId = ownerALoginRes.body.admin?.company?._id || ownerALoginRes.body.admin?.company;

  const ownerBLoginRes = await postJson('/api/auth/login', {
    email: 'amit@primesecurity.test',
    password: 'PrimeOwner@2026!',
  });
  assert(ownerBLoginRes.status === 200, `Company B Owner authenticated`);
  const companyBId = ownerBLoginRes.body.admin?.company?._id || ownerBLoginRes.body.admin?.company;

  // Create a site for Company A
  const siteRes = await postJson(
    '/api/sites',
    {
      siteName: 'Security Testing Site Alpha',
      address: 'Sector 44, Tech Zone',
      city: 'Gurugram',
      state: 'Haryana',
    },
    ownerAToken
  );
  assert(siteRes.status === 201, `Site created for Company A (HTTP 201)`);
  const testSiteId = siteRes.body.data._id;

  // Attempt to tamper companyId via PUT /api/sites/:id
  const tamperRes = await putJson(
    `/api/sites/${testSiteId}`,
    {
      siteName: 'Tamper Attempt Site',
      companyId: String(companyBId),
    },
    ownerAToken
  );
  assert(tamperRes.status === 200, `Update request processed (HTTP 200)`);

  const reloadedSite = await Site.findById(testSiteId);
  assert(
    String(reloadedSite.companyId) === String(companyAId),
    `Site companyId remains strictly locked to Company A (${companyAId}), tampered companyId ignored`
  );
  assert(reloadedSite.siteName === 'Tamper Attempt Site', `Valid field (siteName) updated successfully`);

  // --- Step 6: Cross-Company Supervisor Assignment Rejected ---
  console.log('\n--- Test 6: Cross-Company Supervisor Assignment Rejected ---');
  // Find a supervisor belonging to Company A
  const companyASupervisor = await Supervisor.findOne({ companyId: companyAId, isDeleted: false });
  assert(Boolean(companyASupervisor), `Company A supervisor found: ${companyASupervisor?.fullName}`);

  // Create a site for Company B
  const siteBRes = await postJson(
    '/api/sites',
    {
      siteName: 'Prime Site Beta',
      address: 'Sector 29, Cyber City',
      city: 'Gurugram',
      state: 'Haryana',
    },
    ownerBLoginRes.body.token
  );
  assert(siteBRes.status === 201, `Site created for Company B (HTTP 201)`);
  const testSiteBId = siteBRes.body.data._id;

  // Company B Owner attempts to assign Company A's supervisor in site update
  const crossAssignUpdateRes = await putJson(
    `/api/sites/${testSiteBId}`,
    {
      assignedSupervisor: String(companyASupervisor._id),
    },
    ownerBLoginRes.body.token
  );
  assert(
    crossAssignUpdateRes.status === 400,
    `Cross-company supervisor assignment in site update rejected (HTTP 400: ${crossAssignUpdateRes.body.message})`
  );

  // Company B Owner attempts to assign Company A's supervisor in site creation
  const crossAssignCreateRes = await postJson(
    '/api/sites',
    {
      siteName: 'Illicit Supervisor Site',
      address: 'Sector 55, Illicit Zone',
      city: 'Gurugram',
      assignedSupervisor: String(companyASupervisor._id),
    },
    ownerBLoginRes.body.token
  );
  assert(
    crossAssignCreateRes.status === 400,
    `Cross-company supervisor assignment in site creation rejected (HTTP 400: ${crossAssignCreateRes.body.message})`
  );

  // Clean up test sites
  await Site.deleteOne({ _id: testSiteId });
  await Site.deleteOne({ _id: testSiteBId });

  // --- Step 7: Application Refuses to Start Without JWT_SECRET ---
  console.log('\n--- Test 7: Application Refusal Without JWT_SECRET ---');
  const startupCheck = await new Promise((resolve) => {
    const child = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        JWT_SECRET: '', // Missing secret
      },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });

  assert(startupCheck.code === 1, `Process exited with code 1 when JWT_SECRET is missing`);
  assert(
    startupCheck.stderr.includes('[FATAL] JWT_SECRET') || startupCheck.stdout.includes('[FATAL] JWT_SECRET'),
    `Process output fatal missing secret error without printing any secret`
  );

  // --- Step 8: Multi-Tenant Data Isolation Remains Intact ---
  console.log('\n--- Test 8: Tenant Isolation Integrity ---');
  const companyASites = await getJson('/api/sites', ownerAToken);
  assert(companyASites.status === 200, `Company A can list its own sites`);
  assert(
    companyASites.body.data.every((s) => String(s.companyId) === String(companyAId)),
    `All returned sites belong strictly to Company A`
  );

  await mongoose.disconnect();

  console.log('\n=====================================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('=====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
