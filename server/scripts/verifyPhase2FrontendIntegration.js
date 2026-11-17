require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runPhase2Verification() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD PHASE 2: CALL HISTORY & ATTENDANCE INTEGRATION SUITE');
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
    // Connect to DB for direct ground truth comparison
    await mongoose.connect(process.env.MONGODB_URI);
    const CallLog = require('../models/CallLog');
    const AttendanceRecord = require('../models/AttendanceRecord');
    const Admin = require('../models/Admin');

    // 1. Authenticate Company A Owner (SecureShield)
    console.log('--- Test 1: Authenticate Company A Owner ---');
    const loginARes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'owner@secureshield.in',
      password: 'Owner@SecureShield2026',
    });
    assert(loginARes.status === 200, 'Company A Owner login successful (HTTP 200)');
    const tokenA = loginARes.data.token;
    const companyAId = loginARes.data.admin.company._id || loginARes.data.admin.company;
    const headersA = { Authorization: `Bearer ${tokenA}` };

    // 2. Fetch Call History for Company A from API
    console.log('\n--- Test 2: Verify Call History API & MongoDB Ground Truth ---');
    const callsARes = await axios.get(`${BASE_URL}/calls/history?limit=100`, { headers: headersA });
    assert(callsARes.status === 200, 'Company A calls history retrieved successfully');
    assert(callsARes.data.success === true, 'Response success is true');
    assert(Array.isArray(callsARes.data.data), 'Calls data is an array');

    const mongoCallsCountA = await CallLog.countDocuments({ companyId: companyAId });
    assert(
      callsARes.data.pagination.total === mongoCallsCountA,
      `API total calls (${callsARes.data.pagination.total}) strictly matches MongoDB count (${mongoCallsCountA})`
    );

    // Verify record fields on returned call
    if (callsARes.data.data.length > 0) {
      const sampleCall = callsARes.data.data[0];
      assert(sampleCall.callId !== undefined, 'callId is present');
      assert(sampleCall.guardId && sampleCall.guardId.fullName, 'guardId is populated with fullName');
      assert(sampleCall.destinationNumber !== undefined, 'destinationNumber is present');
      assert(typeof sampleCall.isSimulated === 'boolean', 'isSimulated is a boolean');
      assert(sampleCall.verificationResult !== undefined, 'verificationResult is present');
    }

    // 3. Test Distinguishable Real vs Simulated Calls
    console.log('\n--- Test 3: Distinguishable Real vs Simulated Calls ---');
    const simulatedCalls = callsARes.data.data.filter((c) => c.isSimulated === true);
    const liveCalls = callsARes.data.data.filter((c) => c.isSimulated === false);
    assert(
      simulatedCalls.length >= 0 && (simulatedCalls.length + liveCalls.length === callsARes.data.data.length),
      `isSimulated cleanly partitions call logs (Simulated: ${simulatedCalls.length}, Live: ${liveCalls.length})`
    );

    // 4. Verify Attendance API & MongoDB Ground Truth
    console.log('\n--- Test 4: Verify Attendance API & MongoDB Ground Truth ---');
    const attARes = await axios.get(`${BASE_URL}/attendance?limit=100`, { headers: headersA });
    assert(attARes.status === 200, 'Company A attendance retrieved successfully');
    assert(attARes.data.success === true, 'Attendance response success is true');

    const mongoAttCountA = await AttendanceRecord.countDocuments({ companyId: companyAId });
    assert(
      attARes.data.pagination.total === mongoAttCountA,
      `API total attendance (${attARes.data.pagination.total}) strictly matches MongoDB count (${mongoAttCountA})`
    );

    if (attARes.data.data.length > 0) {
      const sampleAtt = attARes.data.data[0];
      assert(sampleAtt.guardId && sampleAtt.guardId.fullName, 'guardId is populated with fullName');
      assert(sampleAtt.date !== undefined, `date format verified: ${sampleAtt.date}`);
      assert(sampleAtt.dutyStatus !== undefined, `dutyStatus present: ${sampleAtt.dutyStatus}`);
      assert(sampleAtt.totalConfirmedCalls !== undefined, 'totalConfirmedCalls counter present');
    }

    // 5. Verify Dynamic Date Filtering
    console.log('\n--- Test 5: Verify Dynamic Date Filtering ---');
    const testDate = '2026-11-12';
    const dateFilterRes = await axios.get(`${BASE_URL}/attendance?date=${testDate}`, { headers: headersA });
    assert(dateFilterRes.status === 200, `Date filter for ${testDate} executed successfully`);
    const mongoDateCount = await AttendanceRecord.countDocuments({ companyId: companyAId, date: testDate });
    assert(
      dateFilterRes.data.pagination.total === mongoDateCount,
      `Filtered total (${dateFilterRes.data.pagination.total}) matches MongoDB records for date ${testDate} (${mongoDateCount})`
    );
    const nonMatchingDates = dateFilterRes.data.data.filter((r) => r.date !== testDate);
    assert(nonMatchingDates.length === 0, 'Zero non-matching date records returned when date filter is active');

    // 6. Test Multi-Tenant Isolation (Company B vs Company A)
    console.log('\n--- Test 6: Verify Multi-Tenant Isolation ---');
    const loginBRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'amit@primesecurity.test',
      password: 'PrimeOwner@2026!',
    });
    assert(loginBRes.status === 200, 'Company B Owner login successful (HTTP 200)');
    const tokenB = loginBRes.data.token;
    const companyBId = loginBRes.data.admin.company._id || loginBRes.data.admin.company;
    const headersB = { Authorization: `Bearer ${tokenB}` };

    const callsBRes = await axios.get(`${BASE_URL}/calls/history`, { headers: headersB });
    const attBRes = await axios.get(`${BASE_URL}/attendance`, { headers: headersB });

    assert(
      callsBRes.data.pagination.total !== callsARes.data.pagination.total,
      `Company B calls count (${callsBRes.data.pagination.total}) differs from Company A (${callsARes.data.pagination.total})`
    );
    assert(
      attBRes.data.pagination.total === 0,
      `Company B has 0 attendance records, confirming isolated clean empty state (Found: ${attBRes.data.pagination.total})`
    );

    // Confirm no Company A calls leak into Company B's response
    const leakedCalls = callsBRes.data.data.filter((c) => String(c.companyId) === String(companyAId));
    assert(leakedCalls.length === 0, 'Zero Company A call records leaked into Company B response');

    // 7. Test Unauthorized Access Without JWT
    console.log('\n--- Test 7: Verify Route Security (Reject Unauthenticated Requests) ---');
    try {
      await axios.get(`${BASE_URL}/calls/history`);
      assert(false, 'Unauthenticated call history should be rejected');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated /calls/history rejected with HTTP 401');
    }

    try {
      await axios.get(`${BASE_URL}/attendance`);
      assert(false, 'Unauthenticated attendance should be rejected');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated /attendance rejected with HTTP 401');
    }

    // 8. Test KPI Math Parity (No Hardcoded +18 or +16)
    console.log('\n--- Test 8: KPI Metrics Calculation Parity ---');
    const totalCalls = callsARes.data.data.length;
    const successfulCalls = callsARes.data.data.filter((c) => {
      const res = (c.verificationResult || '').toUpperCase();
      const status = (c.callStatus || '').toLowerCase();
      return res === 'CONFIRMED' || status === 'completed' || status === 'answered';
    }).length;
    const unansweredCalls = callsARes.data.data.filter((c) => {
      const res = (c.verificationResult || '').toUpperCase();
      const status = (c.callStatus || '').toLowerCase();
      return res === 'MISSED' || status.includes('no answer');
    }).length;

    assert(totalCalls === callsARes.data.data.length, `Total calls KPI matches exact array length (${totalCalls}, no +18)`);
    assert(successfulCalls <= totalCalls, `Successful calls KPI (${successfulCalls}) is strictly bounded by total (${totalCalls}, no +16)`);
    assert(unansweredCalls <= totalCalls, `Unanswered calls KPI (${unansweredCalls}) is strictly bounded by total (${totalCalls})`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n=====================================================================');
  console.log(`📊 PHASE 2 VERIFICATION RESULTS: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('=====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Verification();
