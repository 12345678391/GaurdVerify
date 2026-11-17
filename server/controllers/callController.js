const mongoose = require('mongoose');
const CallLog = require('../models/CallLog');
const Guard = require('../models/Guard');
const plivoService = require('../services/plivoService');
const { logAudit } = require('../middleware/audit');

// @desc    Initiate Outgoing Verification Call
// @route   POST /api/calls/initiate
// @access  Private
exports.initiateCall = async (req, res) => {
  try {
    const { guardId, forceSimulation = false } = req.body;

    if (!guardId) {
      return res.status(400).json({ success: false, message: 'guardId is required.' });
    }

    const guard = await Guard.findOne({ _id: guardId, companyId: req.companyId });
    if (!guard) {
      return res.status(404).json({ success: false, message: 'Guard not found.' });
    }

    const result = await plivoService.initiateVerificationCall({
      guardId,
      retryAttempt: 0,
      forceSimulation,
      companyId: req.companyId,
    });

    await logAudit(
      req,
      'CALL_TRIGGERED',
      'Call',
      result.callLog?._id,
      `Triggered verification call to ${guard.fullName} (${guard.mobileNumber}) [Mode: ${result.mode}]`
    );

    res.status(200).json({
      success: true,
      message: 'Verification call initiated.',
      data: result.callLog,
      mode: result.mode,
      warning: result.warning,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Call Logs History with filters
// @route   GET /api/calls/history
// @access  Private
exports.getCallHistory = async (req, res) => {
  try {
    const {
      search,
      status,
      result,
      site,
      shift,
      startDate,
      endDate,
      page = 1,
      limit = 15,
      sortBy = 'initiationTime',
      sortOrder = 'desc',
    } = req.query;

    const query = {};
    if (req.companyId) {
      query.companyId = req.companyId;
    } else if (req.isSuperAdmin && req.query.companyId) {
      query.companyId = req.query.companyId;
    }

    if (status) query.callStatus = status;
    if (result) query.verificationResult = result;
    if (site) query.siteId = site;
    if (shift) query.shiftId = shift;

    if (startDate || endDate) {
      query.initiationTime = {};
      if (startDate) query.initiationTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.initiationTime.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await CallLog.countDocuments(query);
    const logs = await CallLog.find(query)
      .populate('guardId', 'fullName guardId mobileNumber employeeId')
      .populate('siteId', 'siteName siteId city')
      .populate('shiftId', 'shiftName startTime endTime')
      .populate('supervisorId', 'fullName mobileNumber')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitNum);

    // Filter by search term in memory if guard fields searched
    let filteredLogs = logs;
    if (search) {
      const q = search.toLowerCase();
      filteredLogs = logs.filter(
        (item) =>
          item.guardId?.fullName?.toLowerCase().includes(q) ||
          item.guardId?.guardId?.toLowerCase().includes(q) ||
          item.destinationNumber?.includes(q) ||
          item.callId?.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      data: filteredLogs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Plivo Webhook: Answer
// @route   POST /api/calls/webhook/answer
// @access  Public (Plivo Webhook)
exports.plivoAnswerWebhook = async (req, res) => {
  try {
    const { callLogId } = req.query;
    if (callLogId) {
      await CallLog.findByIdAndUpdate(callLogId, {
        callStatus: 'Answered',
        answerTime: new Date(),
      });
    }

    const xml = plivoService.generateAnswerXml(callLogId);
    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Plivo Answer Error]', error.message);
    res.status(500).send('<Response><Speak>An error occurred.</Speak></Response>');
  }
};

// @desc    Plivo Webhook: DTMF Input Received
// @route   POST /api/calls/webhook/dtmf
// @access  Public (Plivo Webhook)
exports.plivoDtmfWebhook = async (req, res) => {
  try {
    const { callLogId } = req.query;
    const digits = req.body?.Digits || req.body?.digits;
    const duration = req.body?.Duration || 25;

    if (callLogId) {
      if (digits) {
        await plivoService.handleDtmfResponse({
          callLogId,
          digit: String(digits).trim(),
          durationSeconds: parseInt(duration, 10),
        });
      } else {
        await plivoService.handleMissedCall({
          callLogId,
          reason: 'No DTMF received from caller',
        });
      }
    }

    const xml = plivoService.generateDtmfResponseXml(digits);
    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Plivo DTMF Error]', error.message);
    res.status(500).send('<Response><Speak>Error processing input.</Speak></Response>');
  }
};

// @desc    Plivo Webhook: Hangup
// @route   POST /api/calls/webhook/hangup
// @access  Public (Plivo Webhook)
exports.plivoHangupWebhook = async (req, res) => {
  try {
    const { callLogId } = req.query;
    const hangupCause = req.body?.HangupCause;
    const duration = req.body?.Duration || 0;

    if (callLogId) {
      await CallLog.findByIdAndUpdate(callLogId, {
        hangupCause,
        durationSeconds: parseInt(duration, 10),
        endTime: new Date(),
      });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Interactive Keypad Simulator Action (For Testing UI without physical phone)
// @route   POST /api/calls/simulate-dtmf
// @access  Private
exports.simulateDtmfAction = async (req, res) => {
  try {
    // Restrict simulation in production unless explicitly enabled for testing
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TELEPHONY_SIMULATION !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Telephony keypad simulation is restricted to development and testing environments.',
      });
    }

    const { callLogId, digit, action } = req.body;

    if (!callLogId || !mongoose.Types.ObjectId.isValid(callLogId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid callLogId is required.',
      });
    }

    // Tenant Scoping & IDOR Prevention: verify call log belongs to authenticated company
    const callLog = await CallLog.findOne({
      _id: callLogId,
      companyId: req.companyId,
    });

    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: 'Call log not found.',
      });
    }

    if (action === 'miss' || action === 'no_answer') {
      const result = await plivoService.handleMissedCall({
        callLogId: callLog._id,
        reason: 'Simulated no answer by guard phone',
      });
      return res.status(200).json({
        success: true,
        message: 'Simulated missed call successfully.',
        data: result,
      });
    }

    if (!digit || !['1', '2'].includes(String(digit))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid digit. Allowed keypad options are 1 (Confirm) or 2 (Assistance).',
      });
    }

    const result = await plivoService.handleDtmfResponse({
      callLogId: callLog._id,
      digit: String(digit),
      durationSeconds: 18,
    });

    await logAudit(
      req,
      'CALL_DTMF_RECEIVED',
      'Call',
      callLog._id,
      `Simulated keypad response "${digit}" received for call log ${callLog._id}`
    );

    res.status(200).json({
      success: true,
      message: `DTMF response ${digit} processed successfully.`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
