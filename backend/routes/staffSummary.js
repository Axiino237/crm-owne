const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Role, Department, Organization, Company, LeaveRequest, Attendance, Permission } = require('../models');
const { protect } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { getDeptHeadScope } = require('../utils/departmentScope');

router.use(protect);

// Helper to determine scoping for user summary
const getScope = async (req) => {
  const userRole = req.user.role?.level;
  const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
  const isOrgAdmin = userRole === 'org_admin';
  const isCompanyAdmin = userRole === 'company_admin';
  const isAdmin = isSuper || isOrgAdmin || isCompanyAdmin;

  const deptScope = await getDeptHeadScope(req.user);
  const isDeptHead = deptScope.isDeptHead;
  const isManager = userRole === 'dept_manager';

  // 1. Overall Org / All departments check
  let canViewAllDepts = isAdmin;
  if (!canViewAllDepts && req.user.roleId) {
    const permAll = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'uam', screen: 'staff-summary-all', canView: true }
    });
    if (permAll) canViewAllDepts = true;
  }

  // 2. Own Department check
  let canViewDept = isAdmin || isDeptHead || isManager;
  if (!canViewDept && req.user.roleId) {
    const permDept = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'uam', screen: 'staff-summary-dept', canView: true }
    });
    if (permDept) canViewDept = true;
  }

  // 3. Own profile check / base access
  let hasBaseAccess = isAdmin || canViewAllDepts || canViewDept;
  if (!hasBaseAccess && req.user.roleId) {
    const permOwn = await Permission.findOne({
      where: {
        roleId: req.user.roleId,
        module: 'uam',
        screen: { [Op.in]: ['staff-summary', 'users-list'] },
        canView: true
      }
    });
    if (permOwn) hasBaseAccess = true;
  }

  let scopeType = 'own';
  if (canViewAllDepts) {
    scopeType = 'all';
  } else if (canViewDept) {
    scopeType = 'dept';
  }

  return {
    isSuper,
    isOrgAdmin,
    isCompanyAdmin,
    isAdmin,
    isDeptHead,
    isManager,
    deptScope,
    canViewAllDepts,
    canViewDept,
    hasBaseAccess,
    scopeType
  };
};

