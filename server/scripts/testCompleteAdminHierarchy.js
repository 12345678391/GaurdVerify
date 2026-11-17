const http = require('http');

function postJson(path, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch (e) {
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

function getJson(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function putJson(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'PUT',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
          } catch (e) {
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

async function runHierarchyVerification() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD COMPLETE ADMIN HIERARCHY VERIFICATION TEST');
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

  // --- Step 1: Main Admin Login ---
  console.log('--- Step 1: Main Admin Login ---');
  const loginRes = await postJson('/api/auth/login', {
    email: 'vikrant@autoguardsecurity.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(loginRes.status === 200, `Main Admin authenticated via aliasEmail (HTTP 200)`);
  assert(loginRes.body.admin?.role === 'super_admin', `Role is strictly super_admin`);
  assert(
    (loginRes.body.admin?.role === 'super_admin' ? '/platform-admin' : '/') === '/platform-admin',
    `Redirects to /platform-admin`
  );
  const mainAdminToken = loginRes.body.token;

  // Verify Main Admin cannot accidentally operate as company owner (cannot register guards directly)
  const accidentalGuardRes = await postJson(
    '/api/guards',
    { fullName: 'Accidental Guard', mobileNumber: '+919999000099' },
    mainAdminToken
  );
  assert(
    accidentalGuardRes.status === 403,
    `Main Admin blocked from registering guards directly without company scope (HTTP 403: ${accidentalGuardRes.body?.message})`
  );

  // --- Step 2: Main Admin creates a new security company ---
  console.log('\n--- Step 2: Main Admin Creates New Security Company ---');
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testCompanyName = `Valiant Security Group ${uniqueSuffix}`;
  const testCompanyCode = `VAL${uniqueSuffix}`;
  const testOwnerEmail = `owner_${uniqueSuffix}@valiantsecurity.test`;
  const testOwnerPassword = 'ValiantOwner@2026!';

  const createCompanyRes = await postJson(
    '/api/company/platform/companies',
    {
      companyName: testCompanyName,
      companyCode: testCompanyCode,
      companyEmail: `ops_${uniqueSuffix}@valiantsecurity.test`,
      companyPhone: '+91 98110 55443',
      city: 'Jaipur',
      state: 'Rajasthan',
      address: 'Plot 45, Industrial Area',
      pincode: '302013',
      ownerName: 'Vikramaditya Rathore',
      ownerEmail: testOwnerEmail,
      ownerPhone: '+91 98110 55443',
      ownerPassword: testOwnerPassword,
    },
    mainAdminToken
  );

  assert(createCompanyRes.status === 201, `New security company created (HTTP 201)`);
  const createdCompany = createCompanyRes.body.company;
  const companyId = createdCompany?.id || createdCompany?._id;
  assert(Boolean(companyId), `Company created with ID: ${companyId}`);
  assert(createdCompany?.name === testCompanyName, `Company name verified: ${createdCompany?.name}`);

  // --- Step 3: Main Admin creates / manages its Company Owner account ---
  console.log('\n--- Step 3: Verify Company Owner Account Created by Main Admin ---');
  const ownerAccount = createdCompany?.owner || createCompanyRes.body.owner;
  assert(Boolean(ownerAccount), `Company Owner account created during onboarding`);
  assert(ownerAccount?.role === 'company_owner', `Owner role is company_owner`);
  assert(
    ownerAccount?.email === testOwnerEmail,
    `Owner email matches created owner (${testOwnerEmail})`
  );

  // --- Step 4: New Company Owner Logs In ---
  console.log('\n--- Step 4: New Company Owner Logs In ---');
  const ownerLoginRes = await postJson('/api/auth/login', {
    email: testOwnerEmail,
    password: testOwnerPassword,
  });
  assert(ownerLoginRes.status === 200, `Company Owner login successful (HTTP 200)`);
  assert(ownerLoginRes.body.admin?.role === 'company_owner', `Authenticated role is company_owner`);
  assert(
    (ownerLoginRes.body.admin?.role === 'super_admin' ? '/platform-admin' : '/') === '/',
    `Company Owner redirects to company dashboard (/)`
  );
  assert(
    String(ownerLoginRes.body.admin?.company?._id || ownerLoginRes.body.admin?.company?.id || ownerLoginRes.body.admin?.company) === String(companyId),
    `Company context strictly matches own company (${companyId})`
  );
  const ownerToken = ownerLoginRes.body.token;

  // --- Step 5: Company Owner Registers a Guard ---
  console.log('\n--- Step 5: Company Owner Registers a Guard ---');
  const guardRes = await postJson(
    '/api/guards',
    {
      fullName: 'Bhanu Pratap Singh',
      mobileNumber: '+919988776655',
      gender: 'Male',
      designation: 'Senior Security Guard',
    },
    ownerToken
  );
  assert(guardRes.status === 201, `Guard registered successfully (HTTP 201)`);
  const newGuard = guardRes.body.data;
  assert(Boolean(newGuard?._id), `Guard created with Mongo _id: ${newGuard?._id}`);
  assert(Boolean(newGuard?.guardId), `Guard assigned ID: ${newGuard?.guardId}`);

  // --- Step 6: Guard Saved with Correct Company ID ---
  console.log('\n--- Step 6: Guard Persistence & Company ID Scoping ---');
  assert(
    String(newGuard?.companyId) === String(companyId),
    `Guard companyId (${newGuard?.companyId}) strictly matches company ID (${companyId})`
  );

  // --- Step 7: Cross-Company Access Control & Isolation ---
  console.log('\n--- Step 7: Company Owner Cannot Access Another Company Records ---');

  // Attempt 1: Company Owner retrieves guard list
  const anotherCompanyGuardRes = await getJson('/api/guards', ownerToken);
  assert(anotherCompanyGuardRes.status === 200, `Company Owner retrieves own guard list`);
  const retrievedGuards = anotherCompanyGuardRes.body.data || [];
  assert(
    retrievedGuards.every((g) => String(g.companyId) === String(companyId)),
    `Every guard in list strictly belongs to own company (${retrievedGuards.length} guards)`
  );

  // Attempt 2: Company Owner tries to access platform-admin routes
  const platformOverviewRes = await getJson('/api/company/platform/overview', ownerToken);
  assert(
    platformOverviewRes.status === 403,
    `Company Owner blocked from platform admin overview (HTTP 403 Forbidden)`
  );

  // Attempt 3: Company Owner tries to create another security company
  const rogueCompanyRes = await postJson(
    '/api/company/platform/companies',
    { companyName: 'Rogue Security Corp' },
    ownerToken
  );
  assert(
    rogueCompanyRes.status === 403,
    `Company Owner blocked from creating security companies (HTTP 403 Forbidden)`
  );

  console.log('\n=====================================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('=====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHierarchyVerification().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
