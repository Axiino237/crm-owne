const express = require('express');
const router = express.Router();
const { Lead, User, Organization, Permission } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get closed (converted) sales/leads with granular (All vs Own) scoping
// @route  GET /api/closed-sales
router.get('/', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;

    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';

    // Check permissions for closed_sales (All vs Own)
    let hasAllAccess = isSuper;
    let hasOwnAccess = isSuper;

    if (!isSuper && req.user.roleId) {
      const perms = await Permission.findAll({
        where: {
          roleId: req.user.roleId,
          module: 'closed_sales',
          screen: { [Op.in]: ['closed-sales-all', 'closed-sales-list'] }
        }
      });
      hasAllAccess = perms.some(p => p.screen === 'closed-sales-all' && p.canView);
      hasOwnAccess = perms.some(p => p.screen === 'closed-sales-list' && p.canView);
    }

    // If user has neither permission, deny access
    if (!hasAllAccess && !hasOwnAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You don't have permission to view closed sales."
      });
    }

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

    // ── Apply Scoping based on Permission ──
    // 1. If hasAllAccess: Show everyone's closed sales (within org if not superadmin)
    // 2. If ONLY hasOwnAccess (and NOT hasAllAccess): STRICTLY show only user's own closed sales
    if (hasAllAccess) {
      if (!isSuper && req.user.organizationId) {
        where.organizationId = req.user.organizationId;
      }
    } else {
      // User only has Own Closed Sales permission -> strictly scope to assignedTo = req.user.id
      where.assignedTo = req.user.id;
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
      canViewAll: hasAllAccess,
      scopeType: hasAllAccess ? 'all' : 'own',
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
