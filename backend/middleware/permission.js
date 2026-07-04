const { Permission } = require('../models');

const checkPermission = (module, screen, action = 'canView') => {
  return async (req, res, next) => {
    try {
      if (!req.user.roleId)
        return res.status(403).json({ success: false, message: 'No role assigned' });

      const permission = await Permission.findOne({
        where: { roleId: req.user.roleId, module, screen }
      });

      if (!permission || !permission[action]) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You don't have ${action} permission on ${module}/${screen}`
        });
      }

      req.permission = permission;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Permission check failed', error: error.message });
    }
  };
};

module.exports = { checkPermission };