// @desc   Get comprehensive staff overview (leave taken, salary, attendance, department)
// @route  GET /api/staff-summary
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      organizationId,
      departmentId,
      roleId,
      year = new Date().getFullYear(),
      month // 1 to 12 (optional)
    } = req.query;

    const {
      isSuper,
      isOrgAdmin,
      isCompanyAdmin,
      isAdmin,
      deptScope,
      canViewAllDepts,
      canViewDept,
      hasBaseAccess,
      scopeType
    } = await getScope(req);

    if (!hasBaseAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: Staff overview permission required' });
    }

    // Build user filter
    const where = {
      isActive: true
    };

    // Organization scoping
    if (!isSuper) {
      if (!req.user.organizationId) {
        return res.json({
          success: true,
          staff: [],
          metrics: { totalStaff: 0, totalPayroll: 0, totalApprovedLeaves: 0, totalPendingLeaves: 0, avgLeavesPerStaff: 0 },
          filterOptions: { organizations: [], departments: [], roles: [] },
          canViewAllDepts,
          canViewDept,
          scopeType
        });
      }
      where.organizationId = req.user.organizationId;

      if (isCompanyAdmin && req.user.companyId) {
        where.companyId = req.user.companyId;
      }
    } else if (organizationId) {
      where.organizationId = organizationId;
    }

    // Apply Scope to User Query
    if (scopeType === 'own') {
      // Level 1: Own Profile Only
      where.id = req.user.id;
    } else if (scopeType === 'dept') {
      // Level 2: Own Department
      if (deptScope.managedDeptIds.length > 0) {
        if (departmentId && deptScope.managedDeptIds.includes(departmentId)) {
          where.departmentId = departmentId;
        } else {
          where.departmentId = { [Op.in]: deptScope.managedDeptIds };
        }
      } else if (req.user.departmentId) {
        where.departmentId = req.user.departmentId;
      } else {
        where.id = req.user.id;
      }
    } else {
      // Level 3: Overall Org (All Departments)
      if (departmentId) {
        where.departmentId = departmentId;
      }
    }
    if (roleId) where.roleId = roleId;

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } },
        { phone: { [Op.iLike]: q } }
      ];
    }

    // Fetch users with associated metadata
    const users = await User.findAll({
      where,
      attributes: [
        'id', 'name', 'email', 'phone', 'avatar', 'isActive', 'lastLogin',
        'baseSalary', 'paidLeaves', 'casualLeaves', 'sickLeaves', 'monthlyLeaveQuota',
        'organizationId', 'companyId', 'departmentId', 'roleId', 'createdAt'
      ],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'level'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] }
      ],
      order: [['name', 'ASC']]
    });

    const userIds = users.map(u => u.id);

    // Build Date Filter for Leaves & Attendance
    const parsedYear = parseInt(year, 10) || new Date().getFullYear();
    let startDateStr = `${parsedYear}-01-01`;
    let endDateStr = `${parsedYear}-12-31`;

    if (month && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      const m = String(month).padStart(2, '0');
      const lastDay = new Date(parsedYear, parseInt(month, 10), 0).getDate();
      startDateStr = `${parsedYear}-${m}-01`;
      endDateStr = `${parsedYear}-${m}-${lastDay}`;
    }

    // Fetch leave requests for these users
    let leaveRequests = [];
    if (userIds.length > 0) {
      leaveRequests = await LeaveRequest.findAll({
        where: {
          userId: { [Op.in]: userIds },
          [Op.or]: [
            { startDate: { [Op.between]: [startDateStr, endDateStr] } },
            { endDate: { [Op.between]: [startDateStr, endDateStr] } }
          ]
        },
        attributes: ['id', 'userId', 'startDate', 'endDate', 'leaveType', 'leaveDuration', 'status', 'isLossOfPay']
      });
    }

    // Fetch attendances for these users
    let attendances = [];
    if (userIds.length > 0) {
      attendances = await Attendance.findAll({
        where: {
          userId: { [Op.in]: userIds },
          date: { [Op.between]: [startDateStr, endDateStr] }
        },
        attributes: ['id', 'userId', 'date', 'status']
      });
    }

    // Group leaves and attendance by userId
    const leavesByUser = new Map();
    leaveRequests.forEach(lr => {
      if (!leavesByUser.has(lr.userId)) leavesByUser.set(lr.userId, []);
      leavesByUser.get(lr.userId).push(lr);
    });

    const attendancesByUser = new Map();
    attendances.forEach(att => {
      if (!attendancesByUser.has(att.userId)) attendancesByUser.set(att.userId, []);
      attendancesByUser.get(att.userId).push(att);
    });

    let totalPayroll = 0;
    let totalApprovedLeavesCount = 0;
    let totalPendingLeavesCount = 0;

    // Process staff records
    const staff = users.map(u => {
      const salary = parseFloat(u.baseSalary) || 0;
      totalPayroll += salary;

      const userLeaves = leavesByUser.get(u.id) || [];
      const userAtts = attendancesByUser.get(u.id) || [];

      let approvedDays = 0;
      let pendingCount = 0;
      let rejectedCount = 0;
      let casualDays = 0;
      let sickDays = 0;
      let paidDays = 0;
      let lopDays = 0;

      userLeaves.forEach(l => {
        if (l.status === 'pending') {
          pendingCount++;
        } else if (l.status === 'rejected') {
          rejectedCount++;
        } else if (l.status === 'approved') {
          // Calculate days
          const start = new Date(l.startDate);
          const end = new Date(l.endDate);
          const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
          const effectiveDays = l.leaveDuration === 'half_day' ? 0.5 : diffDays;

          approvedDays += effectiveDays;

          if (l.isLossOfPay) lopDays += effectiveDays;
          if (l.leaveType === 'casual') casualDays += effectiveDays;
          else if (l.leaveType === 'sick') sickDays += effectiveDays;
          else if (l.leaveType === 'paid') paidDays += effectiveDays;
        }
      });

      totalApprovedLeavesCount += approvedDays;
      totalPendingLeavesCount += pendingCount;

      const totalQuota = (parseInt(u.casualLeaves, 10) || 10) +
                         (parseInt(u.sickLeaves, 10) || 8) +
                         (parseInt(u.paidLeaves, 10) || 12);
      const remainingQuota = Math.max(0, totalQuota - approvedDays);

      // Attendance tally
      const presentDays = userAtts.filter(a => a.status === 'present').length;
      const lateDays = userAtts.filter(a => a.status === 'late').length;
      const halfDays = userAtts.filter(a => a.status === 'half_day').length;
      const absentDays = userAtts.filter(a => a.status === 'absent').length;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        baseSalary: salary,
        monthlyLeaveQuota: u.monthlyLeaveQuota || 1,
        paidLeaves: u.paidLeaves || 12,
        casualLeaves: u.casualLeaves || 10,
        sickLeaves: u.sickLeaves || 8,
        totalQuota,
        leavesTaken: approvedDays,
        leavesRemaining: remainingQuota,
        pendingLeaves: pendingCount,
        rejectedLeaves: rejectedCount,
        leaveBreakdown: {
          casual: casualDays,
          sick: sickDays,
          paid: paidDays,
          lop: lopDays
        },
        attendance: {
          present: presentDays,
          late: lateDays,
          halfDay: halfDays,
          absent: absentDays,
          totalLogged: userAtts.length
        },
        organization: u.organization ? { id: u.organization.id, name: u.organization.name } : null,
        company: u.company ? { id: u.company.id, name: u.company.name } : null,
        department: u.department ? { id: u.department.id, name: u.department.name } : null,
        role: u.role ? { id: u.role.id, name: u.role.name, level: u.role.level } : null
      };
    });

    // Populate filter dropdown options based on scope
    const orgWhere = isSuper ? {} : { id: req.user.organizationId };
    const organizations = await Organization.findAll({ where: orgWhere, attributes: ['id', 'name'], order: [['name', 'ASC']] });

    let departments = [];
    if (scopeType === 'all') {
      const deptWhere = isSuper ? (organizationId ? { organizationId } : {}) : { organizationId: req.user.organizationId };
      departments = await Department.findAll({ where: deptWhere, attributes: ['id', 'name'], order: [['name', 'ASC']] });
    } else if (scopeType === 'dept') {
      if (deptScope.managedDeptIds.length > 0) {
        departments = await Department.findAll({
          where: { id: { [Op.in]: deptScope.managedDeptIds } },
          attributes: ['id', 'name'],
          order: [['name', 'ASC']]
        });
      } else if (req.user.departmentId) {
        departments = await Department.findAll({
          where: { id: req.user.departmentId },
          attributes: ['id', 'name']
        });
      }
    } else {
      // scopeType === 'own'
      if (req.user.departmentId) {
        departments = await Department.findAll({
          where: { id: req.user.departmentId },
          attributes: ['id', 'name']
        });
      }
    }

    const roles = await Role.findAll({ attributes: ['id', 'name', 'level'], order: [['name', 'ASC']] });
    const userDeptName = departments.find(d => String(d.id) === String(req.user.departmentId))?.name || req.user.department?.name || '';

    res.json({
      success: true,
      staff,
      metrics: {
        totalStaff: staff.length,
        totalPayroll: scopeType === 'own' ? (staff[0]?.baseSalary || 0) : totalPayroll,
        totalApprovedLeaves: totalApprovedLeavesCount,
        totalPendingLeaves: totalPendingLeavesCount,
        avgLeavesPerStaff: staff.length > 0 ? (totalApprovedLeavesCount / staff.length).toFixed(1) : 0
      },
      filterOptions: {
        organizations,
        departments,
        roles
      },
      canViewAllDepts: Boolean(canViewAllDepts),
      canViewDept: Boolean(canViewDept),
      scopeType,
      userDeptId: req.user.departmentId,
      userDeptName
    });
  } catch (error) {
    console.error('❌ Error fetching staff summary:', error);
    res.status(500).json({ success: false, message: 'Server error fetching staff summary', error: error.message });
  }
});

