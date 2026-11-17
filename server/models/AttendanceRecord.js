const mongoose = require('mongoose');

const AttendanceRecordSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true,
      index: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    dutyStatus: {
      type: String,
      enum: ['Present', 'Absent', 'Partial', 'Assistance Flagged'],
      default: 'Present',
    },
    firstVerificationTime: {
      type: Date,
    },
    lastVerificationTime: {
      type: Date,
    },
    totalCallsTriggered: {
      type: Number,
      default: 0,
    },
    totalConfirmedCalls: {
      type: Number,
      default: 0,
    },
    totalMissedCalls: {
      type: Number,
      default: 0,
    },
    totalAssistanceRequests: {
      type: Number,
      default: 0,
    },
    verificationLog: [
      {
        callLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'CallLog' },
        time: { type: Date, default: Date.now },
        status: { type: String, enum: ['CONFIRMED', 'ASSISTANCE_REQUESTED', 'MISSED', 'PENDING'] },
        dtmfResponse: { type: String },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

AttendanceRecordSchema.index({ companyId: 1, guardId: 1, date: 1, shiftId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
