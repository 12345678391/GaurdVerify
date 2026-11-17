const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CallLog = require('../models/CallLog');
const AttendanceRecord = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');
const Guard = require('../models/Guard');
const Company = require('../models/Company');
const Shift = require('../models/Shift');
const Site = require('../models/Site');
const { generateV3Signature, generateV2Signature } = require('../utils/plivoSignatureHelper');

function requestHttp({ method, reqPath, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    let data = '';
    if (body) {
      if (typeof body === 'object') {
        data = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        data = String(body);
      }
      headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: reqPath,
        method: method || 'POST',
        headers,
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resData), raw: resData, headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, raw: resData, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runPlivoSignatureTests() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD PHASE 1: PLIVO WEBHOOK SIGNATURE VALIDATION SUITE');
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

  const authToken = process.env.PLIVO_AUTH_TOKEN;
  assert(Boolean(authToken && authToken.length > 10), `PLIVO_AUTH_TOKEN loaded securely`);

  // Find or create test environment resources
  const company = await Company.findOne({ code: 'SECURESHIELD' });
  const shift = await Shift.findOne({ companyId: company._id });
  const site = await Site.findOne({ companyId: company._id });
  const guard = await Guard.findOne({ companyId: company._id, isDeleted: false });

  // Create isolated test CallLog in PENDING state
  const testCallLog = await CallLog.create({
    companyId: company._id,
    guardId: guard._id,
    shiftId: shift._id,
    siteId: site._id,
    callId: `TEST-PLIVO-${Date.now()}`,
    callerNumber: '+919876543210',
    destinationNumber: guard.mobileNumber,
    callStatus: 'Initiated',
    verificationResult: 'PENDING',
    initiationTime: new Date(),
    isSimulated: true,
  });

  const callLogId = testCallLog._id.toString();
  const dtmfPath = `/api/calls/webhook/dtmf?callLogId=${callLogId}`;
  const answerPath = `/api/calls/webhook/answer?callLogId=${callLogId}`;
  const hangupPath = `/api/calls/webhook/hangup?callLogId=${callLogId}`;
  const fullUri = `http://localhost:5000${dtmfPath}`;

  // --- Test 2: Missing signature rejected ---
  console.log('--- Test 2: Missing Plivo signature rejected ---');
  const missingSigRes = await requestHttp({
    method: 'POST',
    reqPath: dtmfPath,
    body: { Digits: '1' },
  });
  assert(missingSigRes.status === 403, `Missing signature rejected with HTTP 403 Forbidden (Got: ${missingSigRes.status})`);
  assert(
    missingSigRes.body?.message?.includes('Missing'),
    `Informative rejection message: "${missingSigRes.body?.message}"`
  );

  // --- Test 3: Invalid signature rejected ---
  console.log('\n--- Test 3: Invalid Plivo signature rejected ---');
  const invalidSigRes = await requestHttp({
    method: 'POST',
    reqPath: dtmfPath,
    headers: {
      'X-Plivo-Signature-V3': 'completely_bogus_signature_hash_12345',
      'X-Plivo-Signature-V3-Nonce': '1234567890',
    },
    body: { Digits: '1' },
  });
  assert(invalidSigRes.status === 403, `Invalid signature rejected with HTTP 403 Forbidden (Got: ${invalidSigRes.status})`);

  // --- Test 4: Modified request URL rejected ---
  console.log('\n--- Test 4: Modified request URL rejected ---');
  const nonce4 = `nonce_${Date.now()}_4`;
  const postParams4 = { Digits: '1' };
  // Signature computed for a different URL
  const originalUri4 = `http://localhost:5000/api/calls/webhook/dtmf?callLogId=DIFFERENT_LOG_ID`;
  const sigForOtherUrl = generateV3Signature('POST', originalUri4, nonce4, authToken, postParams4);

  const modifiedUrlRes = await requestHttp({
    method: 'POST',
    reqPath: dtmfPath, // Sent to callLogId instead of DIFFERENT_LOG_ID
    headers: {
      'X-Plivo-Signature-V3': sigForOtherUrl,
      'X-Plivo-Signature-V3-Nonce': nonce4,
    },
    body: postParams4,
  });
  assert(modifiedUrlRes.status === 403, `Modified request URL rejected with HTTP 403 (Got: ${modifiedUrlRes.status})`);

  // --- Test 5: Modified request parameters rejected ---
  console.log('\n--- Test 5: Modified request parameters rejected ---');
  const nonce5 = `nonce_${Date.now()}_5`;
  // Signature computed for Digits = '1'
  const sigForDigits1 = generateV3Signature('POST', fullUri, nonce5, authToken, { Digits: '1' });

  // Attacker tampers payload to Digits = '2' (SOS)
  const modifiedParamRes = await requestHttp({
    method: 'POST',
    reqPath: dtmfPath,
    headers: {
      'X-Plivo-Signature-V3': sigForDigits1,
      'X-Plivo-Signature-V3-Nonce': nonce5,
    },
    body: { Digits: '2' }, // Tampered
  });
  assert(modifiedParamRes.status === 403, `Tampered request payload rejected with HTTP 403 (Got: ${modifiedParamRes.status})`);

  // --- Test 6: Invalid DTMF webhook cannot confirm attendance ---
  console.log('\n--- Test 6: Invalid DTMF webhook cannot confirm attendance in DB ---');
  const logBeforeTamper = await CallLog.findById(callLogId);
  assert(logBeforeTamper.verificationResult === 'PENDING', `CallLog verificationResult remains PENDING`);
  const initialConfirmedCount = await AttendanceRecord.countDocuments({
    companyId: company._id,
    'verificationLog.callLogId': testCallLog._id,
  });
  assert(initialConfirmedCount === 0, `No attendance confirmed records exist for test call`);

  // --- Test 7: Invalid DTMF webhook cannot trigger assistance notification ---
  console.log('\n--- Test 7: Invalid DTMF webhook cannot trigger assistance notification in DB ---');
  const initialAlertCount = await Notification.countDocuments({
    callLogId: testCallLog._id,
    type: 'ASSISTANCE_REQUEST',
  });
  assert(initialAlertCount === 0, `No assistance alerts exist for test call`);

  // --- Test 8: Answer and hangup endpoints reject invalid signatures ---
  console.log('\n--- Test 8: Answer and hangup endpoints reject invalid signatures ---');
  const answerMissingRes = await requestHttp({
    method: 'POST',
    reqPath: answerPath,
  });
  assert(answerMissingRes.status === 403, `Answer endpoint rejects missing signature (HTTP 403)`);

  const hangupMissingRes = await requestHttp({
    method: 'POST',
    reqPath: hangupPath,
    body: { HangupCause: 'NORMAL_CLEARING', Duration: '20' },
  });
  assert(hangupMissingRes.status === 403, `Hangup endpoint rejects missing signature (HTTP 403)`);

  // --- Test 1: Valid Plivo signatures accepted (V3 & V2) ---
  console.log('\n--- Test 1: Valid Plivo signatures accepted (V3 & V2) ---');
  // 1a. Test Answer endpoint with valid V2 signature
  const nonceAnswerV2 = `nonce_ans_${Date.now()}`;
  const fullAnswerUri = `http://localhost:5000${answerPath}`;
  const sigAnswerV2 = generateV2Signature(fullAnswerUri, nonceAnswerV2, authToken);

  const answerValidRes = await requestHttp({
    method: 'POST',
    reqPath: answerPath,
    headers: {
      'X-Plivo-Signature-V2': sigAnswerV2,
      'X-Plivo-Signature-V2-Nonce': nonceAnswerV2,
    },
  });
  assert(answerValidRes.status === 200, `Answer endpoint accepts valid V2 signature (HTTP 200)`);
  assert(answerValidRes.raw?.includes('<Response>'), `Answer returns valid Plivo XML speak prompt`);

  // 1b. Test DTMF endpoint with valid V3 signature (Confirm Duty - Digits 1)
  const nonceDtmfV3 = `nonce_dtmf_${Date.now()}`;
  const validDtmfBody = { Digits: '1', Duration: '20' };
  const sigDtmfV3 = generateV3Signature('POST', fullUri, nonceDtmfV3, authToken, validDtmfBody);

  const dtmfValidRes = await requestHttp({
    method: 'POST',
    reqPath: dtmfPath,
    headers: {
      'X-Plivo-Signature-V3': sigDtmfV3,
      'X-Plivo-Signature-V3-Nonce': nonceDtmfV3,
    },
    body: validDtmfBody,
  });
  assert(dtmfValidRes.status === 200, `DTMF endpoint accepts valid V3 signature (HTTP 200)`);
  assert(dtmfValidRes.raw?.includes('attendance has been successfully verified'), `DTMF 1 XML response returned`);

  // Verify MongoDB updated ONLY upon valid signature!
  const logAfterValid = await CallLog.findById(callLogId);
  assert(logAfterValid.verificationResult === 'CONFIRMED', `CallLog transitioned to CONFIRMED upon valid signature`);

  // 1c. Test Hangup endpoint with valid V3 signature
  const nonceHangupV3 = `nonce_hng_${Date.now()}`;
  const hangupBody = { HangupCause: 'NORMAL_CLEARING', Duration: '20' };
  const fullHangupUri = `http://localhost:5000${hangupPath}`;
  const sigHangupV3 = generateV3Signature('POST', fullHangupUri, nonceHangupV3, authToken, hangupBody);

  const hangupValidRes = await requestHttp({
    method: 'POST',
    reqPath: hangupPath,
    headers: {
      'X-Plivo-Signature-V3': sigHangupV3,
      'X-Plivo-Signature-V3-Nonce': nonceHangupV3,
    },
    body: hangupBody,
  });
  assert(hangupValidRes.status === 200, `Hangup endpoint accepts valid V3 signature (HTTP 200)`);

  // --- Test 9: Protected simulation workflow still works without Plivo signature ---
  console.log('\n--- Test 9: Protected Simulation Workflow Unaffected ---');
  // Authenticate as Company Owner
  const loginRes = await requestHttp({
    method: 'POST',
    reqPath: '/api/auth/login',
    body: {
      email: 'owner@secureshield.in',
      password: 'Owner@SecureShield2026',
    },
  });
  assert(loginRes.status === 200, `Company Owner authenticated for simulation test`);
  const ownerToken = loginRes.body.token;

  // Create another pending call for simulation
  const simCall = await CallLog.create({
    companyId: company._id,
    guardId: guard._id,
    shiftId: shift._id,
    siteId: site._id,
    callId: `SIM-CALL-${Date.now()}`,
    callerNumber: '+919876543210',
    destinationNumber: guard.mobileNumber,
    callStatus: 'Initiated',
    verificationResult: 'PENDING',
    initiationTime: new Date(),
    isSimulated: true,
  });

  // Call /api/calls/simulate-dtmf with JWT Bearer token (NO Plivo signature headers!)
  const simActionRes = await requestHttp({
    method: 'POST',
    reqPath: '/api/calls/simulate-dtmf',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
    },
    body: {
      callLogId: simCall._id.toString(),
      digit: '1',
    },
  });
  assert(
    simActionRes.status === 200,
    `Protected simulation endpoint works with JWT authentication without Plivo signature (HTTP 200)`
  );
  assert(simActionRes.body?.success === true, `Simulation response success is true`);

  const updatedSimCall = await CallLog.findById(simCall._id);
  assert(updatedSimCall.verificationResult === 'CONFIRMED', `Simulation transitioned CallLog to CONFIRMED`);

  // Clean up test call logs
  await CallLog.deleteOne({ _id: testCallLog._id });
  await CallLog.deleteOne({ _id: simCall._id });

  await mongoose.disconnect();

  console.log('\n=====================================================================');
  console.log(`📊 TEST RESULTS: ${passed}/${passed + failed} PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('=====================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPlivoSignatureTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
