require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');
const mongoose = require('mongoose');

const Admin = require('../models/Admin');
const Company = require('../models/Company');
const Guard = require('../models/Guard');
const Shift = require('../models/Shift');
const Site = require('../models/Site');
const ShiftAssignment = require('../models/ShiftAssignment');

const API_BASE = 'http://localhost:5000/api';

async function runShiftTests() {
  console.log('=====================================================================');
  console.log('🕒  AUTOGUARD SHIFT MANAGEMENT & GUARD ASSIGNMENT ISOLATION TEST');
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

  assert(companyA !== null, `Company A found: ${companyA?.name} (${companyA?._id})`);
  assert(companyB !== null, `Company B found: ${companyB?.name} (${companyB?._id})`);

  // 2. Authenticate
  console.log('\n--- 1. Authenticating Company Owners ---');
  let tokenA = null;
  let tokenB = null;

  try {
    const resA = await axios.post(`${API_BASE}/auth/login`, {
      email: 'owner@secureshield.in',
      password: 'Owner@SecureShield2026',
    });
    tokenA = resA.data.token;
    assert(resA.status === 200 && !!tokenA, 'SecureShield Owner authenticated');
  } catch (err) {
    assert(false, `SecureShield login failed: ${err.message}`);
  }

  try {
    const resB = await axios.post(`${API_BASE}/auth/login`, {
      email: 'amit@primesecurity.test',
      password: 'PrimeOwner@2026!',
    });
    tokenB = resB.data.token;
    assert(resB.status === 200 && !!tokenB, 'Prime Security Owner authenticated');
  } catch (err) {
    assert(false, `Prime Security login failed: ${err.message}`);
  }

  const clientA = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  const clientB = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${tokenB}` },
  });

  // PART 2: Shift Creation for Prime Security Services
  console.log('\n--- Part 2: Shift Creation (Prime Security Services) ---');
  let primeShift = null;
  const shiftPayload = {
    shiftName: 'Day Shift',
    startTime: '08:00',
    endTime: '20:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Day duty shift from 08:00 to 20:00',
  };

  try {
    const res = await clientB.post('/shifts', shiftPayload);
    assert(res.status === 201 && res.data.success, `Prime Security created "Day Shift" via API (HTTP ${res.status})`);
    primeShift = res.data.data;
    console.log(`    Created Shift ID: ${primeShift.shiftId} (_id: ${primeShift._id})`);

    // Verify in MongoDB
    const dbShift = await Shift.findById(primeShift._id);
    assert(dbShift !== null, 'Day Shift record verified permanently in MongoDB');
    assert(
      dbShift.companyId.equals(companyB._id),
      `Shift companyId matches Prime Security ID strictly (${dbShift.companyId})`
    );
    assert(dbShift.startTime === '08:00', 'Shift start time verified as 08:00');
    assert(dbShift.endTime === '20:00', 'Shift end time verified as 20:00');
    assert(dbShift.workingDays.length === 7, 'Shift working days configured (7 days)');
  } catch (err) {
    assert(false, `Prime Security shift creation failed: ${err.response?.data?.message || err.message}`);
  }

  // Ensure Prime Security has a site for assignment
  console.log('\n--- Setting up Prime Security Site ---');
  let primeSite = await Site.findOne({ companyId: companyB._id });
  if (!primeSite) {
    const siteRes = await clientB.post('/sites', {
      siteName: 'Prime Tech Towers - Main Gate',
      address: 'Plot 42, Sector 44',
      city: 'Gurugram',
      state: 'Haryana',
      contactNumber: '+91 124 9988776',
    });
    primeSite = siteRes.data.data;
    console.log(`    Created Site for Prime Security: ${primeSite.siteName} (${primeSite._id})`);
  }
  assert(primeSite !== null, `Prime Security site confirmed: ${primeSite?.siteName} (${primeSite?._id})`);

  // PART 3: Assign Guard to Shift
  console.log('\n--- Part 3: Assign Guard to Shift ---');
  const primeGuard = await Guard.findOne({ companyId: companyB._id, isDeleted: false });
  assert(primeGuard !== null, `Found Prime Security guard: ${primeGuard?.fullName} (${primeGuard?._id})`);

  try {
    const assignRes = await clientB.put(`/guards/${primeGuard._id}`, {
      assignedShift: primeShift._id.toString(),
      assignedSite: primeSite._id.toString(),
    });
    assert(assignRes.status === 200, `Guard updated with Day Shift assignment (HTTP ${assignRes.status})`);

    // Verify in MongoDB Guard document
    const updatedGuard = await Guard.findById(primeGuard._id)
      .populate('assignedShift')
      .populate('assignedSite');
    assert(
      updatedGuard.assignedShift?._id.equals(primeShift._id),
      `Guard profile now reflects Day Shift: ${updatedGuard.assignedShift?.shiftName}`
    );
    assert(
      updatedGuard.assignedSite?._id.equals(primeSite._id),
      `Guard profile now reflects Prime Site: ${updatedGuard.assignedSite?.siteName}`
    );

    // Verify ShiftAssignment collection record
    const assignmentRecord = await ShiftAssignment.findOne({
      guardId: primeGuard._id,
      shiftId: primeShift._id,
      status: 'Active',
    });
    assert(assignmentRecord !== null, 'Active ShiftAssignment record created in MongoDB');
    assert(
      assignmentRecord.companyId.equals(companyB._id),
      'ShiftAssignment record companyId matches Prime Security'
    );
  } catch (err) {
    assert(false, `Guard assignment failed: ${err.response?.data?.message || err.message}`);
  }

  // PART 4: Multi-Company Security Tests
  console.log('\n--- Part 4: Multi-Company Shift Security & Isolation Tests ---');

  // 1. Prime Security can view its own shifts
  try {
    const resB = await clientB.get('/shifts');
    assert(resB.status === 200, 'Prime Security successfully retrieves shift list (HTTP 200)');
    const shiftIdsB = resB.data.data.map((s) => s._id.toString());
    assert(shiftIdsB.includes(primeShift._id.toString()), 'Prime Security shift list contains "Day Shift"');
  } catch (err) {
    assert(false, `Prime Security get shifts failed: ${err.message}`);
  }

  // 2. SecureShield cannot see Prime Security shifts in list
  let secureShieldShift = null;
  try {
    const resA = await clientA.get('/shifts');
    assert(resA.status === 200, 'SecureShield retrieves shift list (HTTP 200)');
    const shiftIdsA = resA.data.data.map((s) => s._id.toString());
    assert(
      !shiftIdsA.includes(primeShift._id.toString()),
      'SecureShield shift list DOES NOT contain Prime Security "Day Shift"'
    );
    secureShieldShift = resA.data.data[0];
    console.log(`    SecureShield Shift: ${secureShieldShift?.shiftName} (${secureShieldShift?._id})`);
  } catch (err) {
    assert(false, `SecureShield get shifts failed: ${err.message}`);
  }

  // 3. SecureShield cannot retrieve Prime Security shift by ID (404)
  // (Note: /api/shifts/:id is PUT/DELETE in router, let's test PUT/DELETE)
  try {
    await clientA.put(`/shifts/${primeShift._id}`, { shiftName: 'Hacked Shift Name' });
    assert(false, 'SecureShield illegally updated Prime Security shift');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `SecureShield denied updating Prime Security shift (HTTP ${err.response?.status} Not Found)`
    );
    const dbShift = await Shift.findById(primeShift._id);
    assert(dbShift.shiftName === 'Day Shift', 'Prime Security shift name unchanged in MongoDB');
  }

  // 4. SecureShield cannot delete Prime Security shift
  try {
    await clientA.delete(`/shifts/${primeShift._id}`);
    assert(false, 'SecureShield illegally deleted Prime Security shift');
  } catch (err) {
    assert(
      err.response?.status === 404,
      `SecureShield denied deleting Prime Security shift (HTTP ${err.response?.status} Not Found)`
    );
    const dbShift = await Shift.findById(primeShift._id);
    assert(dbShift.isDeleted === false, 'Prime Security shift isDeleted remains false');
  }

  // 5. Cross-Company Assignment Block: SecureShield attempts to assign its guard to Prime Security shift
  const secureShieldGuard = await Guard.findOne({ companyId: companyA._id, isDeleted: false });
  assert(secureShieldGuard !== null, `Found SecureShield guard: ${secureShieldGuard?.fullName}`);

  try {
    await clientA.put(`/guards/${secureShieldGuard._id}`, {
      assignedShift: primeShift._id.toString(),
    });
    assert(false, 'SecureShield illegally assigned its guard to Prime Security shift');
  } catch (err) {
    assert(
      err.response?.status === 400,
      `SecureShield blocked from assigning Prime Security shift (HTTP ${err.response?.status}: ${err.response?.data?.message})`
    );
    const dbGuardA = await Guard.findById(secureShieldGuard._id);
    assert(
      !dbGuardA.assignedShift?.equals(primeShift._id),
      'SecureShield guard was NOT assigned to Prime Security shift'
    );
  }

  // 6. Cross-Company Assignment Block: Prime Security attempts to assign its guard to SecureShield shift
  if (secureShieldShift) {
    try {
      await clientB.put(`/guards/${primeGuard._id}`, {
        assignedShift: secureShieldShift._id.toString(),
      });
      assert(false, 'Prime Security illegally assigned its guard to SecureShield shift');
    } catch (err) {
      assert(
        err.response?.status === 400,
        `Prime Security blocked from assigning SecureShield shift (HTTP ${err.response?.status}: ${err.response?.data?.message})`
      );
      const dbGuardB = await Guard.findById(primeGuard._id);
      assert(
        !dbGuardB.assignedShift?.equals(secureShieldShift._id),
        'Prime Security guard was NOT assigned to SecureShield shift'
      );
    }
  }

  // 7. Company ID Payload Tampering: Attempt to modify companyId via PUT payload
  try {
    const tamperRes = await clientB.put(`/shifts/${primeShift._id}`, {
      companyId: companyA._id.toString(),
      description: 'Updated shift description without hijacking tenant',
    });
    assert(tamperRes.status === 200, 'Shift update succeeded');
    const dbShift = await Shift.findById(primeShift._id);
    assert(
      dbShift.companyId.equals(companyB._id),
      'Shift companyId remains strictly locked to Prime Security (Tampered companyId stripped)'
    );
    assert(
      dbShift.description === 'Updated shift description without hijacking tenant',
      'Valid description field updated successfully'
    );
  } catch (err) {
    assert(false, `Company ID tampering test failed: ${err.message}`);
  }

  console.log('\n=====================================================================');
  console.log(`SHIFT VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('=====================================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runShiftTests().catch((err) => {
  console.error('[Fatal Test Error]', err);
  process.exit(1);
});
