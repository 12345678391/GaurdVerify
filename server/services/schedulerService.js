const cron = require('node-cron');
const Guard = require('../models/Guard');
const Shift = require('../models/Shift');
const Company = require('../models/Company');
const CallLog = require('../models/CallLog');
const plivoService = require('./plivoService');

// Pending verification call timeout window (3 minutes)
// After 3 minutes with no keypad response, a pending call is safely transitioned to MISSED
const PENDING_CALL_TIMEOUT_MS = 3 * 60 * 1000;

class SchedulerService {
  constructor() {
    this.cronTask = null;
    this.isRunning = false;
    this.isCycleRunning = false;
    this.inFlightGuards = new Set();
  }

  // Helper to check if current time falls within shift start and end times
  isTimeInShift(currentTimeStr, startTimeStr, endTimeStr, isOvernight) {
    // Times in "HH:mm" format
    if (!startTimeStr || !endTimeStr) return false;

    if (!isOvernight) {
      // Normal daytime shift (e.g. 06:00 to 14:00)
      return currentTimeStr >= startTimeStr && currentTimeStr <= endTimeStr;
    } else {
      // Overnight shift (e.g. 22:00 to 06:00)
      return currentTimeStr >= startTimeStr || currentTimeStr <= endTimeStr;
    }
  }

  // Get current time string in target timezone (Asia/Kolkata)
  getCurrentTimeString(timezone = 'Asia/Kolkata') {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(now);
  }

