const plivo = require('plivo');
const CallLog = require('../models/CallLog');
const Guard = require('../models/Guard');
const Shift = require('../models/Shift');
const Site = require('../models/Site');
const Supervisor = require('../models/Supervisor');
const AttendanceRecord = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');
const Company = require('../models/Company');

class PlivoService {
  constructor() {
    this.authId = process.env.PLIVO_AUTH_ID;
    this.authToken = process.env.PLIVO_AUTH_TOKEN;
    this.fromNumber = process.env.PLIVO_PHONE_NUMBER || '+919876543210';
    this.webhookBaseUrl = process.env.PLIVO_WEBHOOK_BASE_URL || 'http://localhost:5000';

    if (this.authId && this.authToken && !this.authId.includes('YOUR_')) {
      try {
        this.client = new plivo.Client(this.authId, this.authToken);
        console.log('[PlivoService] Plivo client initialized for real voice calls.');
      } catch (err) {
        console.warn('[PlivoService] Plivo init warning:', err.message);
        this.client = null;
      }
    } else {
      console.log('[PlivoService] Operating in Smart Simulator & Hybrid Mode.');
      this.client = null;
    }
  }

  getVoicePrompt(customPrompt) {
    return (
      customPrompt ||
      'Hello. This is GuardConnect Security Monitoring System. Your duty attendance verification is in progress. Press 1 to confirm that you are currently on duty. Press 2 if you need assistance.'
    );
  }

  // Generates Plivo XML for automated voice message with DTMF capture
  generateAnswerXml(callLogId) {
    const response = new plivo.Response();
    const actionUrl = `${this.webhookBaseUrl}/api/calls/webhook/dtmf?callLogId=${callLogId}`;

    const getDigits = response.addGetDigits({
      action: actionUrl,
      method: 'POST',
      timeout: 10,
      numDigits: 1,
      retries: 2,
      finishOnKey: '#',
    });

    getDigits.addSpeak(this.getVoicePrompt(), {
      language: 'en-IN',
      voice: 'WOMAN',
    });

    response.addSpeak('We did not receive your input. The call will now disconnect.', {
      language: 'en-IN',
      voice: 'WOMAN',
    });

    return response.toXML();
  }

  // Generate Plivo XML after DTMF key pressed
  generateDtmfResponseXml(digit) {
    const response = new plivo.Response();
    if (digit === '1') {
      response.addSpeak('Thank you. Your duty attendance has been successfully verified. Have a safe shift.', {
        language: 'en-IN',
        voice: 'WOMAN',
      });
    } else if (digit === '2') {
      response.addSpeak('Assistance request registered. Your supervisor has been alerted immediately.', {
        language: 'en-IN',
        voice: 'WOMAN',
      });
    } else {
      response.addSpeak('Invalid selection. Your call is now ending.', {
        language: 'en-IN',
        voice: 'WOMAN',
      });
    }
    return response.toXML();
  }

  // Initiate an outgoing verification call (real or simulated)
  async initiateVerificationCall({
    guardId,
    retryAttempt = 0,
    forceSimulation = false,
    companyId,
  }) {
    const guard = await Guard.findById(guardId)
      .populate('assignedShift')
      .populate('assignedSite')
      .populate('assignedSupervisor');

    if (!guard) {
      throw new Error(`Guard with ID ${guardId} not found.`);
    }

    const actualCompanyId = companyId || guard.companyId;
    const company = await Company.findById(actualCompanyId);
    const callerId = company?.settings?.plivoCallerId || this.fromNumber;
    const callUuid = `GC-CALL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Check if live calling is enabled and configured; otherwise run simulation
    const isRealCallCapable =
      Boolean(this.client) &&
      !forceSimulation &&
      process.env.ENABLE_REAL_PLIVO === 'true' &&
      process.env.TELEPHONY_SIMULATION !== 'true';

    // Create call log entry in MongoDB
    const callLog = await CallLog.create({
      companyId: actualCompanyId,
      guardId: guard._id,
      shiftId: guard.assignedShift?._id,
      siteId: guard.assignedSite?._id,
      supervisorId: guard.assignedSupervisor?._id,
      callId: callUuid,
      callDirection: 'Outbound',
      callerNumber: callerId,
      destinationNumber: guard.mobileNumber,
      callStatus: 'Initiated',
      verificationResult: 'PENDING',
      initiationTime: new Date(),
      retryAttempt,
      isSimulated: !isRealCallCapable,
      notes: `Verification call (Attempt #${retryAttempt + 1})${!isRealCallCapable ? ' [Simulation]' : ''}`,
    });

