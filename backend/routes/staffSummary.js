const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Role, Department, Organization, Company, LeaveRequest, Attendance } = require('../models');
const { protect } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

router.use(protect);

// Helper to determine scoping for user summary
const getScope = (req) => {
  const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin';
  const isOrgAdmin = req.user.role?.level === 'org_admin';
  const isCompanyAdmin = req.user.role?.level === 'company_admin';
  const isDeptHead = req.user.role?.level === 'dept_head';
  return { isSuper, isOrgAdmin, isCompanyAdmin, isDeptHead };
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

    const { isSuper, isOrgAdmin, isCompanyAdmin, isDeptHead } = getScope(req);

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
          metrics: { totalStaff: 0, totalPayroll: 0, totalApprovedLeaves: 0, totalPendingLeaves: 0 },
          filterOptions: { organizations: [], departments: [], roles: [] }
        });
      }
      where.organizationId = req.user.organizationId;

      if (isCompanyAdmin && req.user.companyId) {
        where.companyId = req.user.companyId;
      }
      if (isDeptHead && req.user.departmentId) {
        where.departmentId = req.user.departmentId;
      }
    } else if (organizationId) {
      where.organizationId = organizationId;
    }

    // Apply explicit query filters
    if (departmentId) where.departmentId = departmentId;
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

    // Populate filter dropdown options
    const orgWhere = isSuper ? {} : { id: req.user.organizationId };
    const deptWhere = isSuper ? (organizationId ? { organizationId } : {}) : { organizationId: req.user.organizationId };

    const organizations = await Organization.findAll({ where: orgWhere, attributes: ['id', 'name'], order: [['name', 'ASC']] });
    const departments = await Department.findAll({ where: deptWhere, attributes: ['id', 'name'], order: [['name', 'ASC']] });
    const roles = await Role.findAll({ attributes: ['id', 'name', 'level'], order: [['name', 'ASC']] });

    res.json({
      success: true,
      staff,
      metrics: {
        totalStaff: staff.length,
        totalPayroll,
        totalApprovedLeaves: totalApprovedLeavesCount,
        totalPendingLeaves: totalPendingLeavesCount,
        avgLeavesPerStaff: staff.length > 0 ? (totalApprovedLeavesCount / staff.length).toFixed(1) : 0
      },
      filterOptions: {
        organizations,
        departments,
        roles
      }
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
    const { isSuper, isOrgAdmin, isCompanyAdmin } = getScope(req);
    if (!isSuper && !isOrgAdmin && !isCompanyAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin permission required to update salary/quota' });
    }

    const employee = await User.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!isSuper && employee.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot edit employee from another organization' });
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
