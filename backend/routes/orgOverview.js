const express = require('express');
const router = express.Router();
const { Organization, Company, Department, User, Role } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

/**
 * @desc  Get Org Overview: Organizations → Companies → Departments → Users with Roles
 * @route GET /api/org-overview
 * Super admin: all orgs. Others: their own org.
 */
router.get('/', checkPermission('dashboard', 'org-overview', 'canView'), async (req, res) => {
  try {
    const orgWhere = { isActive: true };

    // Non-super admins see only their own org
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      orgWhere.id = req.user.organizationId;
    }

    const organizations = await Organization.findAll({
      where: orgWhere,
      attributes: ['id', 'name', 'code', 'email', 'phone'],
      order: [['name', 'ASC']],
      include: [
        {
          model: Company,
          as: 'companies',
          attributes: ['id', 'name', 'code', 'email', 'phone'],
          include: [
            {
              model: Department,
              as: 'departments',
              attributes: ['id', 'name', 'code', 'description'],
              include: [
                {
                  model: User,
                  as: 'members',
                  attributes: ['id', 'name', 'email', 'phone', 'isActive'],
                  include: [
                    { model: Role, as: 'role', attributes: ['id', 'name', 'code'] }
                  ]
                },
                {
                  model: User,
                  as: 'head',
                  attributes: ['id', 'name', 'email']
                }
              ]
            }
          ]
        }
      ]
    });

    // Build summary stats per org
    const result = organizations.map(org => {
      const orgData = org.toJSON();
      let totalDepts = 0;
      let totalUsers = 0;

      orgData.companies = (orgData.companies || []).map(company => {
        company.departments = (company.departments || []).map(dept => {
          const memberCount = (dept.members || []).length;
          totalDepts++;
          totalUsers += memberCount;
          return {
            ...dept,
            memberCount
          };
        });
        return company;
      });

      return {
        ...orgData,
        totalDepartments: totalDepts,
        totalUsers
      };
    });

    res.json({ success: true, organizations: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
