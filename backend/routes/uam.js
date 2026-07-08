const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Role, Organization, Company, Department } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// GET /api/uam/users
router.get('/users', checkPermission('uam', 'users-list', 'canView'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', companyId, departmentId } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    // Scope: super admin sees all, others scoped to their org
    if (!req.user.isSuperAdmin && req.user.organizationId)
      where.organizationId = req.user.organizationId;

    // Optional filters for dropdowns (e.g. dept head selection)
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'resetOTP', 'resetOTPExpiry', 'resetToken', 'resetTokenExpiry'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    res.json({ success: true, total: count, page: Number(page), limit: Number(limit), users: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/uam/users/:id
router.get('/users/:id', checkPermission('uam', 'users-list', 'canView'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'resetOTP', 'resetOTPExpiry', 'resetToken', 'resetTokenExpiry'] },
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/uam/users
router.post('/users', checkPermission('uam', 'users-list', 'canCreate'), async (req, res) => {
  try {
    const { name, email, password, phone, roleId, organizationId, companyId, departmentId } = req.body;
    if (!name || !email || !password || !roleId)
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const role = await Role.findByPk(roleId);
    if (!role) return res.status(400).json({ success: false, message: 'Invalid role' });
    if (role.level === 'super_admin')
      return res.status(403).json({ success: false, message: 'Cannot create Super Admin via UAM' });

    const user = await User.create({
      name, email: email.toLowerCase(), password, phone,
      roleId, organizationId: organizationId || null,
      companyId: companyId || null,
      departmentId: departmentId || null,
      createdById: req.user.id
    });

    const created = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'uam', user.id, user.name, `Created user ${user.name} (${user.email})`);

    res.status(201).json({ success: true, message: 'User created successfully', user: created });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/uam/users/:id
router.put('/users/:id', checkPermission('uam', 'users-list', 'canEdit'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isSuperAdmin) return res.status(403).json({ success: false, message: 'Cannot edit Super Admin' });

    const { name, email, phone, roleId, organizationId, companyId, departmentId, isActive } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (roleId) updates.roleId = roleId;
    if (organizationId !== undefined) updates.organizationId = organizationId || null;
    if (companyId !== undefined) updates.companyId = companyId || null;
    if (departmentId !== undefined) updates.departmentId = departmentId || null;
    if (isActive !== undefined) updates.isActive = isActive;

    await user.update(updates);

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'uam', user.id, user.name, {
      description: `Updated user ${user.name} (${user.email})`,
      changes: updates
    });

    res.json({ success: true, message: 'User updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// DELETE /api/uam/users/:id
router.delete('/users/:id', checkPermission('uam', 'users-list', 'canDelete'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isSuperAdmin) return res.status(403).json({ success: false, message: 'Cannot delete Super Admin' });
    if (user.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete your own account' });

    await user.destroy();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'uam', user.id, user.name, `Deleted user ${user.name} (${user.email})`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/uam/my-permissions
router.get('/my-permissions', async (req, res) => {
  try {
    const { Permission } = require('../models');
    const permissions = await Permission.findAll({ where: { roleId: req.user.roleId } });
    res.json({ success: true, isSuperAdmin: req.user.isSuperAdmin, permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
