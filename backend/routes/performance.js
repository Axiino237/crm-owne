const express = require('express');
const router = express.Router();
const { Lead, User, Department, Role } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get performance statistics for department members
// @route  GET /api/performance
router.get('/', checkPermission('performance', 'performance-view', 'canView'), async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isManager = userRole === 'dept_manager';
    const isRegularUser = userRole === 'user';
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    let targetDeptId = req.query.departmentId || null;

    if (isManager || isRegularUser) {
      targetDeptId = req.user.departmentId;
    }

    // 1. Fetch available departments for Admins
    let departments = [];
    if (isAdmin) {
      const deptWhere = {};
      if (!req.user.isSuperAdmin && req.user.organizationId) {
        deptWhere.organizationId = req.user.organizationId;
      }
      departments = await Department.findAll({ where: deptWhere, attributes: ['id', 'name'] });
      // If admin hasn't selected a department, default to first one if available
      if (!targetDeptId && departments.length > 0) {
        targetDeptId = departments[0].id;
      }
    }

    // 2. Fetch users in target department
    const userWhere = {
      departmentId: targetDeptId ? targetDeptId : { [Op.ne]: null }
    };
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
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

    // 3. Process performance stats for each user
    const members = [];
    for (const user of deptUsers) {
      // Build lead creation date filter
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

      const createdQuery = {
        assignedTo: user.id,
        createdAt: { [Op.between]: [new Date(startDateStr), new Date(endDateStr)] }
      };

      // Contacted (Call counts) query
      const contactedQuery = {
        assignedTo: user.id,
        lastContactedDate: dateWhere
      };

      // Query calculations
      const totalAssigned = await Lead.count({ where: createdQuery });
      const convertedCount = await Lead.count({
        where: {
          ...createdQuery,
          status: 'converted'
        }
      });
      const contactedCount = await Lead.count({ where: contactedQuery });
      
      const newCount = await Lead.count({ where: { ...createdQuery, status: 'new' } });
      const inProgressCount = await Lead.count({ where: { ...createdQuery, status: 'contacted' } });
      const qualifiedCount = await Lead.count({ where: { ...createdQuery, status: 'qualified' } });
      const lostCount = await Lead.count({ where: { ...createdQuery, status: 'lost' } });

      members.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || 'User',
        stats: {
          totalAssigned,
          contactedCount,
          convertedCount,
          newCount,
          inProgressCount,
          qualifiedCount,
          lostCount
        }
      });
    }

    // 4. Fetch list of recent call activities (what they did)
    const activityQuery = {
      assignedTo: { [Op.in]: deptUsers.map(u => u.id) },
      lastContactedDate: dateWhere
    };

    const activities = await Lead.findAll({
      where: activityQuery,
      attributes: ['id', 'name', 'companyName', 'status', 'lastContactedDate', 'nextFollowUp', 'notes'],
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name'] }],
      order: [['lastContactedDate', 'DESC'], ['updatedAt', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      selectedDepartmentId: targetDeptId,
      filterPeriod: year ? 'custom' : 'today',
      filterDate: activeDateLabel,
      departments,
      members,
      activities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
