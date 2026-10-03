const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Company, Organization } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// @desc    Get all companies
// @route   GET /api/companies
router.get('/', checkPermission('companies', 'companies-list', 'canView'), async (req, res) => {
  try {
    const { search = '', organizationId, page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (organizationId) where.organizationId = organizationId;
    
    // Scope for non-super-admin
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const { count, rows } = await Company.findAndCountAll({
      where,
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    res.json({ success: true, total: count, companies: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Dropdown - all companies
// @route   GET /api/companies/all
router.get('/all', async (req, res) => {
  try {
    const { organizationId } = req.query;
    const where = { isActive: true };
    if (organizationId) where.organizationId = organizationId;
    if (!req.user.isSuperAdmin && req.user.organizationId) where.organizationId = req.user.organizationId;

    const companies = await Company.findAll({
      where,
      attributes: ['id', 'name', 'code', 'organizationId'],
      order: [['name', 'ASC']]
    });
    res.json({ success: true, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single company
// @route   GET /api/companies/:id
router.get('/:id', checkPermission('companies', 'companies-list', 'canView'), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }]
    });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, company });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create company
// @route   POST /api/companies
router.post('/', adminOnly, checkPermission('companies', 'companies-list', 'canCreate'), async (req, res) => {
  try {
    const { name, code, organizationId, description, address, phone, email, website } = req.body;
    if (!name || !organizationId) {
      return res.status(400).json({ success: false, message: 'Name and organization are required' });
    }

    const company = await Company.create({
      name, 
      code: code ? code.toUpperCase() : undefined, 
      organizationId,
      description, address, phone, email, website,
      createdById: req.user.id
    });

    const created = await Company.findByPk(company.id, {
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }]
    });

    res.status(201).json({ success: true, message: 'Company created successfully', company: created });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Company code already exists in this organization' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update company
// @route   PUT /api/companies/:id
router.put('/:id', adminOnly, checkPermission('companies', 'companies-list', 'canEdit'), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    await company.update(req.body);

    const updated = await Company.findByPk(company.id, {
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }]
    });

    res.json({ success: true, message: 'Company updated successfully', company: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get company mapped dependencies (to check before delete)
// @route   GET /api/companies/:id/dependencies
router.get('/:id/dependencies', adminOnly, async (req, res) => {
  try {
    const { Department, User } = require('../models');
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const departments = await Department.findAll({
      where: { companyId: req.params.id },
      attributes: ['id', 'name', 'code']
    });

    const users = await User.findAll({
      where: { companyId: req.params.id },
      attributes: ['id', 'name', 'email']
    });

    const canDelete = departments.length === 0 && users.length === 0;
    const blockReasons = [];

    if (departments.length > 0) {
      blockReasons.push({
        type: 'Departments',
        count: departments.length,
        items: departments.map(d => d.name + (d.code ? ` (${d.code})` : '')),
        actionRequired: `You must delete or reassign these ${departments.length} department(s) under this company first.`
      });
    }

    if (users.length > 0) {
      blockReasons.push({
        type: 'Users',
        count: users.length,
        items: users.map(u => `${u.name} (${u.email})`),
        actionRequired: `You must delete or reassign these ${users.length} user(s) assigned to this company first.`
      });
    }

    res.json({
      success: true,
      canDelete,
      name: company.name,
      code: company.code,
      mappedItems: {
        departments,
        users
      },
      blockReasons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete company
// @route   DELETE /api/companies/:id
router.delete('/:id', adminOnly, checkPermission('companies', 'companies-list', 'canDelete'), async (req, res) => {
  const { sequelize } = require('../config/db');
  const t = await sequelize.transaction();
  try {
    const { Department, User } = require('../models');
    const company = await Company.findByPk(req.params.id, { transaction: t });
    if (!company) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const departments = await Department.findAll({ where: { companyId: req.params.id }, attributes: ['id', 'name', 'code'], transaction: t });
    if (departments.length > 0) {
      await t.rollback();
      const deptNames = departments.map(d => d.name).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${departments.length} department(s) mapped to this company (${deptNames}). You must delete or reassign them first.`,
        mappedType: 'departments',
        mappedItems: departments
      });
    }

    const users = await User.findAll({ where: { companyId: req.params.id }, attributes: ['id', 'name', 'email'], transaction: t });
    if (users.length > 0) {
      await t.rollback();
      const userNames = users.map(u => u.name).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${users.length} user(s) mapped to this company (${userNames}). You must delete or reassign them first.`,
        mappedType: 'users',
        mappedItems: users
      });
    }

    await company.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
