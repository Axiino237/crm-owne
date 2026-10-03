const { Department, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Determine scope and permissions for a user:
 * - Super Admin: system-wide
 * - Org Admin: entire organization
 * - Company Admin: entire company
 * - Department Head / Manager: all members across their managed department(s)
 * - Regular Member: only their own assigned records
 */
async function getDeptHeadScope(user) {
  if (!user) {
    return {
      isSuper: false,
      isOrgAdmin: false,
      isCompanyAdmin: false,
      isDeptHead: false,
      isRegular: true,
      managedDeptIds: [],
      teamUserIds: []
    };
  }

  const userRole = user.role?.level;
  const isSuper = Boolean(user.isSuperAdmin || userRole === 'super_admin');
  const isOrgAdmin = userRole === 'org_admin';
  const isCompanyAdmin = userRole === 'company_admin';
  const isDeptManagerRole = userRole === 'dept_manager';

  if (isSuper || isOrgAdmin || isCompanyAdmin) {
    return {
      isSuper,
      isOrgAdmin,
      isCompanyAdmin,
      isDeptHead: false,
      isRegular: false,
      managedDeptIds: [],
      teamUserIds: []
    };
  }

  // Find all departments in the user's organization (or company)
  const deptWhere = {};
  if (user.organizationId) deptWhere.organizationId = user.organizationId;
  else if (user.companyId) deptWhere.companyId = user.companyId;

  const allDepts = await Department.findAll({
    where: deptWhere,
    attributes: ['id', 'name', 'headId', 'hierarchyLayers', 'companyId']
  });

  const managedDeptIds = new Set();

  for (const dept of allDepts) {
    // 1. Direct headId match
    if (dept.headId && dept.headId === user.id) {
      managedDeptIds.add(dept.id);
      continue;
    }

    // 2. Hierarchy layers check
    const layers = Array.isArray(dept.hierarchyLayers) ? dept.hierarchyLayers : [];
    if (layers.length > 0) {
      // Layer 0 is Head of Department by default
      const layer0 = layers[0];
      if (layer0 && Array.isArray(layer0.userIds) && layer0.userIds.includes(user.id)) {
        managedDeptIds.add(dept.id);
        continue;
      }

      // Any layer named with 'head', 'hod', 'manager', or 'lead'
      const isLeadInAny = layers.some(l => {
        const name = (l.name || '').toLowerCase();
        return (
          (name.includes('head') || name.includes('hod') || name.includes('manager') || name.includes('lead')) &&
          Array.isArray(l.userIds) &&
          l.userIds.includes(user.id)
        );
      });

      if (isLeadInAny) {
        managedDeptIds.add(dept.id);
        continue;
      }
    }
  }

  // If user has role level 'dept_manager' and has a departmentId
  if (isDeptManagerRole && user.departmentId) {
    managedDeptIds.add(user.departmentId);
  }

  const isDeptHead = managedDeptIds.size > 0;
  let teamUserIds = [];

  if (isDeptHead) {
    const deptUsers = await User.findAll({
      where: { departmentId: { [Op.in]: Array.from(managedDeptIds) } },
      attributes: ['id']
    });
    teamUserIds = deptUsers.map(u => u.id);
    if (!teamUserIds.includes(user.id)) {
      teamUserIds.push(user.id);
    }
  }

  return {
    isSuper: false,
    isOrgAdmin: false,
    isCompanyAdmin: false,
    isDeptHead,
    isRegular: !isDeptHead,
    managedDeptIds: Array.from(managedDeptIds),
    teamUserIds
  };
}

module.exports = { getDeptHeadScope };
