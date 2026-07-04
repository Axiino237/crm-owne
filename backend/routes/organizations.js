const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Organization, User } = require('../models');
const { protect, superAdminOnly } = require('../middleware/auth');

router.use(protect);

// @desc    Get all organizations (Super Admin only)
// @route   GET /api/organizations
router.get('/', superAdminOnly, async (req, res) => {
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
router.get('/:id', superAdminOnly, async (req, res) => {
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
router.post('/', superAdminOnly, async (req, res) => {
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
router.put('/:id', superAdminOnly, async (req, res) => {
  try {
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    await org.update(req.body);
    res.json({ success: true, message: 'Organization updated successfully', organization: org });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete organization
// @route   DELETE /api/organizations/:id
router.delete('/:id', superAdminOnly, async (req, res) => {
  try {
    const { Company } = require('../models');
    const companiesCount = await Company.count({ where: { organizationId: req.params.id } });
    if (companiesCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${companiesCount} company(ies) exist under this organization` });
    }

    const usersCount = await User.count({ where: { organizationId: req.params.id } });
    if (usersCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${usersCount} user(s) belong to this organization` });
    }
    const org = await Organization.findByPk(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    await org.destroy();
    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
