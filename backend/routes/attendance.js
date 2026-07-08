const express = require('express');
const router = express.Router();
const { Attendance, User, Department, Role, LeaveRequest, Holiday } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');

router.use(protect);

// ── Helper: Get today's local date string (YYYY-MM-DD) ──
const getLocalDateString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// @desc   Check-in for today
// @route  POST /api/attendance/check-in
router.post('/check-in', async (req, res) => {
  try {
    const todayStr = getLocalDateString();
    
    // Check if check-in already exists
    const existing = await Attendance.findOne({
      where: { userId: req.user.id, date: todayStr }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already checked in for today' });
    }

    // Determine status (grace limit: 09:30 AM local time)
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(9, 30, 0, 0); // 9:30 AM cutoff

    const status = now > cutoff ? 'late' : 'present';

    const attendance = await Attendance.create({
      userId: req.user.id,
      date: todayStr,
      checkIn: now,
      status,
      organizationId: req.user.organizationId
    });

    res.status(201).json({ success: true, message: `Checked in successfully as ${status}`, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during check-in', error: error.message });
  }
});

// @desc   Check-out for today
// @route  POST /api/attendance/check-out
router.post('/check-out', async (req, res) => {
  try {
    const todayStr = getLocalDateString();

    const attendance = await Attendance.findOne({
      where: { userId: req.user.id, date: todayStr }
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No check-in record found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ success: false, message: 'You have already checked out for today' });
    }

    await attendance.update({
      checkOut: new Date()
    });

    res.json({ success: true, message: 'Checked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during check-out', error: error.message });
  }
});

// @desc   Get current user's monthly attendance summary
// @route  GET /api/attendance/my-summary
router.get('/my-summary', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const logs = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });

    const leaves = await LeaveRequest.findAll({
      where: {
        userId: req.user.id,
        status: 'approved',
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } }
        ]
      }
    });

    const holidays = await Holiday.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });

    const managedDept = await Department.findOne({ where: { headId: req.user.id } });
    const isDeptHead = !!managedDept;
    const hasTeamAccess = (req.user.role?.level === 'dept_manager') || isDeptHead;

    res.json({ success: true, logs, leaves, holidays, hasTeamAccess });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving summary', error: error.message });
  }
});

// @desc   Get team today's attendance (for managers/heads/admins)
// @route  GET /api/attendance/team-today
router.get('/team-today', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    // Resolve target department ID for heads or admins
    const managedDept = await Department.findOne({ where: { headId: req.user.id } });
    const isDeptHead = !!managedDept;
    const hasTeamAccess = (userRole === 'dept_manager') || isDeptHead;

    let targetDeptId = req.query.departmentId || null;

    if (!isAdmin && hasTeamAccess) {
      targetDeptId = managedDept?.id || req.user.departmentId;
    } else if (!isAdmin && !hasTeamAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: Scoped privileges required' });
    }

    // Build user query scope
    const userWhere = {};
    if (targetDeptId) {
      userWhere.departmentId = targetDeptId;
    } else if (!isAdmin) {
      userWhere.id = req.user.id;
    }

    if (!req.user.isSuperAdmin && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
    }

    const deptUsers = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name'] }
      ]
    });

    const todayStr = getLocalDateString();
    const attendanceLogs = await Attendance.findAll({
      where: {
        userId: { [Op.in]: deptUsers.map(u => u.id) },
        date: todayStr
      },
      raw: true
    });

    // Map logs to user objects
    const teamAttendance = deptUsers.map(user => {
      const log = attendanceLogs.find(l => l.userId === user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department?.name || 'Unassigned',
        role: user.role?.name || 'User',
        log: log ? {
          id: log.id,
          status: log.status,
          checkIn: log.checkIn,
          checkOut: log.checkOut,
          notes: log.notes
        } : null
      };
    });

    res.json({
      success: true,
      date: todayStr,
      isDesignDept: targetDeptId ? await Department.findByPk(targetDeptId).then(d => d && (d.name.toLowerCase().includes('design') || (d.code && d.code.toLowerCase().includes('design')))) : false,
      teamAttendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving team attendance', error: error.message });
  }
});