  // Get current weekday name in target timezone
  getCurrentDayString(timezone = 'Asia/Kolkata') {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    });
    return formatter.format(now);
  }

  // Get shift operational date string (YYYY-MM-DD) accounting for overnight shifts and timezone
  getShiftOperationalDate(timezone, isOvernight, currentTimeStr, startTimeStr, endTimeStr) {
    const now = new Date();
    if (isOvernight && currentTimeStr <= endTimeStr) {
      // Overnight shift started on the previous calendar day
      const prevDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(prevDay);
    }
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  }

  // Start the background cron scheduler
  start() {
    if (this.isRunning) return;

    console.log('[SchedulerService] Starting Shift Call Scheduler (Checks every minute)...');
    this.isRunning = true;

    // Run every minute: checks active shifts, pending retries, and verification intervals
    this.cronTask = cron.schedule('* * * * *', async () => {
      try {
        await this.runVerificationCycle();
      } catch (err) {
        console.error('[SchedulerService] Error in verification cycle:', err.message);
      }
    });

    // Run once on startup after 5 seconds
    setTimeout(() => {
      this.runVerificationCycle().catch((err) =>
        console.error('[SchedulerService] Initial cycle error:', err.message)
      );
    }, 5000);
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    this.isRunning = false;
    console.log('[SchedulerService] Shift Call Scheduler stopped.');
  }

  async runVerificationCycle() {
    // Concurrency prevention: do not allow overlapping cycles
    if (this.isCycleRunning) {
      return;
    }
    this.isCycleRunning = true;

    try {
      const now = new Date();

      // Fetch active companies
      const companies = await Company.find({ isActive: true });

      for (const company of companies) {
        const timezone = company.settings?.timezone || 'Asia/Kolkata';
        const currentTimeStr = this.getCurrentTimeString(timezone);
        const currentDayStr = this.getCurrentDayString(timezone);

        // Find all active shifts for this company
        const activeShifts = await Shift.find({
          companyId: company._id,
          isActive: true,
          isDeleted: false,
        });

        for (const shift of activeShifts) {
          // Check if shift is active today
          const workingDays = shift.workingDays || [];
          if (workingDays.length > 0 && !workingDays.includes(currentDayStr)) {
            continue; // Shift not scheduled for today
          }

          const isCurrentlyActive = this.isTimeInShift(
            currentTimeStr,
            shift.startTime,
            shift.endTime,
            shift.isOvernight
          );

          // Fetch guards assigned to this shift
          const guards = await Guard.find({
            companyId: company._id,
            assignedShift: shift._id,
            employmentStatus: 'Active',
            isDeleted: false,
          });

          for (const guard of guards) {
            const guardIdStr = guard._id.toString();

            if (!isCurrentlyActive) {
              // Shift has ended or guard is off-duty
              // If guard has transient active/missed states, reset them for the next operational cycle
              if (
                guard.currentDutyStatus !== 'Off Duty' ||
                guard.attendanceStatus !== 'Not Started' ||
                (guard.consecutiveMissedCalls || 0) > 0 ||
                guard.nextScheduledCall !== null
              ) {
                guard.currentDutyStatus = 'Off Duty';
                guard.nextScheduledCall = null;
                guard.attendanceStatus = 'Not Started';
                guard.consecutiveMissedCalls = 0;
                guard.lastVerificationTime = null;
                await guard.save();
              }
              continue;
            }

            // Step 1: Check if an active call is currently pending for this guard in MongoDB
            // Crucial: We must check pending calls BEFORE any rollover to avoid resetting state during an active call!
            const pendingCall = await CallLog.findOne({
              guardId: guard._id,
              verificationResult: 'PENDING',
            }).sort({ initiationTime: -1 });

            if (pendingCall) {
              const callAgeMs = now.getTime() - new Date(pendingCall.initiationTime).getTime();
              if (callAgeMs < PENDING_CALL_TIMEOUT_MS) {
                // Call attempt is actively pending/in-progress.
                // Protect across scheduler cycles, restarts, and shift transitions. DO NOT duplicate or reset!
                continue;
              } else {
                // Pending call has exceeded allowed window without DTMF keypad input.
                // Safely finalize stale call as MISSED before proceeding to rollover or new scheduling.
                console.log(
                  `[SchedulerService] Call ${pendingCall.callId} for ${guard.guardId} timed out (${Math.round(callAgeMs / 1000)}s). Finalizing as MISSED.`
                );
                await plivoService.handleMissedCall({
                  callLogId: pendingCall._id,
                  reason: 'Call timed out (no keypad response within allowed window)',
                });
              }
            }

            // Step 2: Shift Boundary & Reassignment Identity
            // Track composite shift cycle: "${shiftId}_${operationalDate}"
            // This guarantees fresh retry allowances when a guard is reassigned on the same date,
            // while preserving overnight shift continuity across midnight!
            const currentShiftDate = this.getShiftOperationalDate(
              timezone,
              shift.isOvernight,
              currentTimeStr,
              shift.startTime,
              shift.endTime
            );
            const currentShiftCycle = `${shift._id}_${currentShiftDate}`;

            if (guard.lastShiftCycle !== currentShiftCycle) {
              guard.lastShiftCycle = currentShiftCycle;
              guard.lastShiftDate = currentShiftDate;
              guard.currentDutyStatus = 'Off Duty'; // Guard remains Off Duty until verified via DTMF 1
              guard.attendanceStatus = 'Not Started';
              guard.consecutiveMissedCalls = 0; // Fresh retry allowance for new shift or reassignment!
              guard.lastVerificationTime = null;
              guard.nextScheduledCall = null;
              await guard.save();
            }

            // Step 3: Crash Recovery & Status Reconciliation
            // If process restarted while guard was in 'Pending' with no pending call in DB
            if (guard.attendanceStatus === 'Pending') {
              const latestLog = await CallLog.findOne({ guardId: guard._id }).sort({ initiationTime: -1 });
              if (latestLog && latestLog.verificationResult === 'MISSED') {
                guard.attendanceStatus = 'Missed';
                guard.currentDutyStatus = 'Off Duty';
                guard.consecutiveMissedCalls = (latestLog.retryAttempt || 0) + 1;
                const retryIntervalMinutes = company.settings?.retryIntervalMinutes || 5;
                const missedTime = latestLog.endTime || latestLog.initiationTime || now;
                guard.nextScheduledCall = new Date(new Date(missedTime).getTime() + retryIntervalMinutes * 60 * 1000);
                await guard.save();
              } else {
                guard.attendanceStatus = guard.consecutiveMissedCalls > 0 ? 'Missed' : 'Not Started';
                await guard.save();
              }
            }

            // Step 4: Determine if a call is due
            const intervalMs =
              (shift.verificationIntervalMinutes ||
                company.settings?.verificationIntervalMinutes ||
                30) *
              60 *
              1000;

            // Condition 1: Initial verification call when shift is active and never verified
            const isNeverCalled =
              !guard.lastVerificationTime &&
              !guard.nextScheduledCall &&
              (guard.consecutiveMissedCalls || 0) === 0 &&
              guard.attendanceStatus !== 'Missed' &&
              guard.attendanceStatus !== 'Pending';

            // Condition 2: Scheduled retry or periodic call is due
            const isScheduledCallDue = Boolean(
              guard.nextScheduledCall && new Date(guard.nextScheduledCall) <= now
            );

            // Condition 3: Periodic verification interval elapsed (fallback when nextScheduledCall not explicitly set)
            const isPeriodicDue = Boolean(
              guard.lastVerificationTime &&
                !guard.nextScheduledCall &&
                now.getTime() - new Date(guard.lastVerificationTime).getTime() >= intervalMs
            );

            if (isNeverCalled || isScheduledCallDue || isPeriodicDue) {
              // Concurrency check 1: In-flight set (same node cycle)
              if (this.inFlightGuards.has(guardIdStr)) {
                continue;
              }

              // Concurrency check 2: Database-level atomic state lock
              // Atomically transition guard attendanceStatus to 'Pending'
              // Strictly verifies companyId, assignedShift, active employment status, and un-deleted status
              const lockedGuard = await Guard.findOneAndUpdate(
                {
                  _id: guard._id,
                  companyId: company._id,
                  assignedShift: shift._id,
                  employmentStatus: 'Active',
                  isDeleted: false,
                  attendanceStatus: { $ne: 'Pending' },
                },
                {
                  $set: {
                    attendanceStatus: 'Pending',
                    lastCallResponse: 'Calling...',
                  },
                },
                { new: true }
              );

              if (!lockedGuard) {
                // Another cycle or process already acquired lock for this guard
                continue;
              }

              this.inFlightGuards.add(guardIdStr);
              try {
                console.log(
                  `[SchedulerService] Triggering automated verification call for ${guard.fullName} (${guard.guardId}) at ${currentTimeStr}`
                );

                // Retry attempt determination: preserves attempt count
                let retryAttempt = 0;
                if (guard.attendanceStatus === 'Missed' || (guard.consecutiveMissedCalls || 0) > 0) {
                  retryAttempt = guard.consecutiveMissedCalls || 0;
                }

                await plivoService.initiateVerificationCall({
                  guardId: guard._id,
                  retryAttempt,
                  forceSimulation: true, // Simulation mode as instructed
                  companyId: company._id,
                });
              } catch (callError) {
                console.error(
                  `[SchedulerService] Call initiation error for guard ${guard.guardId}:`,
                  callError.message
                );
                // Revert atomic lock on failure if callLog was not created
                await Guard.findByIdAndUpdate(guard._id, {
                  attendanceStatus: guard.attendanceStatus || 'Not Started',
                });
              } finally {
                this.inFlightGuards.delete(guardIdStr);
              }
            }
          }
        }
      }
    } finally {
      this.isCycleRunning = false;
    }
  }
}

module.exports = new SchedulerService();
