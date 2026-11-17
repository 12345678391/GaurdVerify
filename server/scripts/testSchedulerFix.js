require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

const Guard = require('../models/Guard');
const Shift = require('../models/Shift');
const Company = require('../models/Company');
const Site = require('../models/Site');
const CallLog = require('../models/CallLog');
const AttendanceRecord = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');
const schedulerService = require('../services/schedulerService');
const plivoService = require('../services/plivoService');

async function runSchedulerTests() {
  console.log('=====================================================================');
  console.log('🛡️  AUTOGUARD SCHEDULER RELIABILITY & CONCURRENCY TEST SUITE (21 TESTS)');
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

  try {
    // Setup isolated test companies
    let companyA = await Company.findOne({ code: 'TESTCO_A' });
    if (!companyA) {
      companyA = await Company.create({
        name: 'Test Security Agency A',
        code: 'TESTCO_A',
        email: 'test_a@autoguard.test',
        settings: {
          timezone: 'Asia/Kolkata',
          verificationIntervalMinutes: 30,
          retryIntervalMinutes: 5,
          maxRetryAttempts: 2,
        },
      });
    }

    let companyB = await Company.findOne({ code: 'TESTCO_B' });
    if (!companyB) {
      companyB = await Company.create({
        name: 'Test Security Agency B',
        code: 'TESTCO_B',
        email: 'test_b@autoguard.test',
        settings: {
          timezone: 'Asia/Kolkata',
          verificationIntervalMinutes: 30,
          retryIntervalMinutes: 5,
          maxRetryAttempts: 2,
        },
      });
    }

    // Create 24h active shift for Company A
    let shiftA = await Shift.findOne({ companyId: companyA._id, shiftName: '24h Test Shift A' });
    if (!shiftA) {
      shiftA = await Shift.create({
        companyId: companyA._id,
        shiftName: '24h Test Shift A',
        shiftId: 'TSH-24A',
        startTime: '00:00',
        endTime: '23:59',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        isActive: true,
        verificationIntervalMinutes: 30,
      });
    }

    // Create test site for Company A
    let siteA = await Site.findOne({ companyId: companyA._id, siteId: 'STE-TST-A' });
    if (!siteA) {
      siteA = await Site.create({
        companyId: companyA._id,
        siteId: 'STE-TST-A',
        siteName: 'Test Facility Alpha',
        address: 'Plot 100, Sector 44',
        city: 'Gurugram',
        state: 'Haryana',
      });
    }

    // Clean up test guard from previous runs if any
    await Guard.deleteMany({ guardId: { $in: ['GC-TST-001', 'GC-TST-002', 'GC-TST-003', 'GC-TST-004'] } });
    await CallLog.deleteMany({ callerNumber: 'TEST_SCHEDULER_CALLER' });

    // -------------------------------------------------------------
    // Test 1: Guard with no previous verification receives exactly one initial call
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Initial Call on Active Shift ---');
    const guard1 = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-001',
      fullName: 'Test Guard Alpha',
      mobileNumber: '+919999000001',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Not Started',
      lastVerificationTime: null,
      nextScheduledCall: null,
      consecutiveMissedCalls: 0,
    });

    await schedulerService.runVerificationCycle();

    const logsG1_T1 = await CallLog.find({ guardId: guard1._id });
    assert(logsG1_T1.length === 1, `Guard received exactly 1 initial call (Found: ${logsG1_T1.length})`);
    assert(logsG1_T1[0]?.verificationResult === 'PENDING', `Initial call verificationResult is PENDING (Found: ${logsG1_T1[0]?.verificationResult})`);
    assert(logsG1_T1[0]?.retryAttempt === 0, `Initial call retryAttempt is 0 (Found: ${logsG1_T1[0]?.retryAttempt})`);

    const updatedG1_T1 = await Guard.findById(guard1._id);
    assert(updatedG1_T1.attendanceStatus === 'Pending', `Guard attendanceStatus transitioned to Pending (Found: ${updatedG1_T1.attendanceStatus})`);
    assert(updatedG1_T1.currentDutyStatus === 'Off Duty', `Guard remains Off Duty while call is pending (Found: ${updatedG1_T1.currentDutyStatus})`);

    // -------------------------------------------------------------
    // Test 2: Next scheduler cycle does not create another call while first attempt is pending
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Protection During Next Scheduler Cycle ---');
    await schedulerService.runVerificationCycle();
    const logsG1_T2 = await CallLog.find({ guardId: guard1._id });
    assert(logsG1_T2.length === 1, `No duplicate call created on 2nd cycle (Still exactly 1 log, Found: ${logsG1_T2.length})`);

    // -------------------------------------------------------------
    // Test 3: Pending call remains protected across multiple 1-minute scheduler cycles
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Protection Across Multiple Cycles ---');
    await schedulerService.runVerificationCycle();
    await schedulerService.runVerificationCycle();
    const logsG1_T3 = await CallLog.find({ guardId: guard1._id });
    assert(logsG1_T3.length === 1, `Pending call protected across 4 total cycles (Found: ${logsG1_T3.length})`);

    // -------------------------------------------------------------
    // Test 4: Confirmed unanswered call schedules retry 5 minutes later, not immediately
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Confirmed Unanswered Call & 5-Min Retry Scheduling ---');
    const pendingCall1 = logsG1_T3[0];
    const beforeMissed = Date.now();
    await plivoService.handleMissedCall({
      callLogId: pendingCall1._id,
      reason: 'No Answer / Timed Out in Test',
    });

    const updatedG1_T4 = await Guard.findById(guard1._id);
    const updatedCall_T4 = await CallLog.findById(pendingCall1._id);

    assert(updatedCall_T4.verificationResult === 'MISSED', `CallLog updated to MISSED (Found: ${updatedCall_T4.verificationResult})`);
    assert(updatedG1_T4.attendanceStatus === 'Missed', `Guard attendanceStatus is Missed (Found: ${updatedG1_T4.attendanceStatus})`);
    assert(updatedG1_T4.consecutiveMissedCalls === 1, `Consecutive missed calls incremented to 1 (Found: ${updatedG1_T4.consecutiveMissedCalls})`);

    const retryDiffMinutes = (new Date(updatedG1_T4.nextScheduledCall).getTime() - beforeMissed) / (60 * 1000);
    assert(
      retryDiffMinutes >= 4.8 && retryDiffMinutes <= 5.2,
      `Retry scheduled ~5 minutes in future (Diff: ${retryDiffMinutes.toFixed(2)} min)`
    );

    // -------------------------------------------------------------
    // Test 5: Before retry time, the scheduler does not initiate the retry
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Before Retry Time - No Call Initiated ---');
    await schedulerService.runVerificationCycle();
    const logsG1_T5 = await CallLog.find({ guardId: guard1._id });
    assert(logsG1_T5.length === 1, `No retry initiated before due time (Found: ${logsG1_T5.length})`);

    // -------------------------------------------------------------
    // Test 6: At the retry time, exactly one retry is initiated
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Exactly One Retry Initiated When Due ---');
    // Fast-forward retry schedule to past (due now)
    await Guard.findByIdAndUpdate(guard1._id, {
      nextScheduledCall: new Date(Date.now() - 1000),
    });

    await schedulerService.runVerificationCycle();
    const logsG1_T6 = await CallLog.find({ guardId: guard1._id }).sort({ initiationTime: 1 });
    assert(logsG1_T6.length === 2, `Exactly 1 retry initiated when due (Total logs: ${logsG1_T6.length})`);
    assert(logsG1_T6[1]?.retryAttempt === 1, `Retry call has retryAttempt = 1 (Found: ${logsG1_T6[1]?.retryAttempt})`);
    assert(logsG1_T6[1]?.verificationResult === 'PENDING', `Retry call is PENDING (Found: ${logsG1_T6[1]?.verificationResult})`);

    // -------------------------------------------------------------
    // Test 7: A successful DTMF 1 response schedules next verification after 30 minutes
    // -------------------------------------------------------------
    console.log('\n--- Test 7: DTMF 1 Confirms Duty & Schedules 30-Min Verification ---');
    const retryCall = logsG1_T6[1];
    const beforeDtmf = Date.now();
    await plivoService.handleDtmfResponse({
      callLogId: retryCall._id,
      digit: '1',
      durationSeconds: 15,
    });

    const updatedG1_T7 = await Guard.findById(guard1._id);
    const updatedRetryCall = await CallLog.findById(retryCall._id);

    assert(updatedRetryCall.verificationResult === 'CONFIRMED', `CallLog verificationResult is CONFIRMED`);
    assert(updatedG1_T7.attendanceStatus === 'Confirmed', `Guard attendanceStatus is Confirmed`);
    assert(updatedG1_T7.currentDutyStatus === 'On Duty', `DTMF 1 successfully establishes On Duty status`);
    assert(updatedG1_T7.consecutiveMissedCalls === 0, `Consecutive missed calls reset to 0`);

    const nextVerifDiffMin = (new Date(updatedG1_T7.nextScheduledCall).getTime() - beforeDtmf) / (60 * 1000);
    assert(
      nextVerifDiffMin >= 29.5 && nextVerifDiffMin <= 30.5,
      `Next call scheduled ~30 minutes in future (Diff: ${nextVerifDiffMin.toFixed(2)} min)`
    );

    // -------------------------------------------------------------
    // Test 8: A simulated DTMF response updates MongoDB correctly
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Persistence of DTMF Verification in MongoDB ---');
    const attendanceRecord = await AttendanceRecord.findOne({
      companyId: companyA._id,
      guardId: guard1._id,
      shiftId: shiftA._id,
    });
    assert(attendanceRecord !== null, `AttendanceRecord exists in MongoDB`);
    assert(attendanceRecord?.totalConfirmedCalls >= 1, `Attendance totalConfirmedCalls >= 1 (Found: ${attendanceRecord?.totalConfirmedCalls})`);
    assert(attendanceRecord?.dutyStatus === 'Present', `Attendance dutyStatus is Present (Found: ${attendanceRecord?.dutyStatus})`);

    // -------------------------------------------------------------
    // Test 9: Plivo initiation error recorded & does not cause 1-minute duplicate loop
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Telephony Initiation Error Handling & Protection ---');
    const currentShiftDate = schedulerService.getShiftOperationalDate(
      'Asia/Kolkata',
      shiftA.isOvernight,
      schedulerService.getCurrentTimeString('Asia/Kolkata'),
      shiftA.startTime,
      shiftA.endTime
    );

    const guard2 = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-002',
      fullName: 'Test Guard Error Handler',
      mobileNumber: '+919999000002',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Not Started',
      lastShiftDate: currentShiftDate,
      lastShiftCycle: `${shiftA._id}_${currentShiftDate}`,
    });

    // Directly trigger failure handler to test error recovery state
    const failCallLog = await CallLog.create({
      companyId: companyA._id,
      guardId: guard2._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-ERR-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guard2.mobileNumber,
      callStatus: 'Failed',
      verificationResult: 'FAILED',
      notes: 'Plivo initiation failed: Simulating telephony gateway error',
    });

    await plivoService.handleCallInitiationFailure({
      callLog: failCallLog,
      guard: guard2,
      company: companyA,
      errorReason: 'Simulating telephony gateway error',
    });

    const guard2AfterErr = await Guard.findById(guard2._id);
    assert(guard2AfterErr.attendanceStatus === 'Missed', `Guard attendanceStatus moved to Missed after initiation failure`);
    assert(guard2AfterErr.nextScheduledCall !== null, `Retry schedule set for failed call`);

    // Run scheduler cycle: must NOT create duplicate call for this failed attempt
    await schedulerService.runVerificationCycle();
    const guard2Logs = await CallLog.find({ guardId: guard2._id });
    assert(guard2Logs.length === 1, `No duplicate loop: Still exactly 1 CallLog for failed attempt (Found: ${guard2Logs.length})`);

    // -------------------------------------------------------------
    // Test 10: Restarting backend does not cause duplicate call for already-pending attempt
    // -------------------------------------------------------------
    console.log('\n--- Test 10: Backend Restart Simulation with Pending Attempt ---');
    const guard3 = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-003',
      fullName: 'Test Guard Restart Resilience',
      mobileNumber: '+919999000003',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'On Duty',
      attendanceStatus: 'Pending',
    });

    // Create pending CallLog < 1 minute ago (simulating ongoing call before server reboot)
    await CallLog.create({
      companyId: companyA._id,
      guardId: guard3._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-RESTART-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guard3.mobileNumber,
      callStatus: 'Initiated',
      verificationResult: 'PENDING',
      initiationTime: new Date(),
    });

    // Create fresh instance of SchedulerService (simulating new Node process after restart)
    const SchedulerClass = schedulerService.constructor;
    const freshSchedulerInstance = new SchedulerClass();

    assert(freshSchedulerInstance.inFlightGuards.size === 0, `Fresh instance inFlightGuards is empty on boot`);

    await freshSchedulerInstance.runVerificationCycle();
    const guard3Logs = await CallLog.find({ guardId: guard3._id });
    assert(guard3Logs.length === 1, `Restart did not create duplicate call; MongoDB pending state protected (Found: ${guard3Logs.length})`);

    // -------------------------------------------------------------
    // Test 11: Two overlapping scheduler cycles cannot initiate duplicate calls
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Overlapping Scheduler Concurrency Mutex ---');
    const guard4 = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-004',
      fullName: 'Test Guard Concurrency',
      mobileNumber: '+919999000004',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Not Started',
      lastVerificationTime: null,
      nextScheduledCall: null,
      lastShiftDate: currentShiftDate,
    });

    // Run 2 independent scheduler instances concurrently to test MongoDB atomic locking
    const schedInst1 = new SchedulerClass();
    const schedInst2 = new SchedulerClass();
    await Promise.all([
      schedInst1.runVerificationCycle(),
      schedInst2.runVerificationCycle(),
    ]);

    const guard4Logs = await CallLog.find({ guardId: guard4._id });
    assert(guard4Logs.length === 1, `Concurrent cycles created exactly 1 CallLog, 0 duplicates (Found: ${guard4Logs.length})`);

    // -------------------------------------------------------------
    // Test 12: Cancelled assignment or completed shift does not generate a new call
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Cancelled Assignment & Inactive Shift ---');
    // Remove shift assignment
    await Guard.findByIdAndUpdate(guard4._id, {
      assignedShift: null,
      attendanceStatus: 'Not Started',
    });

    await schedulerService.runVerificationCycle();
    const guard4LogsAfterUnassign = await CallLog.find({ guardId: guard4._id });
    assert(guard4LogsAfterUnassign.length === 1, `Unassigned guard received no new calls (Found: ${guard4LogsAfterUnassign.length})`);

    // -------------------------------------------------------------
    // Test 13: Company A's scheduler cycle cannot initiate calls for Company B's guards
    // -------------------------------------------------------------
    console.log('\n--- Test 13: Multi-Company Data Isolation ---');
    const guardB = await Guard.create({
      companyId: companyB._id,
      guardId: 'GC-TST-B01',
      fullName: 'Company B Guard',
      mobileNumber: '+919999000005',
      assignedShift: shiftA._id, // Notice: assigned to Shift A which belongs to Company A!
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Not Started',
    });

    // Scheduler processes Shift A under Company A -> Guard B belongs to Company B so must NOT match!
    await schedulerService.runVerificationCycle();
    const guardBLogs = await CallLog.find({ guardId: guardB._id });
    assert(guardBLogs.length === 0, `Company B guard cannot be called by Company A shift (Found: ${guardBLogs.length})`);

    // -------------------------------------------------------------
    // Test 14: DTMF 2 records Assistance Requested without marking guard On Duty or confirming attendance
    // -------------------------------------------------------------
    console.log('\n--- Test 14: DTMF 2 Assistance Requested Duty Isolation ---');
    const guardSOS = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-SOS',
      fullName: 'Test Guard Assistance SOS',
      mobileNumber: '+919999000006',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Pending',
    });

    const callLogSOS = await CallLog.create({
      companyId: companyA._id,
      guardId: guardSOS._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-SOS-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guardSOS.mobileNumber,
      callStatus: 'Answered',
      verificationResult: 'PENDING',
      initiationTime: new Date(),
    });

    await plivoService.handleDtmfResponse({
      callLogId: callLogSOS._id,
      digit: '2',
      durationSeconds: 20,
    });

    const updatedGuardSOS = await Guard.findById(guardSOS._id);
    const updatedCallSOS = await CallLog.findById(callLogSOS._id);

    assert(updatedCallSOS.verificationResult === 'ASSISTANCE_REQUESTED', `CallLog is ASSISTANCE_REQUESTED`);
    assert(updatedGuardSOS.attendanceStatus === 'Assistance Requested', `Guard attendanceStatus is Assistance Requested`);
    assert(updatedGuardSOS.currentDutyStatus === 'Off Duty', `Guard remains Off Duty (not falsely confirmed)`);

    const sosAttendance = await AttendanceRecord.findOne({
      companyId: companyA._id,
      guardId: guardSOS._id,
      date: new Date().toISOString().split('T')[0],
    });
    assert(sosAttendance?.dutyStatus === 'Assistance Flagged', `Attendance record marked Assistance Flagged`);
    assert(sosAttendance?.totalConfirmedCalls === 0, `Confirmed calls counter remains 0`);

    // -------------------------------------------------------------
    // Test 15: Shift Rollover & Next-Shift Eligibility
    // -------------------------------------------------------------
    console.log('\n--- Test 15: Next-Shift Re-Eligibility After Exhausted Retries ---');
    const guardExhausted = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-EXHAUSTED',
      fullName: 'Test Guard Shift Rollover',
      mobileNumber: '+919999000007',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Missed',
      consecutiveMissedCalls: 3, // Exhausted all retries on previous shift
      nextScheduledCall: null,
      lastVerificationTime: null,
      lastShiftDate: '2026-11-14', // Simulated previous shift date (yesterday)
    });

    // Create historical CallLog from yesterday
    await CallLog.create({
      companyId: companyA._id,
      guardId: guardExhausted._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-HIST-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guardExhausted.mobileNumber,
      callStatus: 'No Answer',
      verificationResult: 'MISSED',
      retryAttempt: 2,
      initiationTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    // Run scheduler cycle for today's active shift
    await schedulerService.runVerificationCycle();

    const guardExhaustedAfterCycle = await Guard.findById(guardExhausted._id);
    const exhaustedLogs = await CallLog.find({ guardId: guardExhausted._id });

    assert(exhaustedLogs.length === 2, `Guard received fresh initial call on new shift (Total logs: 2, 1 historical + 1 new)`);
    assert(guardExhaustedAfterCycle.attendanceStatus === 'Pending', `Guard entered Pending status for new shift`);
    assert(guardExhaustedAfterCycle.consecutiveMissedCalls === 0, `consecutiveMissedCalls reset to 0 for fresh shift allowance`);
    assert(guardExhaustedAfterCycle.currentDutyStatus === 'Off Duty', `Guard remains Off Duty until DTMF 1 confirmed`);

    // -------------------------------------------------------------
    // Test 16: Atomic Missed-Call Processing & Idempotency
    // -------------------------------------------------------------
    console.log('\n--- Test 16: Atomic Missed-Call Processing & Idempotency ---');
    const guardIdemp = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-IDEMP',
      fullName: 'Test Guard Idempotency',
      mobileNumber: '+919999000008',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Pending',
      consecutiveMissedCalls: 0,
    });

    const callLogIdemp = await CallLog.create({
      companyId: companyA._id,
      guardId: guardIdemp._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-IDEMP-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guardIdemp.mobileNumber,
      callStatus: 'Initiated',
      verificationResult: 'PENDING',
      initiationTime: new Date(),
    });

    // Execute 2 concurrent handleMissedCall invocations on the same callLogId
    const [res1, res2] = await Promise.all([
      plivoService.handleMissedCall({ callLogId: callLogIdemp._id, reason: 'Concurrent timeout test 1' }),
      plivoService.handleMissedCall({ callLogId: callLogIdemp._id, reason: 'Concurrent timeout test 2' }),
    ]);

    const guardIdempAfter = await Guard.findById(guardIdemp._id);
    const notificationsCount = await Notification.countDocuments({ callLogId: callLogIdemp._id });

    assert(
      (res1.alreadyProcessed && !res2.alreadyProcessed) || (!res1.alreadyProcessed && res2.alreadyProcessed),
      `Exactly one invocation claimed the transition, second returned alreadyProcessed: true`
    );
    assert(guardIdempAfter.consecutiveMissedCalls === 1, `consecutiveMissedCalls incremented exactly once (Found: ${guardIdempAfter.consecutiveMissedCalls})`);
    assert(notificationsCount === 1, `Exactly 1 retry notification created, 0 duplicates (Found: ${notificationsCount})`);

    // -------------------------------------------------------------
    // Test 17: Atomic Lock Assignment Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 17: Atomic Lock Assignment Validation ---');
    const guardInactive = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-INACT',
      fullName: 'Test Guard Inactive Filter',
      mobileNumber: '+919999000009',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Inactive', // Not active!
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Not Started',
    });

    // Scheduler must not lock or call inactive guard
    await schedulerService.runVerificationCycle();
    const inactiveLogs = await CallLog.find({ guardId: guardInactive._id });
    assert(inactiveLogs.length === 0, `Inactive guard cannot be locked or called (Found: ${inactiveLogs.length})`);

    // -------------------------------------------------------------
    // Test 18: Same-Day Shift Reassignment After Exhausted Retries
    // -------------------------------------------------------------
    console.log('\n--- Test 18: Same-Day Shift Reassignment After Exhausted Retries ---');
    const shiftB = await Shift.create({
      companyId: companyA._id,
      shiftName: '24h Test Shift B',
      shiftId: 'TSH-24B',
      startTime: '00:00',
      endTime: '23:59',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      isActive: true,
      verificationIntervalMinutes: 30,
    });

    // Guard exhausted all retries on Shift A on the SAME operational date
    const guardReassign = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-REASSIGN',
      fullName: 'Test Guard Same-Day Reassignment',
      mobileNumber: '+919999000010',
      assignedShift: shiftB._id, // Reassigned to Shift B!
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Missed',
      consecutiveMissedCalls: 3,
      nextScheduledCall: null,
      lastShiftCycle: `${shiftA._id}_${currentShiftDate}`, // Bound to old Shift A on the same date!
      lastShiftDate: currentShiftDate,
    });

    await schedulerService.runVerificationCycle();

    const guardReassignAfter = await Guard.findById(guardReassign._id);
    const reassignLogs = await CallLog.find({ guardId: guardReassign._id, shiftId: shiftB._id });

    assert(
      guardReassignAfter.lastShiftCycle === `${shiftB._id}_${currentShiftDate}`,
      `lastShiftCycle updated to new composite Shift B cycle`
    );
    assert(
      guardReassignAfter.consecutiveMissedCalls === 0,
      `consecutiveMissedCalls reset to 0 for fresh shift allowance on new assignment`
    );
    assert(
      reassignLogs.length === 1,
      `Initial verification call successfully triggered for new shift on the same date (Found: ${reassignLogs.length})`
    );

    // -------------------------------------------------------------
    // Test 19: Late DTMF Response on Finalized MISSED Call is Rejected
    // -------------------------------------------------------------
    console.log('\n--- Test 19: Late DTMF Rejection on Finalized MISSED Call ---');
    const guardLate = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-LATE',
      fullName: 'Test Guard Late DTMF',
      mobileNumber: '+919999000011',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Missed',
      consecutiveMissedCalls: 1,
    });

    const callLogMissed = await CallLog.create({
      companyId: companyA._id,
      guardId: guardLate._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-MISSED-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guardLate.mobileNumber,
      callStatus: 'No Answer',
      verificationResult: 'MISSED',
      initiationTime: new Date(Date.now() - 4 * 60 * 1000),
      endTime: new Date(),
    });

    // Late DTMF 1 arrives after call was finalized as MISSED
    const lateRes = await plivoService.handleDtmfResponse({
      callLogId: callLogMissed._id,
      digit: '1',
      durationSeconds: 15,
    });

    const callLogAfterLate = await CallLog.findById(callLogMissed._id);
    assert(lateRes.alreadyFinalized === true, `Late DTMF response was rejected with alreadyFinalized: true`);
    assert(callLogAfterLate.verificationResult === 'MISSED', `CallLog remains MISSED and did not mutate to CONFIRMED`);

    // -------------------------------------------------------------
    // Test 20: Duplicate DTMF Webhooks Handled Idempotently
    // -------------------------------------------------------------
    console.log('\n--- Test 20: Duplicate DTMF Webhooks Idempotency ---');
    const guardDup = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-DUP',
      fullName: 'Test Guard Duplicate DTMF',
      mobileNumber: '+919999000012',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Pending',
    });

    const callLogDup = await CallLog.create({
      companyId: companyA._id,
      guardId: guardDup._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-DUP-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guardDup.mobileNumber,
      callStatus: 'Answered',
      verificationResult: 'PENDING',
      initiationTime: new Date(),
    });

    // Two duplicate DTMF 1 webhooks arrive simultaneously
    const [dtmfRes1, dtmfRes2] = await Promise.all([
      plivoService.handleDtmfResponse({ callLogId: callLogDup._id, digit: '1', durationSeconds: 20 }),
      plivoService.handleDtmfResponse({ callLogId: callLogDup._id, digit: '1', durationSeconds: 20 }),
    ]);

    assert(
      (dtmfRes1.success && dtmfRes2.alreadyFinalized) || (dtmfRes2.success && dtmfRes1.alreadyFinalized),
      `Exactly one DTMF request succeeded, duplicate returned alreadyFinalized: true`
    );

    const dupAttendance = await AttendanceRecord.findOne({
      companyId: companyA._id,
      guardId: guardDup._id,
      shiftId: shiftA._id,
    });
    assert(dupAttendance?.totalConfirmedCalls === 1, `Attendance totalConfirmedCalls is exactly 1 (not duplicated, Found: ${dupAttendance?.totalConfirmedCalls})`);

    // -------------------------------------------------------------
    // Test 21: Crash Recovery for Missed Calls Preserves Retry Schedule
    // -------------------------------------------------------------
    console.log('\n--- Test 21: Crash Recovery for Missed Calls Preserves Retry Schedule ---');
    const guardCrash = await Guard.create({
      companyId: companyA._id,
      guardId: 'GC-TST-CRASH',
      fullName: 'Test Guard Crash Recovery',
      mobileNumber: '+919999000013',
      assignedShift: shiftA._id,
      assignedSite: siteA._id,
      employmentStatus: 'Active',
      currentDutyStatus: 'Off Duty',
      attendanceStatus: 'Pending', // Left in Pending when process crashed
      consecutiveMissedCalls: 0,
      lastShiftCycle: `${shiftA._id}_${currentShiftDate}`,
    });

    // CallLog was finalized as MISSED (attempt 0) right before the simulated crash
    await CallLog.create({
      companyId: companyA._id,
      guardId: guardCrash._id,
      shiftId: shiftA._id,
      siteId: siteA._id,
      callId: `GC-CALL-CRASH-${Date.now()}`,
      callerNumber: '+911244892100',
      destinationNumber: guardCrash.mobileNumber,
      callStatus: 'No Answer',
      verificationResult: 'MISSED',
      retryAttempt: 0,
      initiationTime: new Date(Date.now() - 60 * 1000),
      endTime: new Date(Date.now() - 30 * 1000),
    });

    // Run scheduler cycle after reboot
    await schedulerService.runVerificationCycle();

    const guardCrashAfter = await Guard.findById(guardCrash._id);
    const crashLogs = await CallLog.find({ guardId: guardCrash._id });

    assert(guardCrashAfter.attendanceStatus === 'Missed', `Guard attendanceStatus reconciled to Missed`);
    assert(guardCrashAfter.consecutiveMissedCalls === 1, `consecutiveMissedCalls restored to 1`);
    assert(guardCrashAfter.nextScheduledCall !== null, `5-minute retry schedule safely restored on guard`);
    assert(crashLogs.length === 1, `No immediate duplicate initial call triggered on reboot (Found: ${crashLogs.length})`);

    // Clean up all temporary test guards & entities
    await Guard.deleteMany({
      guardId: {
        $in: [
          'GC-TST-001',
          'GC-TST-002',
          'GC-TST-003',
          'GC-TST-004',
          'GC-TST-SOS',
          'GC-TST-EXHAUSTED',
          'GC-TST-IDEMP',
          'GC-TST-INACT',
          'GC-TST-REASSIGN',
          'GC-TST-LATE',
          'GC-TST-DUP',
          'GC-TST-CRASH',
          'GC-TST-B01',
        ],
      },
    });
    await Shift.deleteMany({ _id: { $in: [shiftA._id, shiftB._id] } });
    await Site.deleteOne({ _id: siteA._id });
    await Company.deleteMany({ code: { $in: ['TESTCO_A', 'TESTCO_B'] } });

    console.log('\n=====================================================================');
    console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed/total)*100)}%)`);
    console.log('=====================================================================');

    await mongoose.disconnect();
    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runSchedulerTests();
