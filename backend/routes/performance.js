const express = require('express');
const router = express.Router();
const { Lead, User, Department, Role, DesignOrder } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get performance statistics for department members
// @route  GET /api/performance
router.get('/', checkPermission('performance', 'performance-view', 'canView'), async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    // Check if user is a department head via headId
    const managedDept = await Department.findOne({ where: { headId: req.user.id } });
    const isDeptHead = !!managedDept;

    // dept_manager role OR headId = team-level access
    const isManager = userRole === 'dept_manager';
    const hasTeamAccess = isManager || isDeptHead;

    let targetDeptId = req.query.departmentId || null;

    // ── Scope targetDeptId based on role ──
    if (isAdmin) {
      // Admins see what they select or default to first dept
      const adminDepts = await Department.findAll({
        where: req.user.isSuperAdmin ? {} : { organizationId: req.user.organizationId },
        attributes: ['id', 'name']
      });
      if (!targetDeptId && adminDepts.length > 0) targetDeptId = adminDepts[0].id;
    } else if (hasTeamAccess) {
      // Head → their headed dept; manager → their assigned dept
      targetDeptId = managedDept?.id || req.user.departmentId;
    } else {
      // Regular user → self-only (targetDeptId irrelevant, userWhere uses id)
      targetDeptId = null;
    }

    // 2. Build userWhere: admins/team-heads see dept members, regular users see only self
    let userWhere = {};
    if (isAdmin || hasTeamAccess) {
      if (targetDeptId) {
        userWhere.departmentId = targetDeptId;
      } else if (!isAdmin) {
        // Fallback safety: If department head has no department assigned, scope only to themselves
        userWhere.id = req.user.id;
      }
      if (!req.user.isSuperAdmin && req.user.organizationId) userWhere.organizationId = req.user.organizationId;
    } else {
      // Regular user — only their own row
      userWhere.id = req.user.id;
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

    // 3. Process performance stats
    const members = [];
    for (const user of deptUsers) {
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
        const contactedQuery = { assignedTo: user.id, lastContactedDate: dateWhere };

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
        isHead: managedDept ? user.id === req.user.id && isDeptHead : false,
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
        where: { assignedTo: { [Op.in]: deptUsers.map(u => u.id) }, lastContactedDate: dateWhere },
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

    // For admins, re-fetch full dept list for the dropdown
    const allDepts = isAdmin
      ? await Department.findAll({
          where: req.user.isSuperAdmin ? {} : { organizationId: req.user.organizationId },
          attributes: ['id', 'name']
        })
      : [];

    res.json({
      success: true,
      isDeptHead,
      hasTeamAccess,
      isDesignDept,
      headDeptName: managedDept?.name || null,
      selectedDepartmentId: targetDeptId,
      filterPeriod: year ? 'custom' : 'today',
      filterDate: activeDateLabel,
      departments: allDepts,
      members,
      activities
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
