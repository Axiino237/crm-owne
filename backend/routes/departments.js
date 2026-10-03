const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Department, Company, Organization, User } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// @desc    Get all departments
// @route   GET /api/departments
router.get('/', checkPermission('departments', 'departments-list', 'canView'), async (req, res) => {
  try {
    const { search = '', companyId, organizationId, page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (companyId) where.companyId = companyId;
    if (organizationId) where.organizationId = organizationId;

    if (!req.user.isSuperAdmin && req.user.companyId) where.companyId = req.user.companyId;
    else if (!req.user.isSuperAdmin && req.user.organizationId) where.organizationId = req.user.organizationId;

    const { count, rows } = await Department.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    res.json({ success: true, total: count, departments: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Dropdown
// @route   GET /api/departments/all
router.get('/all', async (req, res) => {
  try {
    const { companyId } = req.query;
    const where = { isActive: true };
    if (companyId) where.companyId = companyId;
    if (!req.user.isSuperAdmin && req.user.companyId) where.companyId = req.user.companyId;

    const departments = await Department.findAll({
      where,
      attributes: ['id', 'name', 'code', 'companyId'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single department
// @route   GET /api/departments/:id
router.get('/:id', checkPermission('departments', 'departments-list', 'canView'), async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create department
// @route   POST /api/departments
router.post('/', adminOnly, checkPermission('departments', 'departments-list', 'canCreate'), async (req, res) => {
  try {
    const { name, code, companyId, organizationId, description, headId } = req.body;
    if (!name || !companyId || !organizationId) {
      return res.status(400).json({ success: false, message: 'Name, company and organization are required' });
    }

    const dept = await Department.create({
      name, 
      code: code ? code.toUpperCase() : undefined, 
      companyId, organizationId,
      description, headId: headId || null, createdById: req.user.id
    });

    const created = await Department.findByPk(dept.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }
      ]
    });

    res.status(201).json({ success: true, message: 'Department created successfully', department: created });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Department code already exists in this company' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update department
// @route   PUT /api/departments/:id
router.put('/:id', adminOnly, checkPermission('departments', 'departments-list', 'canEdit'), async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const { headId, ...rest } = req.body;
    const updates = { ...rest };
    if (headId !== undefined) updates.headId = headId || null;

    await dept.update(updates);

    const updated = await Department.findByPk(dept.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({ success: true, message: 'Department updated successfully', department: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get department mapped dependencies (to check before delete)
// @route   GET /api/departments/:id/dependencies
router.get('/:id/dependencies', adminOnly, async (req, res) => {
  try {
    const { User } = require('../models');
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const users = await User.findAll({
      where: { departmentId: req.params.id },
      attributes: ['id', 'name', 'email']
    });

    const canDelete = users.length === 0;
    const blockReasons = [];

    if (users.length > 0) {
      blockReasons.push({
        type: 'Users',
        count: users.length,
        items: users.map(u => `${u.name} (${u.email})`),
        actionRequired: `You must delete or reassign these ${users.length} user(s) in this department first.`
      });
    }

    res.json({
      success: true,
      canDelete,
      name: dept.name,
      code: dept.code,
      mappedItems: {
        users
      },
      blockReasons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
router.delete('/:id', adminOnly, checkPermission('departments', 'departments-list', 'canDelete'), async (req, res) => {
  const { sequelize } = require('../config/db');
  const t = await sequelize.transaction();
  try {
    const { User } = require('../models');
    const dept = await Department.findByPk(req.params.id, { transaction: t });
    if (!dept) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const users = await User.findAll({ where: { departmentId: req.params.id }, attributes: ['id', 'name', 'email'], transaction: t });
    if (users.length > 0) {
      await t.rollback();
      const userNames = users.map(u => u.name).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${users.length} user(s) assigned to this department (${userNames}). You must delete or reassign them first.`,
        mappedType: 'users',
        mappedItems: users
      });
    }

    await dept.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
