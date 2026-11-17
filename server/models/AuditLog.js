const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    actorName: {
      type: String,
      default: 'System Admin',
    },
    actorEmail: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'COMPANY_REGISTER',
        'GUARD_CREATE',
        'GUARD_UPDATE',
        'GUARD_DEACTIVATE',
        'SHIFT_CREATE',
        'SHIFT_UPDATE',
        'SHIFT_ASSIGN',
        'SHIFT_DEACTIVATE',
        'SHIFT_DELETE',
        'SITE_CREATE',
        'SITE_UPDATE',
        'SITE_DEACTIVATE',
        'SITE_DELETE',
        'SUPERVISOR_CREATE',
        'SUPERVISOR_UPDATE',
        'SUPERVISOR_DEACTIVATE',
        'SUPERVISOR_DELETE',
        'CALL_TRIGGERED',
        'CALL_DTMF_RECEIVED',
        'SETTINGS_UPDATE',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET',
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DEACTIVATE',
        'USER_ACTIVATE',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
    },
    details: {
      type: String,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
