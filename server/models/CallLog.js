const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guard',
      required: true,
      index: true,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      index: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supervisor',
    },
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    callDirection: {
      type: String,
      default: 'Outbound',
    },
    callerNumber: {
      type: String,
      required: true,
    },
    destinationNumber: {
      type: String,
      required: true,
    },
    callStatus: {
      type: String,
      enum: ['Initiated', 'Ringing', 'Answered', 'Completed', 'Busy', 'Failed', 'No Answer'],
      default: 'Initiated',
      index: true,
    },
    dtmfResponse: {
      type: String,
      enum: ['1', '2', 'none', null],
      default: null,
    },
    verificationResult: {
      type: String,
      enum: ['CONFIRMED', 'ASSISTANCE_REQUESTED', 'MISSED', 'PENDING', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    initiationTime: {
      type: Date,
      default: Date.now,
    },
    answerTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    retryAttempt: {
      type: Number,
      default: 0,
    },
    isSimulated: {
      type: Boolean,
      default: true,
    },
    hangupCause: {
      type: String,
    },
    recordingUrl: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

CallLogSchema.index({ guardId: 1, verificationResult: 1, initiationTime: -1 });

module.exports = mongoose.model('CallLog', CallLogSchema);
