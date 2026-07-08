const express = require('express');
const router = express.Router();
const { Permission, Role } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

const MODULE_SCREENS = {
  dashboard: [
    'dashboard-home',
    'leads-widget',
    'projects-widget',
    'pending-projects-widget',
    'completed-projects-widget',
    'total-profit-card',
    'monthly-profit-card',
    'deductions-card',
    'profit-trend-chart',
    'recent-leads-list',
    'recent-projects-list',
    'org-overview',
    'system-overview',
    'pending-designs-widget',
    'completed-designs-widget',
    'change-designs-widget',
    'total-designs-widget'
  ],
  uam: ['users-list', 'user-create', 'user-edit', 'audit-logs-list'],
  roles: ['roles-list', 'role-create', 'role-edit'],
  permissions: ['permissions-list', 'permission-edit'],
  organizations: ['organizations-list', 'organization-create', 'organization-edit'],
  companies: ['companies-list', 'company-create', 'company-edit'],
  departments: ['departments-list', 'department-create', 'department-edit'],
  leads: ['leads-list', 'lead-create', 'lead-edit', 'lead-delete'],
  quotations: ['quotations-list', 'quotation-create', 'quotation-export'],
  performance: ['performance-view'],
  closed_sales: ['closed-sales-list'],
  design: ['design-list', 'my-projects-list', 'completed-models-list'],
  attendance: ['attendance-list']
};

// @desc    Get permissions for a role
// @route   GET /api/permissions/role/:roleId
router.get('/role/:roleId', checkPermission('permissions', 'permissions-list', 'canView'), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const permissions = await Permission.findAll({ where: { roleId: req.params.roleId } });

    // Build a complete matrix with defaults for missing combos
    const matrix = {};
    for (const [module, screens] of Object.entries(MODULE_SCREENS)) {
      matrix[module] = {};
      for (const screen of screens) {
        const existing = permissions.find(p => p.module === module && p.screen === screen);
        matrix[module][screen] = existing
          ? { id: existing.id, canView: existing.canView, canCreate: existing.canCreate, canEdit: existing.canEdit, canDelete: existing.canDelete }
          : { canView: false, canCreate: false, canEdit: false, canDelete: false };
      }
    }

    res.json({ success: true, role, permissions, matrix, moduleScreens: MODULE_SCREENS });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Save/Update permissions for a role
// @route   PUT /api/permissions/role/:roleId
router.put('/role/:roleId', adminOnly, checkPermission('permissions', 'permission-edit', 'canEdit'), async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions must be an array' });
    }

    const role = await Role.findByPk(req.params.roleId);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    // Bulk upsert using transaction or simple map-promises for simplicity in Postgres
    for (const p of permissions) {
      await Permission.upsert({
        roleId: req.params.roleId,
        module: p.module,
        screen: p.screen,
        canView: !!p.canView,
        canCreate: !!p.canCreate,
        canEdit: !!p.canEdit,
        canDelete: !!p.canDelete
      }, {
        conflictFields: ['roleId', 'module', 'screen']
      });
    }

    const updatedPermissions = await Permission.findAll({ where: { roleId: req.params.roleId } });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'permissions', role.id, role.name, `Updated UAM permissions for role "${role.name}"`);

    res.json({ success: true, message: 'Permissions saved successfully', permissions: updatedPermissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get module-screen map
// @route   GET /api/permissions/modules
router.get('/modules', async (req, res) => {
  res.json({ success: true, moduleScreens: MODULE_SCREENS });
});

module.exports = router;
