const AuditLog = require('../models/AuditLog');

const logAudit = async (req, action, entityType, entityId, details) => {
  try {
    const actorId = req.admin ? req.admin._id : null;
    const actorName = req.admin ? req.admin.fullName : 'System Scheduler';
    const actorEmail = req.admin ? req.admin.email : 'system@guardconnect.io';
    const companyId = req.companyId || req.admin?.companyId;

    if (!companyId) return;

    await AuditLog.create({
      companyId,
      actorId,
      actorName,
      actorEmail,
      action,
      entityType,
      entityId: String(entityId || ''),
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1',
    });
  } catch (error) {
    console.error('[Audit Log Error]', error.message);
  }
};

module.exports = { logAudit };
