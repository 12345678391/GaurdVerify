const http = require('http');

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
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

function getAuth(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

async function runTests() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD LOGIN AUTHENTICATION & REDIRECTION VERIFICATION SUITE');
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

  // --- Test 1: Head Admin login with seed email (headadmin@autoguard.com) ---
  console.log('--- Test 1: Head Admin Login (Seeded Email: headadmin@autoguard.com) ---');
  const res1 = await postJson('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(res1.status === 200, `HTTP status is 200 OK (Got: ${res1.status})`);
  assert(res1.body.success === true, `Response success is true`);
  assert(Boolean(res1.body.token), `JWT Token received`);
  assert(res1.body.admin.role === 'super_admin', `Role is super_admin (Got: ${res1.body.admin.role})`);
  assert(res1.body.admin.password === undefined, `Password is NOT exposed in response payload`);
  assert(
    (res1.body.admin.role === 'super_admin' ? '/platform-admin' : '/') === '/platform-admin',
    `Frontend redirects super_admin to /platform-admin`
  );

  // --- Test 2: Head Admin login with alias email (vikrant@autoguardsecurity.com) ---
  console.log('\n--- Test 2: Head Admin Login (Alias Email: vikrant@autoguardsecurity.com) ---');
  const res2 = await postJson('/api/auth/login', {
    email: 'vikrant@autoguardsecurity.com',
    password: 'Admin@AutoGuard2026',
  });
  assert(res2.status === 200, `HTTP status is 200 OK (Got: ${res2.status})`);
  assert(res2.body.success === true, `Response success is true`);
  assert(Boolean(res2.body.token), `JWT Token received`);
  assert(res2.body.admin.role === 'super_admin', `Role is super_admin (Got: ${res2.body.admin.role})`);
  assert(res2.body.admin.password === undefined, `Password is NOT exposed in response payload`);
  assert(res2.body.admin.id === res1.body.admin.id, `Both email aliases resolve strictly to the exact same account ID (${res2.body.admin.id})`);
  assert(
    (res2.body.admin.role === 'super_admin' ? '/platform-admin' : '/') === '/platform-admin',
    `Frontend redirects super_admin to /platform-admin`
  );

  // --- Test 2b: Rejection of alternative development password ---
  console.log('\n--- Test 2b: Pure Bcrypt Rejection of Alternative Password ---');
  const resAlt = await postJson('/api/auth/login', {
    email: 'vikrant@autoguardsecurity.com',
    password: 'Admin@GuardConnect2026',
  });
  assert(resAlt.status === 401, `Alternative password rejected with HTTP 401 Unauthorized (Got: ${resAlt.status})`);
  assert(resAlt.body.success === false, `Alternative password response success is false`);
  assert(resAlt.body.message === 'Invalid email or password.', `Message is "Invalid email or password."`);

  // --- Test 3: Session validation for Head Admin ---
  console.log('\n--- Test 3: Head Admin Session Profile (/api/auth/me) ---');
  const meRes = await getAuth('/api/auth/me', res2.body.token);
  assert(meRes.status === 200, `HTTP status 200 for /api/auth/me`);
  assert(meRes.body.admin.fullName.includes('Vikrant Malhotra'), `Admin profile name verified`);
  assert(meRes.body.admin.role === 'super_admin', `Role in session is super_admin`);

  // --- Test 4: Company Owner Login (SecureShield) ---
  console.log('\n--- Test 4: Company Owner Login (SecureShield: owner@secureshield.in) ---');
  const res3 = await postJson('/api/auth/login', {
    email: 'owner@secureshield.in',
    password: 'Owner@SecureShield2026',
  });
  assert(res3.status === 200, `HTTP status is 200 OK (Got: ${res3.status})`);
  assert(res3.body.success === true, `Response success is true`);
  assert(Boolean(res3.body.token), `JWT Token received`);
  assert(res3.body.admin.role === 'company_owner', `Role is company_owner (Got: ${res3.body.admin.role})`);
  assert(Boolean(res3.body.admin.company), `Company object attached to response`);
  assert(
    (res3.body.admin.role === 'super_admin' ? '/platform-admin' : '/') === '/',
    `Frontend redirects company_owner to / (Agency Dashboard)`
  );

  // --- Test 5: Company Owner Login (Prime Security) ---
  console.log('\n--- Test 5: Company Owner Login (Prime Security: amit@primesecurity.test) ---');
  const res4 = await postJson('/api/auth/login', {
    email: 'amit@primesecurity.test',
    password: 'PrimeOwner@2026!',
  });
  assert(res4.status === 200, `HTTP status is 200 OK (Got: ${res4.status})`);
  assert(res4.body.admin.role === 'company_owner', `Role is company_owner`);
  assert(
    (res4.body.admin.role === 'super_admin' ? '/platform-admin' : '/') === '/',
    `Frontend redirects company_owner to / (Agency Dashboard)`
  );

  // --- Test 6: Invalid Credentials (Nonexistent user) ---
  console.log('\n--- Test 6: Nonexistent User Returns HTTP 401 ---');
  const res5 = await postJson('/api/auth/login', {
    email: 'nonexistent.user@unknowncompany.com',
    password: 'SomePassword123!',
  });
  assert(res5.status === 401, `HTTP status is 401 Unauthorized (Got: ${res5.status})`);
  assert(res5.body.success === false, `Response success is false`);
  assert(
    res5.body.message === 'Invalid credentials. User not found.',
    `Message is exact expected string: "${res5.body.message}"`
  );

  // --- Test 7: Invalid Credentials (Wrong password for headadmin@autoguard.com) ---
  console.log('\n--- Test 7: Wrong Password for headadmin@autoguard.com ---');
  const res6 = await postJson('/api/auth/login', {
    email: 'headadmin@autoguard.com',
    password: 'WrongPassword123!',
  });
  assert(res6.status === 401, `HTTP status is 401 Unauthorized (Got: ${res6.status})`);
  assert(res6.body.success === false, `Response success is false`);
  assert(
    res6.body.message === 'Invalid email or password.',
    `Message is exact expected string: "${res6.body.message}"`
  );

  // --- Test 8: Invalid Credentials (Wrong password for vikrant@autoguardsecurity.com) ---
  console.log('\n--- Test 8: Wrong Password for vikrant@autoguardsecurity.com ---');
  const res7 = await postJson('/api/auth/login', {
    email: 'vikrant@autoguardsecurity.com',
    password: 'WrongPassword123!',
  });
  assert(res7.status === 401, `HTTP status is 401 Unauthorized (Got: ${res7.status})`);
  assert(res7.body.success === false, `Response success is false`);
  assert(
    res7.body.message === 'Invalid email or password.',
    `Message is exact expected string: "${res7.body.message}"`
  );

  // --- Test 9: Invalid Credentials (Wrong password for owner@secureshield.in) ---
  console.log('\n--- Test 9: Wrong Password for owner@secureshield.in ---');
  const res8 = await postJson('/api/auth/login', {
    email: 'owner@secureshield.in',
    password: 'WrongPassword123!',
  });
  assert(res8.status === 401, `HTTP status is 401 Unauthorized (Got: ${res8.status})`);
  assert(res8.body.success === false, `Response success is false`);
  assert(
    res8.body.message === 'Invalid email or password.',
    `Message is exact expected string: "${res8.body.message}"`
  );

  // --- Test 10: Missing fields return HTTP 400 ---
  console.log('\n--- Test 10: Missing Email or Password Returns HTTP 400 ---');
  const res9 = await postJson('/api/auth/login', { email: '' });
  assert(res9.status === 400, `HTTP status is 400 Bad Request (Got: ${res9.status})`);

  console.log('\n=====================================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('=====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