// @desc   Apply for leave
// @route  POST /api/attendance/leave-request
router.post('/leave-request', async (req, res) => {
  try {
    const { startDate, endDate, leaveType, leaveDuration, halfDaySession, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Start date, end date, and reason are required' });
    }

    const leave = await LeaveRequest.create({
      userId: req.user.id,
      startDate,
      endDate,
      leaveType: leaveType || 'casual',
      leaveDuration: leaveDuration || 'full_day',
      halfDaySession: leaveDuration === 'half_day' ? halfDaySession : null,
      reason,
      status: 'pending',
      organizationId: req.user.organizationId
    });

    res.status(201).json({ success: true, message: 'Leave request submitted successfully', leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error submitting leave request', error: error.message });
  }
});

// @desc   Get my leave requests
// @route  GET /api/attendance/leave-requests/my
router.get('/leave-requests/my', async (req, res) => {
  try {
    const leaves = await LeaveRequest.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching leave requests', error: error.message });
  }
});

// @desc   Get team leave requests (for managers/heads/admins)
// @route  GET /api/attendance/leave-requests/team
router.get('/leave-requests/team', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    const managedDept = await Department.findOne({ where: { headId: req.user.id } });
    const isDeptHead = !!managedDept;
    const hasTeamAccess = (userRole === 'dept_manager') || isDeptHead;

    let targetDeptId = req.query.departmentId || null;

    if (!isAdmin && hasTeamAccess) {
      targetDeptId = managedDept?.id || req.user.departmentId;
    } else if (!isAdmin && !hasTeamAccess) {
      return res.status(403).json({ success: false, message: 'Access denied: Scoped privileges required' });
    }

    // Build user query scope
    const userWhere = {};
    if (targetDeptId) {
      userWhere.departmentId = targetDeptId;
    } else if (!isAdmin) {
      userWhere.id = req.user.id;
    }

    if (!req.user.isSuperAdmin && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
    }

    const deptUsers = await User.findAll({
      where: userWhere,
      attributes: ['id']
    });

    const leaves = await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: deptUsers.map(u => u.id) }
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching team leave requests', error: error.message });
  }
});

// @desc   Update leave request status (Approve/Reject)
// @route  PUT /api/attendance/leave-request/:id/status
router.put('/leave-request/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot approve or reject your own leave request' });
    }

    // Verify manager/head has scope over this leave request user
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    const managedDept = await Department.findOne({ where: { headId: req.user.id } });
    const isDeptHead = !!managedDept;
    const hasTeamAccess = (userRole === 'dept_manager') || isDeptHead;

    if (!isAdmin) {
      if (!hasTeamAccess) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      
      const targetUser = await User.findByPk(leave.userId);
      const targetDeptId = managedDept?.id || req.user.departmentId;
      if (!targetUser || targetUser.departmentId !== targetDeptId) {
        return res.status(403).json({ success: false, message: 'Access denied: User is outside your department scope' });
      }
    }

    await leave.update({
      status,
      approvedBy: req.user.id
    });

    // If approved, dynamically create attendance logs as 'on_leave' or 'half_day' for those dates!
    if (status === 'approved') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const datesToSeed = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToSeed.push(d.toISOString().split('T')[0]);
      }

      const seedStatus = leave.leaveDuration === 'half_day' ? 'half_day' : 'on_leave';

      for (const dStr of datesToSeed) {
        await Attendance.upsert({
          userId: leave.userId,
          date: dStr,
          status: seedStatus,
          notes: leave.leaveDuration === 'half_day' ? `Half day leave: ${leave.halfDaySession === 'first_half' ? 'First Half' : 'Second Half'}` : null,
          organizationId: leave.organizationId
        });
      }
    }

    res.json({ success: true, message: `Leave request has been ${status}`, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating leave request status', error: error.message });
  }
});

// @desc   Get all holidays
// @route  GET /api/attendance/holidays
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      where: req.user.isSuperAdmin ? {} : { organizationId: req.user.organizationId },
      order: [['date', 'ASC']]
    });
    res.json({ success: true, holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving holidays', error: error.message });
  }
});

// @desc   Create a new holiday (Admin only)
// @route  POST /api/attendance/holiday
router.post('/holiday', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin permissions required' });
    }

    const { name, date, type, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Name and date are required' });
    }

    const holiday = await Holiday.create({
      name,
      date,
      type: type || 'public',
      description,
      organizationId: req.user.organizationId
    });

    res.status(201).json({ success: true, message: 'Holiday created successfully', holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating holiday', error: error.message });
  }
});

// @desc   Update a holiday (Admin only)
// @route  PUT /api/attendance/holiday/:id
router.put('/holiday/:id', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin permissions required' });
    }

    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    if (!req.user.isSuperAdmin && holiday.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Outside your organization' });
    }

    const { name, date, type, description } = req.body;
    await holiday.update({
      name: name || holiday.name,
      date: date || holiday.date,
      type: type || holiday.type,
      description: description !== undefined ? description : holiday.description
    });

    res.json({ success: true, message: 'Holiday updated successfully', holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating holiday', error: error.message });
  }
});

// @desc   Delete a holiday (Admin only)
// @route  DELETE /api/attendance/holiday/:id
router.delete('/holiday/:id', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin permissions required' });
    }

    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    if (!req.user.isSuperAdmin && holiday.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Outside your organization' });
    }

    await holiday.destroy();
    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting holiday', error: error.message });
  }
});

module.exports = router;
