const express = require('express');
const router = express.Router();
const { Lead, User, Organization } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get all closed (converted) sales/leads
// @route  GET /api/closed-sales
router.get('/', checkPermission('closed_sales', 'closed-sales-list', 'canView'), async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    
    // Base filter: Only status 'converted'
    const where = {
      status: 'converted'
    };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Role-based scoping
    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
    const isOrgAdmin = userRole === 'org_admin';
    const isCompanyAdmin = userRole === 'company_admin';
    const isDeptManager = userRole === 'dept_manager';
    const isRegular = userRole === 'user';

    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        where.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        // Enforce company scoping
        // Note: Lead doesn't have companyId directly, but we scope it by matching users in that company, or we can check org if needed.
        // Let's find all user IDs in the same company:
        const companyUserIds = (await User.findAll({
          where: { companyId: req.user.companyId },
          attributes: ['id']
        })).map(u => u.id);
        where.assignedTo = { [Op.or]: [{ [Op.in]: companyUserIds }, null] };
      } else if (isDeptManager && req.user.departmentId) {
        // Enforce department scoping
        const deptUserIds = (await User.findAll({
          where: { departmentId: req.user.departmentId },
          attributes: ['id']
        })).map(u => u.id);
        where.assignedTo = { [Op.or]: [{ [Op.in]: deptUserIds }, null] };
      } else if (isRegular) {
        // Enforce self scoping
        where.assignedTo = req.user.id;
      }
    }

    const { count, rows } = await Lead.findAndCountAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
      ],
      order: [['updatedAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    res.json({
      success: true,
      total: count,
      page: Number(page),
      limit: Number(limit),
      leads: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
