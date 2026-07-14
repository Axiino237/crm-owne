const { Permission } = require('../models');

const checkPermission = (module, screen, action = 'canView') => {
  return async (req, res, next) => {
    try {
      // Core admin modules are always accessible to Super Admin to avoid lockouts
      const isCoreAdminModule = ['uam', 'roles', 'permissions'].includes(module);
      if (req.user && req.user.isSuperAdmin && isCoreAdminModule) {
        return next();
      }

      if (!req.user.roleId)
        return res.status(403).json({ success: false, message: 'No role assigned' });

      const permission = await Permission.findOne({
        where: { roleId: req.user.roleId, module, screen }
      });

      if (!permission) {
        // Default to allow for Super Admin if no explicit record exists in DB
        if (req.user.isSuperAdmin) {
          return next();
        }
        return res.status(403).json({
          success: false,
          message: `Access denied: You don't have ${action} permission on ${module}/${screen}`
        });
      }

      if (!permission[action]) {
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
