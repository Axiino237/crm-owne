const { AuditLog } = require('../models');

const logAction = async (req, action, module, targetId = null, targetName = null, details = null) => {
  try {
    const userId = req.user ? req.user.id : null;
    const userName = req.user ? req.user.name : 'System';
    const userEmail = req.user ? req.user.email : 'system@crm.com';
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || null;

    let detailsStr = details;
    if (details && typeof details === 'object') {
      detailsStr = JSON.stringify(details, null, 2);
    }

    await AuditLog.create({
      userId,
      userName,
      userEmail,
      action,
      module,
      targetId: targetId ? String(targetId) : null,
      targetName: targetName ? String(targetName) : null,
      ipAddress,
      details: detailsStr
    });
  } catch (err) {
    console.error('❌ Failed to create audit log:', err.message);
  }
};

module.exports = { logAction };