    // Update guard status: mark Pending and CLEAR nextScheduledCall so schedule is consumed
    // Notice: Guard remains Off Duty until DTMF 1 confirms attendance
    await Guard.findByIdAndUpdate(guard._id, {
      attendanceStatus: 'Pending',
      lastCallResponse: !isRealCallCapable ? 'Calling (Simulated)...' : 'Calling...',
      nextScheduledCall: null,
    });

    if (isRealCallCapable) {
      try {
        const answerUrl = `${this.webhookBaseUrl}/api/calls/webhook/answer?callLogId=${callLog._id}`;
        const hangupUrl = `${this.webhookBaseUrl}/api/calls/webhook/hangup?callLogId=${callLog._id}`;

        const response = await this.client.calls.create(
          callerId,
          guard.mobileNumber,
          answerUrl,
          {
            answerMethod: 'POST',
            hangupUrl,
            hangupMethod: 'POST',
            ringUrl: `${this.webhookBaseUrl}/api/calls/webhook/ring?callLogId=${callLog._id}`,
            ringMethod: 'POST',
          }
        );

        callLog.callId = response.requestUuid || callUuid;
        await callLog.save();
        return { success: true, callLog, mode: 'PLIVO_LIVE' };
      } catch (plivoErr) {
        // Redact any possible credentials or secrets from error message
        const safeError =
          plivoErr?.message?.replace(/[A-Za-z0-9_-]{20,}/g, '[REDACTED]') ||
          'Plivo call creation failed';
        console.warn(`[PlivoService] Live call attempt failed: ${safeError}`);

        callLog.callStatus = 'Failed';
        callLog.verificationResult = 'FAILED';
        callLog.endTime = new Date();
        callLog.notes = `Plivo initiation failed: ${safeError}`;
        await callLog.save();

        // Move the call into a defined failure/retry state so it does not loop
        await this.handleCallInitiationFailure({
          callLog,
          guard,
          company,
          errorReason: safeError,
        });

        return { success: false, callLog, mode: 'FAILED', error: safeError };
      }
    }

