const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ['Admin', 'Supervisor', 'All'],
      default: 'Admin',
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'MISSED_CALL',
        'ASSISTANCE_REQUEST',
        'RETRY_ALERT',
        'SHIFT_START',
        'SHIFT_END',
        'GUARD_REGISTERED',
        'SHIFT_ASSIGNMENT_CHANGED',
        'SYSTEM',
      ],
      default: 'SYSTEM',
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    guardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guard',
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
    },
    callLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CallLog',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
