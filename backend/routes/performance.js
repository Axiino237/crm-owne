const express = require('express');
const router = express.Router();
const { Lead, User, Department, Role, DesignOrder } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { getDeptHeadScope } = require('../utils/departmentScope');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get performance statistics for department members
// @route  GET /api/performance
router.get('/', checkPermission('performance', 'performance-view', 'canView'), async (req, res) => {
  try {
    const { Permission } = require('../models');
    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
    const isOrgAdmin = userRole === 'org_admin';
    const isCompanyAdmin = userRole === 'company_admin';
    const isAdmin = isSuper || isOrgAdmin || isCompanyAdmin;

    // Check department head scope (supports multi-department heads)
    const deptScope = await getDeptHeadScope(req.user);
    const isDeptHead = deptScope.isDeptHead;
    const isManager = userRole === 'dept_manager';

    // 1. Team access check: admins, managers, dept heads, or roles with 'performance-team' permission
    let canViewTeam = isAdmin || isDeptHead || isManager;
    if (!canViewTeam && req.user.roleId) {
      const permTeam = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'performance', screen: 'performance-team', canView: true }
      });
      if (permTeam) canViewTeam = true;
    }

    // 2. All departments switch check: admins or roles with 'performance-all-departments' permission
    let canSwitchAllDepts = isAdmin;
    if (!canSwitchAllDepts && req.user.roleId) {
      const permDepts = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'performance', screen: 'performance-all-departments', canView: true }
      });
      if (permDepts) canSwitchAllDepts = true;
    }

    // Determine available departments for this user
    let availableDepts = [];
    if (canSwitchAllDepts) {
      availableDepts = await Department.findAll({
        where: isSuper ? {} : { organizationId: req.user.organizationId },
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      });
    } else if (isDeptHead && deptScope.managedDeptIds.length > 0) {
      availableDepts = await Department.findAll({
        where: { id: { [Op.in]: deptScope.managedDeptIds } },
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      });
    } else if (req.user.departmentId) {
      availableDepts = await Department.findAll({
        where: { id: req.user.departmentId },
        attributes: ['id', 'name']
      });
    }

    // Target department: default to user's own department!
    let targetDeptId = req.query.departmentId || null;
    if (targetDeptId) {
      if (!canSwitchAllDepts) {
        const isAllowed = availableDepts.some(d => String(d.id) === String(targetDeptId));
        if (!isAllowed) {
          targetDeptId = req.user.departmentId || (availableDepts[0]?.id || null);
        }
      }
    } else {
      // Default to user's own department
      if (req.user.departmentId && (canSwitchAllDepts || availableDepts.some(d => String(d.id) === String(req.user.departmentId)))) {
        targetDeptId = req.user.departmentId;
      } else if (availableDepts.length > 0) {
        targetDeptId = availableDepts[0].id;
      }
    }

    // 3. Scope handling: 'team' vs 'own'
    const requestedScope = req.query.scope; // 'team' or 'own'
    const effectiveScope = (requestedScope === 'own') ? 'own' : (canViewTeam ? 'team' : 'own');

    let userWhere = {};
    if (effectiveScope === 'own') {
      userWhere.id = req.user.id;
    } else {
      // Team scope (if permitted)
      if (targetDeptId) {
        userWhere.departmentId = targetDeptId;
      } else {
        userWhere.id = req.user.id;
      }
      if (!isSuper && req.user.organizationId) {
        userWhere.organizationId = req.user.organizationId;
      }
    }

    const deptUsers = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'phone', 'isActive', 'departmentId'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name', 'level'] }
      ]
    });

    const { year, month, day } = req.query;
    let dateWhere = null;
    let activeDateLabel = '';

    if (year) {
      const y = Number(year);
      if (month) {
        const m = Number(month);
        if (day) {
          const d = Number(day);
          const exactDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          dateWhere = exactDate;
          activeDateLabel = exactDate;
        } else {
          const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
          const lastDay = new Date(y, m, 0).getDate();
          const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          dateWhere = { [Op.between]: [startDate, endDate] };
          activeDateLabel = `${y}-${String(m).padStart(2, '0')}`;
        }
      } else {
        dateWhere = { [Op.between]: [`${y}-01-01`, `${y}-12-31`] };
        activeDateLabel = `${y}`;
      }
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      dateWhere = todayStr;
      activeDateLabel = todayStr;
    }

    // 2.5 Identify if active department is a Design department
    const activeDeptId = targetDeptId || req.user.departmentId;
    const activeDept = activeDeptId ? await Department.findByPk(activeDeptId) : null;
    const isDesignDept = activeDept
      ? (activeDept.name.toLowerCase().includes('design') || (activeDept.code && activeDept.code.toLowerCase().includes('design')))
      : false;

    // Calculate date range strings for filtering (shared across members and activities)
    let startDateStr, endDateStr;
    if (year) {
      const y = Number(year);
      if (month) {
        const m = Number(month);
        if (day) {
          const d = Number(day);
          startDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} 00:00:00`;
          endDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} 23:59:59`;
        } else {
          const lastDay = new Date(y, m, 0).getDate();
          startDateStr = `${y}-${String(m).padStart(2, '0')}-01 00:00:00`;
          endDateStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 23:59:59`;
        }
      } else {
        startDateStr = `${y}-01-01 00:00:00`;
        endDateStr = `${y}-12-31 23:59:59`;
      }
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      startDateStr = `${todayStr} 00:00:00`;
      endDateStr = `${todayStr} 23:59:59`;
    }

    // 3. Process performance stats
    const members = [];
    for (const user of deptUsers) {
      let totalAssigned = 0;
      let convertedCount = 0; // leads converted OR designs completed
      let contactedCount = 0; // calls made
      let newCount = 0;
      let inProgressCount = 0;
      let qualifiedCount = 0;
      let lostCount = 0;
      let totalClosedVal = 0;
      let netProfit = 0;

      if (isDesignDept) {
        // Design team statistics
        const designCreatedQuery = {
          assignedDesignerId: user.id,
          createdAt: { [Op.between]: [new Date(startDateStr), new Date(endDateStr)] }
        };

        [totalAssigned, convertedCount, inProgressCount, newCount] = await Promise.all([
          DesignOrder.count({ where: designCreatedQuery }),
          DesignOrder.count({ where: { ...designCreatedQuery, status: 'completed' } }),
          DesignOrder.count({ where: { ...designCreatedQuery, status: 'in_progress' } }),
          DesignOrder.count({ where: { ...designCreatedQuery, status: 'pending' } })
        ]);

        const completedDesigns = await DesignOrder.findAll({
          where: {
            assignedDesignerId: user.id,
            status: 'completed',
            createdAt: { [Op.between]: [new Date(startDateStr), new Date(endDateStr)] }
          },
          attributes: ['approxBudget'],
          raw: true
        });

        completedDesigns.forEach(d => {
          totalClosedVal += parseFloat(d.approxBudget) || 0;
        });
        netProfit = totalClosedVal; // Value generated by designer
      } else {
        // Sales / Telecaller statistics
        const createdQuery = { assignedTo: user.id, createdAt: { [Op.between]: [new Date(startDateStr), new Date(endDateStr)] } };
        const contactedQuery = { 
          assignedTo: user.id, 
          lastContactedDate: dateWhere,
          status: { [Op.ne]: 'new' } // Lead in 'new' status is NEVER counted as a call made
        };

        [totalAssigned, convertedCount, contactedCount, newCount, inProgressCount, qualifiedCount, lostCount] = await Promise.all([
          Lead.count({ where: createdQuery }),
          Lead.count({ where: { ...createdQuery, status: 'converted' } }),
          Lead.count({ where: contactedQuery }),
          Lead.count({ where: { ...createdQuery, status: 'new' } }),
          Lead.count({ where: { ...createdQuery, status: 'contacted' } }),
          Lead.count({ where: { ...createdQuery, status: 'qualified' } }),
          Lead.count({ where: { ...createdQuery, status: 'lost' } })
        ]);

        const convertedLeads = await Lead.findAll({
          where: {
            assignedTo: user.id,
            status: 'converted',
            createdAt: { [Op.between]: [new Date(startDateStr), new Date(endDateStr)] }
          },
          attributes: ['value', 'paidAmount', 'vendorPaidAmount'],
          raw: true
        });

        let totalVendorVal = 0;
        convertedLeads.forEach(l => {
          totalClosedVal += parseFloat(l.value) || 0;
          totalVendorVal += parseFloat(l.vendorPaidAmount) || 0;
        });
        netProfit = totalClosedVal - totalVendorVal;
      }

      members.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || 'User',
        isHead: Boolean(isDeptHead && user.id === req.user.id),
        stats: {
          totalAssigned,
          contactedCount,
          convertedCount,
          newCount,
          inProgressCount,
          qualifiedCount,
          lostCount,
          totalClosedVal,
          netProfit
        }
      });
    }

    // 4. Fetch activities dynamically based on department type
    let activities = [];
    if (isDesignDept) {
      const designActs = await DesignOrder.findAll({
        where: {
          assignedDesignerId: { [Op.in]: deptUsers.map(u => u.id) },
          createdAt: { [Op.between]: [new Date(startDateStr), new Date(endDateStr)] }
        },
        attributes: ['id', 'companyName', 'status', 'createdAt', 'approxBudget'],
        include: [{ model: User, as: 'designer', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']],
        limit: 50
      });
      activities = designActs.map(act => ({
        id: act.id,
        name: act.companyName,
        companyName: act.companyName,
        status: act.status,
        lastContactedDate: act.createdAt ? act.createdAt.toISOString().split('T')[0] : '',
        notes: `Approx Budget: ₹${Number(act.approxBudget || 0).toLocaleString('en-IN')}`,
        assignee: act.designer
      }));
    } else {
      activities = await Lead.findAll({
        where: { 
          assignedTo: { [Op.in]: deptUsers.map(u => u.id) }, 
          lastContactedDate: dateWhere,
          status: { [Op.ne]: 'new' }
        },
        attributes: ['id', 'name', 'companyName', 'status', 'lastContactedDate', 'nextFollowUp', 'notes'],
        include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }],
        order: [['lastContactedDate', 'DESC'], ['updatedAt', 'DESC']],
        limit: 50
      });
    }

    // Sort: head first, then by convertedCount desc
    members.sort((a, b) => {
      if (a.isHead && !b.isHead) return -1;
      if (!a.isHead && b.isHead) return 1;
      return (b.stats.convertedCount - a.stats.convertedCount);
    });

    res.json({
      success: true,
      canViewTeam,
      canSwitchAllDepts,
      scopeType: effectiveScope,
      userDepartmentId: req.user.departmentId,
      isDeptHead,
      hasTeamAccess: canViewTeam,
      isDesignDept,
      headDeptName: availableDepts.length > 0 ? (availableDepts.find(d => String(d.id) === String(targetDeptId))?.name || availableDepts[0].name) : null,
      selectedDepartmentId: targetDeptId,
      filterPeriod: year ? 'custom' : 'today',
      filterDate: activeDateLabel,
      departments: availableDepts,
      members,
      activities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
