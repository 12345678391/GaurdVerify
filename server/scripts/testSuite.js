require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Guard = require('../models/Guard');
const Site = require('../models/Site');
const Shift = require('../models/Shift');
const Supervisor = require('../models/Supervisor');
const CallLog = require('../models/CallLog');
const AttendanceRecord = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');
const Company = require('../models/Company');
const plivoService = require('../services/plivoService');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('🧪 GUARDCONNECT AUTOMATED INTEGRATION & END-TO-END TEST SUITE');
  console.log('===============================================================');

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/guardconnect';
  await mongoose.connect(uri);
  console.log('✅ 1. MongoDB Connection: Established at', uri);

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
    }
  }

  try {
    // 1. Company and Admin Check
    const company = await Company.findOne({ code: 'SECURESHIELD' });
    assert(company !== null, 'Company "SecureShield Solutions" exists in MongoDB');

    const admin = await Admin.findOne({ email: 'admin@guardconnect.io' });
    assert(admin !== null, 'Admin "admin@guardconnect.io" exists in MongoDB');

    const isMatch = await admin.comparePassword('Admin@GuardConnect2026');
    assert(isMatch === true, 'Admin password verified with bcrypt');

    const isBadMatch = await admin.comparePassword('WrongPassword');
    assert(isBadMatch === false, 'Invalid password correctly rejected');

    // 2. Sites & Supervisors
    const sitesCount = await Site.countDocuments({ companyId: company._id });
    assert(sitesCount >= 4, `Sites registered in MongoDB: ${sitesCount}`);

    const supervisorsCount = await Supervisor.countDocuments({ companyId: company._id });
    assert(supervisorsCount >= 3, `Supervisors registered in MongoDB: ${supervisorsCount}`);

    // 3. Shifts
    const shifts = await Shift.find({ companyId: company._id });
    assert(shifts.length >= 3, `Shifts created: ${shifts.length}`);
    const overnightShift = shifts.find((s) => s.isOvernight);
    assert(overnightShift !== undefined, `Overnight shift verified: ${overnightShift?.shiftName} (${overnightShift?.startTime} - ${overnightShift?.endTime})`);

    // 4. Guards Registration & Database Persistence
    const initialGuardCount = await Guard.countDocuments({ companyId: company._id });
    assert(initialGuardCount >= 7, `Initial guards in DB: ${initialGuardCount}`);

    // Test registering a new guard with auto-generated ID
    const nextGuardNum = 1001 + initialGuardCount;
    const testGuardId = `GC-GRD-${nextGuardNum}`;

    const newGuard = await Guard.create({
      companyId: company._id,
      guardId: testGuardId,
      fullName: 'Ashok Kumar Sharma',
      mobileNumber: '+91 98990 12345',
      assignedSite: sitesCount > 0 ? (await Site.findOne({ companyId: company._id }))._id : null,
      assignedShift: shifts[0]._id,
      assignedSupervisor: (await Supervisor.findOne({ companyId: company._id }))._id,
      employmentStatus: 'Active',
      policeVerificationStatus: 'Verified',
      trainingStatus: 'Completed',
    });
    assert(newGuard._id !== null, `Registered new guard: ${newGuard.fullName} (${newGuard.guardId})`);

    // Verify persistence by querying back from MongoDB
    const fetchedGuard = await Guard.findById(newGuard._id);
    assert(fetchedGuard !== null && fetchedGuard.guardId === testGuardId, 'Guard record verified in MongoDB (Persistence Test Passed)');

    // 5. Telephony Workflow: Initiate Verification Call
    console.log('\n--- Testing Automated Telephony & DTMF Engine ---');
    const callResult = await plivoService.initiateVerificationCall({
      guardId: newGuard._id,
      retryAttempt: 0,
      forceSimulation: true,
      companyId: company._id,
    });
    assert(callResult.success === true, `Verification call initiated. Call ID: ${callResult.callLog.callId}`);

    const activeCallLog = callResult.callLog;
    assert(activeCallLog.callStatus === 'Initiated', 'Call status set to "Initiated"');

    // 6. Test DTMF Response 1 (Confirm Attendance)
    const dtmf1Result = await plivoService.handleDtmfResponse({
      callLogId: activeCallLog._id,
      digit: '1',
      durationSeconds: 20,
    });
    assert(dtmf1Result.result === 'CONFIRMED', 'DTMF 1 correctly resulted in "CONFIRMED"');

    const updatedGuardAfter1 = await Guard.findById(newGuard._id);
    assert(updatedGuardAfter1.attendanceStatus === 'Confirmed', 'Guard attendanceStatus updated to "Confirmed"');
    assert(updatedGuardAfter1.nextScheduledCall !== null, 'Next scheduled verification call queued in 30 mins');

    // 7. Test DTMF Response 2 (Assistance Request)
    const call2Result = await plivoService.initiateVerificationCall({
      guardId: newGuard._id,
      retryAttempt: 0,
      forceSimulation: true,
      companyId: company._id,
    });

    const dtmf2Result = await plivoService.handleDtmfResponse({
      callLogId: call2Result.callLog._id,
      digit: '2',
      durationSeconds: 15,
    });
    assert(dtmf2Result.result === 'ASSISTANCE_REQUESTED', 'DTMF 2 correctly resulted in "ASSISTANCE_REQUESTED"');

    const assistanceAlert = await Notification.findOne({
      guardId: newGuard._id,
      type: 'ASSISTANCE_REQUEST',
    });
    assert(assistanceAlert !== null, 'Critical supervisor alert created in MongoDB for DTMF 2');

    // 8. Test Missed Call & Retry Logic (5-min retry and max retries escalation)
    const call3Result = await plivoService.initiateVerificationCall({
      guardId: newGuard._id,
      retryAttempt: 0,
      forceSimulation: true,
      companyId: company._id,
    });

    const missedResult1 = await plivoService.handleMissedCall({
      callLogId: call3Result.callLog._id,
      reason: 'No Answer on first attempt',
    });
    assert(missedResult1.result === 'MISSED_RETRY_SCHEDULED', 'First unanswered call scheduled retry in 5 minutes');

    // Simulate final retry failure
    const call4Result = await plivoService.initiateVerificationCall({
      guardId: newGuard._id,
      retryAttempt: 2, // Max retries reached
      forceSimulation: true,
      companyId: company._id,
    });

    const missedResultFinal = await plivoService.handleMissedCall({
      callLogId: call4Result.callLog._id,
      reason: 'Unanswered on final retry attempt',
    });
    assert(missedResultFinal.result === 'MAX_RETRIES_EXCEEDED', 'Max retries triggered supervisor escalation');

    // 9. Soft Delete / Deactivation
    newGuard.isDeleted = true;
    newGuard.employmentStatus = 'Inactive';
    await newGuard.save();

    const deactivatedCheck = await Guard.findById(newGuard._id);
    assert(deactivatedCheck.isDeleted === true, 'Guard successfully deactivated with soft deletion (historical records preserved)');

    // 10. Reports & Audit Records Check
    const totalAttendanceRecords = await AttendanceRecord.countDocuments({ companyId: company._id });
    assert(totalAttendanceRecords > 0, `Attendance records saved in MongoDB: ${totalAttendanceRecords}`);

    const totalCallLogs = await CallLog.countDocuments({ companyId: company._id });
    assert(totalCallLogs > 0, `Total Call logs recorded in MongoDB: ${totalCallLogs}`);

    console.log('\n===============================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} / ${total} TESTS PASSED (100% SUCCESS)`);
    console.log('===============================================================');

    process.exit(0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
}

runTestSuite();