    return { success: true, callLog, mode: 'SIMULATED' };
  }

  // Handle failure to initiate a call (network error, Plivo API rejection)
  async handleCallInitiationFailure({ callLog, guard, company, errorReason = 'Initiation failure' }) {
    const maxRetries = company?.settings?.maxRetryAttempts || 2;
    const retryIntervalMinutes = company?.settings?.retryIntervalMinutes || 5;
    const now = new Date();

    const guardDoc = await Guard.findById(guard._id || guard);
    if (!guardDoc) return;

    guardDoc.attendanceStatus = 'Missed';
    guardDoc.currentDutyStatus = 'Off Duty';
    guardDoc.lastCallResponse = `Call Failed: ${errorReason}`;
    guardDoc.consecutiveMissedCalls = (guardDoc.consecutiveMissedCalls || 0) + 1;

    if (callLog.retryAttempt < maxRetries) {
      const nextRetry = new Date(now.getTime() + retryIntervalMinutes * 60 * 1000);
      guardDoc.nextScheduledCall = nextRetry;
      await guardDoc.save();

      await Notification.create({
        companyId: callLog.companyId,
        recipientType: 'Admin',
        title: `Call Initiation Failed: ${guardDoc.fullName}`,
        message: `Verification call attempt #${callLog.retryAttempt + 1} failed (${errorReason}). Automatic retry scheduled in ${retryIntervalMinutes} minutes.`,
        type: 'RETRY_ALERT',
        severity: 'warning',
        guardId: guardDoc._id,
        siteId: callLog.siteId?._id || callLog.siteId,
        callLogId: callLog._id,
      });
    } else {
      guardDoc.nextScheduledCall = null;
      await guardDoc.save();

      await Notification.create({
        companyId: callLog.companyId,
        recipientType: 'All',
        title: `CRITICAL ALERT: Call System Failed - ${guardDoc.fullName}`,
        message: `Guard ${guardDoc.fullName} (${guardDoc.guardId}) failed all ${maxRetries + 1} call attempts due to telephony failures. Supervisor notified.`,
        type: 'MISSED_CALL',
        severity: 'critical',
        guardId: guardDoc._id,
        siteId: callLog.siteId?._id || callLog.siteId,
        callLogId: callLog._id,
      });
    }
  }

  // Process DTMF Keypad response (digit 1, 2, or timeout)
  async handleDtmfResponse({ callLogId, digit, durationSeconds = 25 }) {
    if (!digit || !['1', '2'].includes(String(digit))) {
      // Invalid digit or timeout: route to handleMissedCall
      return await this.handleMissedCall({ callLogId, reason: 'Invalid or missing DTMF response' });
    }

    const now = new Date();
    const targetResult = digit === '1' ? 'CONFIRMED' : 'ASSISTANCE_REQUESTED';
    const answerNotes =
      digit === '1'
        ? 'Attendance confirmed via DTMF keypad input 1.'
        : 'Guard requested immediate assistance via DTMF keypad input 2.';

    // Atomic conditional update: ONLY transition if callLog is currently PENDING!
    // This strictly rejects late DTMF responses after timeout, and ignores duplicate webhooks.
    const callLog = await CallLog.findOneAndUpdate(
      {
        _id: callLogId,
        verificationResult: 'PENDING',
      },
      {
        $set: {
          callStatus: 'Completed',
          verificationResult: targetResult,
          dtmfResponse: digit,
          answerTime: new Date(now.getTime() - durationSeconds * 1000),
          endTime: now,
          durationSeconds,
          notes: answerNotes,
        },
      },
      { new: true }
    )
      .populate('guardId')
      .populate('siteId')
      .populate('supervisorId')
      .populate('shiftId');

    if (!callLog) {
      // Either callLog does not exist or was already finalized (e.g. MISSED by timeout, or already CONFIRMED)
      const existing = await CallLog.findById(callLogId);
      console.warn(
        `[PlivoService] DTMF input '${digit}' rejected: Call ${callLogId} is already finalized as '${existing?.verificationResult || 'NOT_FOUND'}'.`
      );
      return {
        success: false,
        alreadyFinalized: true,
        result: existing?.verificationResult || 'FINALIZED',
        message: `Call is already finalized as ${existing?.verificationResult}. Late DTMF response ignored.`,
        callLog: existing,
      };
    }

    const guard = await Guard.findById(callLog.guardId?._id || callLog.guardId);
    const todayStr = now.toISOString().split('T')[0];

    // Find or create attendance record for today (scoped to shift the call was initiated for)
    let attendance = await AttendanceRecord.findOne({
      companyId: callLog.companyId,
      guardId: guard._id,
      date: todayStr,
      shiftId: callLog.shiftId?._id || guard.assignedShift,
    });

    if (!attendance) {
      attendance = new AttendanceRecord({
        companyId: callLog.companyId,
        guardId: guard._id,
        shiftId: callLog.shiftId?._id || guard.assignedShift,
        siteId: callLog.siteId?._id || guard.assignedSite,
        date: todayStr,
        dutyStatus: digit === '1' ? 'Present' : 'Assistance Flagged',
        firstVerificationTime: now,
        totalCallsTriggered: 0,
        totalConfirmedCalls: 0,
        totalMissedCalls: 0,
        totalAssistanceRequests: 0,
        verificationLog: [],
      });
    }

    attendance.totalCallsTriggered += 1;
    attendance.lastVerificationTime = now;

    // Check if guard is still on the same shift assignment this call was placed for
    const isGuardStillOnSameShift =
      guard &&
      guard.assignedShift &&
      callLog.shiftId &&
      guard.assignedShift.toString() === (callLog.shiftId._id || callLog.shiftId).toString();

    if (digit === '1') {
      // 1: Attendance Confirmed
      attendance.totalConfirmedCalls += 1;
      attendance.dutyStatus = 'Present';

      if (guard && isGuardStillOnSameShift) {
        guard.attendanceStatus = 'Confirmed';
        guard.currentDutyStatus = 'On Duty'; // Established On Duty strictly upon DTMF 1
        guard.lastVerificationTime = now;
        guard.lastCallResponse = '1 - Confirmed';
        guard.consecutiveMissedCalls = 0;
        // Schedule next call in 30 minutes
        const interval = callLog.shiftId?.verificationIntervalMinutes || 30;
        guard.nextScheduledCall = new Date(now.getTime() + interval * 60 * 1000);
        await guard.save();
      } else if (guard && !isGuardStillOnSameShift) {
        console.warn(
          `[PlivoService] Guard ${guard.guardId} was reassigned to a different shift; old-shift DTMF 1 did not confirm attendance on new shift.`
        );
      }

      attendance.verificationLog.push({
        callLogId: callLog._id,
        time: now,
        status: 'CONFIRMED',
        dtmfResponse: '1',
        notes: 'Guard pressed 1 (On Duty)',
      });
    } else if (digit === '2') {
      // 2: Assistance Requested
      attendance.totalAssistanceRequests += 1;
      attendance.dutyStatus = 'Assistance Flagged';

      if (guard) {
        guard.attendanceStatus = 'Assistance Requested';
        // Note: Guard remains with existing duty status (Off Duty if unverified)
        guard.lastVerificationTime = now;
        guard.lastCallResponse = '2 - Assistance Needed';
        await guard.save();
      }

      // Generate Critical Notification for Admin & Supervisor
      await Notification.create({
        companyId: callLog.companyId,
        recipientType: 'All',
        title: `EMERGENCY / ASSISTANCE: ${guard?.fullName || 'Guard'} (${guard?.guardId})`,
        message: `Guard ${guard?.fullName} pressed 2 requesting immediate assistance at site "${callLog.siteId?.siteName || 'Assigned Site'}". Mobile: ${guard?.mobileNumber}.`,
        type: 'ASSISTANCE_REQUEST',
        severity: 'critical',
        guardId: guard?._id,
        siteId: callLog.siteId?._id,
        callLogId: callLog._id,
      });

      attendance.verificationLog.push({
        callLogId: callLog._id,
        time: now,
        status: 'ASSISTANCE_REQUESTED',
        dtmfResponse: '2',
        notes: 'Guard pressed 2 (Assistance Requested)',
      });
    }

    await attendance.save();

    return {
      success: true,
      result: callLog.verificationResult,
      callLog,
      attendance,
      guard,
    };
  }

  // Handle missed or unanswered calls (Retry logic: 5 min retry, then supervisor alert)
  async handleMissedCall({ callLogId, reason = 'No Answer' }) {
    const now = new Date();

    // Atomic conditional transition: Only transition if call is currently PENDING
    // This makes handleMissedCall completely idempotent across multiple instances, cycles, or webhooks
    const callLog = await CallLog.findOneAndUpdate(
      {
        _id: callLogId,
        verificationResult: 'PENDING',
      },
      {
        $set: {
          callStatus: 'No Answer',
          verificationResult: 'MISSED',
          endTime: now,
          notes: `Verification call missed: ${reason}.`,
        },
      },
      { new: true }
    )
      .populate('guardId')
      .populate('siteId')
      .populate('supervisorId')
      .populate('shiftId');

    if (!callLog) {
      // Either callLog does not exist or was already transitioned by another worker/webhook
      const existing = await CallLog.findById(callLogId);
      return {
        success: true,
        alreadyProcessed: true,
        result: existing?.verificationResult || 'MISSED',
        callLog: existing,
      };
    }

    const guard = await Guard.findById(callLog.guardId?._id || callLog.guardId);
    const company = await Company.findById(callLog.companyId);
    const maxRetries = company?.settings?.maxRetryAttempts || 2;
    const retryIntervalMinutes = company?.settings?.retryIntervalMinutes || 5;

    const todayStr = now.toISOString().split('T')[0];
    let attendance = await AttendanceRecord.findOne({
      companyId: callLog.companyId,
      guardId: guard._id,
      date: todayStr,
    });

    if (attendance) {
      attendance.totalCallsTriggered += 1;
      attendance.totalMissedCalls += 1;
      attendance.verificationLog.push({
        callLogId: callLog._id,
        time: now,
        status: 'MISSED',
        notes: `Call missed (Attempt #${callLog.retryAttempt + 1})`,
      });
      await attendance.save();
    }

    if (guard) {
      guard.attendanceStatus = 'Missed';
      guard.currentDutyStatus = 'Off Duty';
      guard.lastCallResponse = 'No Answer';
      guard.consecutiveMissedCalls = (guard.consecutiveMissedCalls || 0) + 1;

      // Check if retry is allowed
      if (callLog.retryAttempt < maxRetries) {
        const nextRetry = new Date(now.getTime() + retryIntervalMinutes * 60 * 1000);
        guard.nextScheduledCall = nextRetry;
        await guard.save();

        // Create alert for retry
        await Notification.create({
          companyId: callLog.companyId,
          recipientType: 'Admin',
          title: `Missed Verification Call: ${guard.fullName}`,
          message: `Guard ${guard.fullName} did not answer verification call attempt #${callLog.retryAttempt + 1}. Automatic retry scheduled in ${retryIntervalMinutes} minutes.`,
          type: 'RETRY_ALERT',
          severity: 'warning',
          guardId: guard._id,
          siteId: callLog.siteId?._id,
          callLogId: callLog._id,
        });

        return {
          success: true,
          result: 'MISSED_RETRY_SCHEDULED',
          retryAttempt: callLog.retryAttempt + 1,
          nextRetry,
        };
      } else {
        // Exceeded maximum retries - Escalate to Supervisor & Admin
        guard.nextScheduledCall = null;
        await guard.save();

        await Notification.create({
          companyId: callLog.companyId,
          recipientType: 'All',
          title: `CRITICAL ALERT: Guard Unresponsive - ${guard.fullName}`,
          message: `Guard ${guard.fullName} (${guard.guardId}) failed all ${maxRetries + 1} call verification attempts at site "${callLog.siteId?.siteName || 'Assigned Site'}". Supervisor notified.`,
          type: 'MISSED_CALL',
          severity: 'critical',
          guardId: guard._id,
          siteId: callLog.siteId?._id,
          callLogId: callLog._id,
        });

        return {
          success: true,
          result: 'MAX_RETRIES_EXCEEDED',
          escalated: true,
        };
      }
    }

    return { success: true, result: 'MISSED' };
  }
}

module.exports = new PlivoService();