// @desc   Update employee salary and leave quotas
// @route  PUT /api/staff-summary/:id
router.put('/:id', async (req, res) => {
  try {
    const { isSuper, isOrgAdmin, isCompanyAdmin, isAdmin, deptScope } = await getScope(req);

    // Permission check for editing
    let canEditAny = isAdmin;
    if (!canEditAny && req.user.roleId) {
      const permAllEdit = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'uam', screen: 'staff-summary-all', canEdit: true }
      });
      if (permAllEdit) canEditAny = true;
    }

    let canEditDept = canEditAny || deptScope.isDeptHead;
    if (!canEditDept && req.user.roleId) {
      const permDeptEdit = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'uam', screen: 'staff-summary-dept', canEdit: true }
      });
      if (permDeptEdit) canEditDept = true;
    }

    if (!canEditAny && !canEditDept) {
      return res.status(403).json({ success: false, message: 'Access denied: Edit permission required to update employee' });
    }

    const employee = await User.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!isSuper && employee.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot edit employee from another organization' });
    }

    // If user only has department-level edit access, verify target employee belongs to their department
    if (!canEditAny && canEditDept) {
      const isAllowedDept = employee.departmentId && (
        employee.departmentId === req.user.departmentId ||
        (deptScope.managedDeptIds && deptScope.managedDeptIds.includes(employee.departmentId))
      );
      if (!isAllowedDept) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only edit employees in your own department' });
      }
    }

    const { baseSalary, monthlyLeaveQuota, paidLeaves, casualLeaves, sickLeaves } = req.body;
    const updates = {};
    if (baseSalary !== undefined) updates.baseSalary = parseFloat(baseSalary) || 0;
    if (monthlyLeaveQuota !== undefined) updates.monthlyLeaveQuota = parseInt(monthlyLeaveQuota, 10) || 1;
    if (paidLeaves !== undefined) updates.paidLeaves = parseInt(paidLeaves, 10) || 0;
    if (casualLeaves !== undefined) updates.casualLeaves = parseInt(casualLeaves, 10) || 0;
    if (sickLeaves !== undefined) updates.sickLeaves = parseInt(sickLeaves, 10) || 0;

    await employee.update(updates);

    await logAction(req, 'UPDATE', 'uam', employee.id, employee.name, {
      description: `Updated salary and leave quota for employee "${employee.name}"`,
      changes: updates
    });

    res.json({
      success: true,
      message: `Employee "${employee.name}" financials and leave quota updated successfully`,
      employee: {
        id: employee.id,
        name: employee.name,
        baseSalary: employee.baseSalary,
        monthlyLeaveQuota: employee.monthlyLeaveQuota,
        paidLeaves: employee.paidLeaves,
        casualLeaves: employee.casualLeaves,
        sickLeaves: employee.sickLeaves
      }
    });
  } catch (error) {
    console.error('❌ Error updating employee salary/quota:', error);
    res.status(500).json({ success: false, message: 'Server error updating employee', error: error.message });
  }
});

module.exports = router;
