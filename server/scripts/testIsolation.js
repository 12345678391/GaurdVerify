require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');
const mongoose = require('mongoose');

const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Guard = require('../models/Guard');

const API_BASE = 'http://localhost:5000/api';

async function runIsolationTests() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD GUARD REGISTRATION & MULTI-COMPANY ISOLATION TEST');
  console.log('=====================================================================');

  await mongoose.connect(process.env.MONGODB_URI);

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // 1. Fetch Companies
  const companyA = await Company.findOne({ code: 'SECURESHIELD' });
  const companyB = await Company.findOne({ code: 'PRIME001' });

  assert(companyA !== null, `Company A found: ${companyA?.name} (ID: ${companyA?._id})`);
  assert(companyB !== null, `Company B found: ${companyB?.name} (ID: ${companyB?._id})`);
  assert(!companyA._id.equals(companyB._id), 'Company A and Company B have distinct unique IDs');

  // 2. Authenticate Company Owners
  console.log('\n--- Authenticating Company Owners ---');
  let tokenA = null;
  let tokenB = null;

  try {
    const resA = await axios.post(`${API_BASE}/auth/login`, {
      email: 'owner@secureshield.in',
      password: 'Owner@SecureShield2026',
    });
    tokenA = resA.data.token;
    assert(resA.status === 200 && !!tokenA, 'Company A Owner login successful (Token acquired)');
  } catch (err) {
    assert(false, `Company A Owner login failed: ${err.response?.data?.message || err.message}`);
  }

  try {
    const resB = await axios.post(`${API_BASE}/auth/login`, {
      email: 'amit@primesecurity.test',
      password: 'PrimeOwner@2026!',
    });
    tokenB = resB.data.token;
    assert(resB.status === 200 && !!tokenB, 'Company B Owner login successful (Token acquired)');
  } catch (err) {
    assert(false, `Company B Owner login failed: ${err.response?.data?.message || err.message}`);
  }

  const clientA = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  const clientB = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  // PART 1: Company A Guard Registration
  console.log('\n--- Part 1: Company A Guard Registration ---');
  let guardA = null;
  try {
    const payloadA = {
      fullName: 'Mahesh Chand Yadav',
      mobileNumber: '+91 98110 99881',
      fatherName: 'Kishan Chand Yadav',
      residentialAddress: 'House 12, Sector 14',
      city: 'Gurugram',
      state: 'Haryana',
      pinCode: '122001',
      designation: 'Security Guard',
      emergencyContactNumber: '+91 98110 99000',
      identityDocType: 'Aadhaar Card',
    };

    const res = await clientA.post('/guards', payloadA);
    assert(res.status === 201 && res.data.success, `Guard registered in Company A via API (HTTP ${res.status})`);
    guardA = res.data.data;
    console.log(`    Guard A ID: ${guardA.guardId} (Mongo _id: ${guardA._id})`);

    // Verify in MongoDB
    const dbGuardA = await Guard.findById(guardA._id);
    assert(dbGuardA !== null, 'Guard A record verified in MongoDB database');
    assert(
      dbGuardA.companyId.equals(companyA._id),
      `Guard A companyId strictly matches SecureShield ID (${dbGuardA.companyId})`
    );
    assert(
      !dbGuardA.companyId.equals(companyB._id),
      'Guard A companyId does NOT match Prime Security ID'
    );
  } catch (err) {
    assert(false, `Guard A creation failed: ${err.response?.data?.message || err.message}`);
  }

  // PART 2: Company B Guard Registration
  console.log('\n--- Part 2: Company B Guard Registration ---');
  let guardB = null;
  try {
    const payloadB = {
      fullName: 'Suraj Prakash Rawat',
      mobileNumber: '+91 98220 88772',
      fatherName: 'Gopal Rawat',
      residentialAddress: 'Flat 101, Cyber Enclave',
      city: 'Gurugram',
      state: 'Haryana',
      pinCode: '122002',
      designation: 'Security Officer',
      emergencyContactNumber: '+91 98220 88000',
      identityDocType: 'Aadhaar Card',
    };

    const res = await clientB.post('/guards', payloadB);
    assert(res.status === 201 && res.data.success, `Guard registered in Company B via API (HTTP ${res.status})`);
    guardB = res.data.data;
    console.log(`    Guard B ID: ${guardB.guardId} (Mongo _id: ${guardB._id})`);

    // Verify in MongoDB
    const dbGuardB = await Guard.findById(guardB._id);
    assert(dbGuardB !== null, 'Guard B record verified in MongoDB database');
    assert(
      dbGuardB.companyId.equals(companyB._id),
      `Guard B companyId strictly matches Prime Security ID (${dbGuardB.companyId})`
    );
    assert(
      !dbGuardB.companyId.equals(companyA._id),
      'Guard B companyId does NOT match SecureShield ID'
    );
  } catch (err) {
    assert(false, `Guard B creation failed: ${err.response?.data?.message || err.message}`);
  }

  // PART 3: Cross-Company Data Isolation Tests
  console.log('\n--- Part 3: Cross-Company Data Isolation Tests ---');

  // 1. Company A requests own guard list
  try {
    const res = await clientA.get('/guards?limit=100');
    assert(res.status === 200, `Company A retrieves own guard list: HTTP ${res.status}`);
    const ids = res.data.data.map((g) => g._id.toString());
    assert(ids.includes(guardA._id.toString()), 'Company A list contains its own Guard A');
    assert(!ids.includes(guardB._id.toString()), 'Company A list DOES NOT contain Company B Guard');
  } catch (err) {
    assert(false, `Company A list query failed: ${err.message}`);
  }

  // 2. Company B requests own guard list
  try {
    const res = await clientB.get('/guards?limit=100');
    assert(res.status === 200, `Company B retrieves own guard list: HTTP ${res.status}`);
    const ids = res.data.data.map((g) => g._id.toString());
    assert(ids.includes(guardB._id.toString()), 'Company B list contains its own Guard B');
    assert(!ids.includes(guardA._id.toString()), 'Company B list DOES NOT contain Company A Guard');
  } catch (err) {
    assert(false, `Company B list query failed: ${err.message}`);
  }

  // 3. Company A attempts to retrieve Company B's guard by ID
  try {
    await clientA.get(`/guards/${guardB._id}`);
    assert(false, 'Company A illegally retrieved Company B guard (Should return 404)');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `Company A denied reading Company B guard by ID (HTTP ${err.response?.status} Not Found)`
    );
    assert(!err.response?.data?.data, 'No Company B data exposed in response payload');
  }

  // 4. Company B attempts to retrieve Company A's guard by ID
  try {
    await clientB.get(`/guards/${guardA._id}`);
    assert(false, 'Company B illegally retrieved Company A guard (Should return 404)');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `Company B denied reading Company A guard by ID (HTTP ${err.response?.status} Not Found)`
    );
    assert(!err.response?.data?.data, 'No Company A data exposed in response payload');
  }

  // 5. Company A attempts to UPDATE Company B's guard
  try {
    await clientA.put(`/guards/${guardB._id}`, { fullName: 'Hacked Guard Name' });
    assert(false, 'Company A illegally updated Company B guard');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `Company A denied updating Company B guard (HTTP ${err.response?.status} Not Found)`
    );
    const dbGuardB = await Guard.findById(guardB._id);
    assert(dbGuardB.fullName === 'Suraj Prakash Rawat', 'Guard B name unchanged in MongoDB');
  }

  // 6. Company B attempts to UPDATE Company A's guard
  try {
    await clientB.put(`/guards/${guardA._id}`, { fullName: 'Hacked Guard Name' });
    assert(false, 'Company B illegally updated Company A guard');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `Company B denied updating Company A guard (HTTP ${err.response?.status} Not Found)`
    );
    const dbGuardA = await Guard.findById(guardA._id);
    assert(dbGuardA.fullName === 'Mahesh Chand Yadav', 'Guard A name unchanged in MongoDB');
  }

  // 7. Company A attempts to DELETE Company B's guard
  try {
    await clientA.delete(`/guards/${guardB._id}`);
    assert(false, 'Company A illegally deleted Company B guard');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `Company A denied deleting Company B guard (HTTP ${err.response?.status} Not Found)`
    );
    const dbGuardB = await Guard.findById(guardB._id);
    assert(dbGuardB.isDeleted === false, 'Guard B remains active in MongoDB');
  }

  // 8. Company B attempts to DELETE Company A's guard
  try {
    await clientB.delete(`/guards/${guardA._id}`);
    assert(false, 'Company B illegally deleted Company A guard');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `Company B denied deleting Company A guard (HTTP ${err.response?.status} Not Found)`
    );
    const dbGuardA = await Guard.findById(guardA._id);
    assert(dbGuardA.isDeleted === false, 'Guard A remains active in MongoDB');
  }

  // 9. Tenant Spoofing / Tampering Protection:
  // Company A attempts to re-assign Guard A to Company B via PUT body
  try {
    const tamperRes = await clientA.put(`/guards/${guardA._id}`, {
      companyId: companyB._id.toString(),
      designation: 'Senior Inspector',
    });
    assert(tamperRes.status === 200, 'Update request processed');
    const dbGuardA = await Guard.findById(guardA._id);
    assert(
      dbGuardA.companyId.equals(companyA._id),
      'Guard A companyId remains strictly locked to Company A (Tampered companyId stripped)'
    );
    assert(
      dbGuardA.designation === 'Senior Inspector',
      'Valid field (designation) successfully updated'
    );
  } catch (err) {
    assert(false, `Tampering test failed: ${err.message}`);
  }

  // PART 4: Comprehensive Database Verification
  console.log('\n--- Part 4: Database Multi-Tenant Verification ---');
  const allGuards = await Guard.find();
  let invalidCompanyIdCount = 0;
  let mismatchedGuards = 0;

  for (const g of allGuards) {
    if (!g.companyId) {
      invalidCompanyIdCount++;
    }
  }

  assert(invalidCompanyIdCount === 0, `All ${allGuards.length} guards have valid companyId assigned`);

  const totalGuardsA = await Guard.countDocuments({ companyId: companyA._id, isDeleted: false });
  const totalGuardsB = await Guard.countDocuments({ companyId: companyB._id, isDeleted: false });

  console.log(`    Total active guards in Company A: ${totalGuardsA}`);
  console.log(`    Total active guards in Company B: ${totalGuardsB}`);
  assert(totalGuardsA >= 1, 'Company A has active guards');
  assert(totalGuardsB >= 1, 'Company B has active guards');

  console.log('\n=====================================================================');
  console.log(`ISOLATION VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('=====================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runIsolationTests().catch((err) => {
  console.error('[Isolation Test Suite Fatal Error]', err);
  process.exit(1);
});
