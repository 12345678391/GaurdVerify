const express = require('express');
const router = express.Router();
const {
  initiateCall,
  getCallHistory,
  plivoAnswerWebhook,
  plivoDtmfWebhook,
  plivoHangupWebhook,
  simulateDtmfAction,
} = require('../controllers/callController');
const { protect } = require('../middleware/auth');
const { validatePlivoWebhook } = require('../middleware/plivoWebhookAuth');

// Public Telephony Webhooks (Called by Plivo Voice servers, protected by Plivo signature validation)
router.post('/webhook/answer', validatePlivoWebhook, plivoAnswerWebhook);
router.post('/webhook/dtmf', validatePlivoWebhook, plivoDtmfWebhook);
router.post('/webhook/hangup', validatePlivoWebhook, plivoHangupWebhook);

// Protected Admin API Endpoints
router.post('/initiate', protect, initiateCall);
router.get('/history', protect, getCallHistory);
router.post('/simulate-dtmf', protect, simulateDtmfAction);

module.exports = router;
