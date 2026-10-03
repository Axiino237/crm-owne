const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Organization, User } = require('../models');
const { protect, superAdminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// @desc    Get all organizations (Super Admin only)
// @route   GET /api/organizations
router.get('/', superAdminOnly, checkPermission('organizations', 'organizations-list', 'canView'), async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const { count, rows } = await Organization.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });
    
    res.json({ success: true, total: count, organizations: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get all organizations (dropdown - for forms)
// @route   GET /api/organizations/all
router.get('/all', async (req, res) => {
  try {
    const organizations = await Organization.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, organizations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single organization
// @route   GET /api/organizations/:id
router.get('/:id', superAdminOnly, checkPermission('organizations', 'organizations-list', 'canView'), async (req, res) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, organization: org });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create organization (Super Admin only)
// @route   POST /api/organizations
router.post('/', superAdminOnly, checkPermission('organizations', 'organization-create', 'canCreate'), async (req, res) => {
  try {
    const { name, code, description, address, phone, email, website } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    let finalCode = code?.toUpperCase();
    if (finalCode) {
      const existing = await Organization.findOne({ where: { code: finalCode } });
      if (existing) return res.status(400).json({ success: false, message: 'Organization code already exists' });
    }

    const org = await Organization.create({
      name, 
      code: finalCode || undefined, 
      description, address, phone, email, website,
      createdById: req.user.id
    });
    res.status(201).json({ success: true, message: 'Organization created successfully', organization: org });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update organization
// @route   PUT /api/organizations/:id
router.put('/:id', superAdminOnly, checkPermission('organizations', 'organization-edit', 'canEdit'), async (req, res) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    await org.update(req.body);
    res.json({ success: true, message: 'Organization updated successfully', organization: org });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get organization mapped dependencies (to check before delete)
// @route   GET /api/organizations/:id/dependencies
router.get('/:id/dependencies', superAdminOnly, async (req, res) => {
  try {
    const { Company, User, Department, Lead } = require('../models');
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const companies = await Company.findAll({
      where: { organizationId: req.params.id },
      attributes: ['id', 'name', 'code']
    });

    const users = await User.findAll({
      where: { organizationId: req.params.id },
      attributes: ['id', 'name', 'email']
    });

    const departments = await Department.findAll({
      where: { organizationId: req.params.id },
      attributes: ['id', 'name', 'code']
    });

    const leads = await Lead.findAll({
      where: { organizationId: req.params.id },
      attributes: ['id', 'name']
    });

    const canDelete = companies.length === 0 && users.length === 0;
    const blockReasons = [];

    if (companies.length > 0) {
      blockReasons.push({
        type: 'Companies',
        count: companies.length,
        items: companies.map(c => c.name + (c.code ? ` (${c.code})` : '')),
        actionRequired: `You must delete or reassign these ${companies.length} company(ies) under this organization first.`
      });
    }

    if (users.length > 0) {
      blockReasons.push({
        type: 'Users',
        count: users.length,
        items: users.map(u => `${u.name} (${u.email})`),
        actionRequired: `You must delete or reassign these ${users.length} user(s) belonging to this organization first.`
      });
    }

    res.json({
      success: true,
      canDelete,
      name: org.name,
      code: org.code,
      mappedItems: {
        companies,
        users,
        departments,
        leads
      },
      blockReasons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete organization
// @route   DELETE /api/organizations/:id
router.delete('/:id', superAdminOnly, checkPermission('organizations', 'organization-edit', 'canDelete'), async (req, res) => {
  const { sequelize } = require('../config/db');
  const t = await sequelize.transaction();
  try {
    const { 
      Company, User, Lead, DesignOrder, Attendance, 
      LeaveRequest, Holiday, Department, ChatMessage, ChatServer, Role 
    } = require('../models');

    const org = await Organization.findByPk(req.params.id, { transaction: t });
    if (!org) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const companies = await Company.findAll({ where: { organizationId: req.params.id }, attributes: ['id', 'name', 'code'], transaction: t });
    if (companies.length > 0) {
      await t.rollback();
      const compNames = companies.map(c => c.name).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${companies.length} company(ies) mapped to this organization (${compNames}). You must delete or reassign them first.`,
        mappedType: 'companies',
        mappedItems: companies
      });
    }

    const users = await User.findAll({ where: { organizationId: req.params.id }, attributes: ['id', 'name', 'email'], transaction: t });
    if (users.length > 0) {
      await t.rollback();
      const userNames = users.map(u => u.name).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${users.length} user(s) mapped to this organization (${userNames}). You must delete or reassign them first.`,
        mappedType: 'users',
        mappedItems: users
      });
    }

    // Clean up dependent records safely
    if (ChatMessage) await ChatMessage.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (ChatServer) await ChatServer.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (Holiday) await Holiday.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (LeaveRequest) await LeaveRequest.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (Attendance) await Attendance.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (DesignOrder) await DesignOrder.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (Lead) await Lead.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (Department) await Department.destroy({ where: { organizationId: req.params.id }, transaction: t });
    if (Role) await Role.update({ organizationId: null }, { where: { organizationId: req.params.id }, transaction: t });

    await org.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


module.exports = router;
