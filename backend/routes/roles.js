const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Role, Organization, Company, Permission } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// GET /api/roles (paginated with search)
router.get('/', checkPermission('roles', 'roles-list', 'canView'), async (req, res) => {
  try {
    const { search = '' } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (!req.user.isSuperAdmin) where.level = { [Op.notIn]: ['super_admin'] };

    const roles = await Role.findAll({
      where,
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/roles/all (for dropdowns)
router.get('/all', async (req, res) => {
  try {
    const roles = await Role.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code', 'level'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/roles/:id
router.get('/:id', checkPermission('roles', 'roles-list', 'canView'), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] }
      ]
    });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/roles
router.post('/', adminOnly, checkPermission('roles', 'roles-list', 'canCreate'), async (req, res) => {
  try {
    const { name, code, description, level, organizationId, companyId } = req.body;
    if (!name)
      return res.status(400).json({ success: false, message: 'Name is required' });

    let finalCode = code?.toUpperCase();
    if (finalCode) {
      const existing = await Role.findOne({ where: { code: finalCode } });
      if (existing) return res.status(400).json({ success: false, message: 'Role code already exists' });
    }

    const role = await Role.create({
      name, 
      code: finalCode || undefined, 
      description,
      level: level || 'user',
      organizationId: organizationId || null,
      companyId: companyId || null,
      createdById: req.user.id
    });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'roles', role.id, role.name, `Created role "${role.name}"`);

    res.status(201).json({ success: true, message: 'Role created successfully', role });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/roles/:id
router.put('/:id', adminOnly, checkPermission('roles', 'roles-list', 'canEdit'), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) return res.status(403).json({ success: false, message: 'Cannot edit system role' });

    const { name, description, level, isActive, organizationId, companyId } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (level) updates.level = level;
    if (isActive !== undefined) updates.isActive = isActive;
    if (organizationId !== undefined) updates.organizationId = organizationId || null;
    if (companyId !== undefined) updates.companyId = companyId || null;

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'roles', role.id, role.name, {
      description: `Updated role "${role.name}"`,
      changes: updates
    });

    res.json({ success: true, message: 'Role updated successfully', role });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', adminOnly, checkPermission('roles', 'roles-list', 'canDelete'), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) return res.status(403).json({ success: false, message: 'Cannot delete system role' });

    const { User, Permission } = require('../models');
    const usersCount = await User.count({ where: { roleId: role.id } });
    if (usersCount > 0)
      return res.status(400).json({ success: false, message: `Cannot delete: ${usersCount} user(s) assigned this role` });

    await role.destroy();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'roles', role.id, role.name, `Deleted role "${role.name}"`);

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
