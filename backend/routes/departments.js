const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Department, Company, Organization, User, Role } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// Helper to populate user details for dynamic hierarchy layers
const enrichDepartmentLayers = async (dept) => {
  const plain = dept.toJSON ? dept.toJSON() : { ...dept };
  if (!plain.hierarchyLayers || !Array.isArray(plain.hierarchyLayers)) {
    plain.hierarchyLayers = [];
    return plain;
  }
  const allUserIds = plain.hierarchyLayers.flatMap(l => l.userIds || []);
  if (allUserIds.length === 0) return plain;

  const users = await User.findAll({
    where: { id: { [Op.in]: allUserIds } },
    attributes: ['id', 'name', 'email', 'phone', 'avatar']
  });
  const userMap = new Map(users.map(u => [u.id, u.toJSON ? u.toJSON() : u]));

  plain.hierarchyLayers = plain.hierarchyLayers.map(l => ({
    ...l,
    users: (l.userIds || []).map(uid => userMap.get(uid)).filter(Boolean)
  }));
  return plain;
};

// @desc    Get all departments
// @route   GET /api/departments
router.get('/', checkPermission('departments', 'departments-list', 'canView'), async (req, res) => {
  try {
    const { search = '', companyId, organizationId, page = 1, limit = 10 } = req.query;
    const where = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };
    if (companyId) where.companyId = companyId;
    if (organizationId) where.organizationId = organizationId;

    if (!req.user.isSuperAdmin && req.user.companyId) where.companyId = req.user.companyId;
    else if (!req.user.isSuperAdmin && req.user.organizationId) where.organizationId = req.user.organizationId;

    const { count, rows } = await Department.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    const enrichedRows = await Promise.all(rows.map(d => enrichDepartmentLayers(d)));
    res.json({ success: true, total: count, departments: enrichedRows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Dropdown
// @route   GET /api/departments/all
router.get('/all', async (req, res) => {
  try {
    const { companyId } = req.query;
    const where = { isActive: true };
    if (companyId) where.companyId = companyId;
    if (!req.user.isSuperAdmin && req.user.companyId) where.companyId = req.user.companyId;

    const departments = await Department.findAll({
      where,
      attributes: ['id', 'name', 'code', 'companyId', 'hierarchyLayers', 'headId'],
      order: [['name', 'ASC']]
    });
    const enriched = await Promise.all(departments.map(d => enrichDepartmentLayers(d)));
    res.json({ success: true, departments: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get single department
// @route   GET /api/departments/:id
router.get('/:id', checkPermission('departments', 'departments-list', 'canView'), async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    const enriched = await enrichDepartmentLayers(dept);
    res.json({ success: true, department: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Create department
// @route   POST /api/departments
router.post('/', adminOnly, checkPermission('departments', 'departments-list', 'canCreate'), async (req, res) => {
  try {
    const { name, code, companyId, organizationId, description, headId, hierarchyLayers } = req.body;
    if (!name || !companyId || !organizationId) {
      return res.status(400).json({ success: false, message: 'Name, company and organization are required' });
    }

    const layers = Array.isArray(hierarchyLayers) ? hierarchyLayers : [];
    const primaryHeadId = layers[0]?.userIds?.[0] || headId || null;

    const dept = await Department.create({
      name, 
      code: code ? code.toUpperCase() : undefined, 
      companyId, organizationId,
      description, 
      headId: primaryHeadId,
      hierarchyLayers: layers,
      createdById: req.user.id
    });

    const created = await Department.findByPk(dept.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }
      ]
    });

    const enriched = await enrichDepartmentLayers(created);
    res.status(201).json({ success: true, message: 'Department created successfully', department: enriched });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Department code already exists in this company' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Update department
// @route   PUT /api/departments/:id
router.put('/:id', adminOnly, checkPermission('departments', 'departments-list', 'canEdit'), async (req, res) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const { headId, hierarchyLayers, ...rest } = req.body;
    const updates = { ...rest };
    if (hierarchyLayers !== undefined) {
      const layers = Array.isArray(hierarchyLayers) ? hierarchyLayers : [];
      updates.hierarchyLayers = layers;
      updates.headId = layers[0]?.userIds?.[0] || headId || null;
    } else if (headId !== undefined) {
      updates.headId = headId || null;
    }

    await dept.update(updates);

    const updated = await Department.findByPk(dept.id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email'] }
      ]
    });

    const enriched = await enrichDepartmentLayers(updated);
    res.json({ success: true, message: 'Department updated successfully', department: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get team live monitoring data for department
// @route   GET /api/departments/:id/team-monitor
router.get('/:id/team-monitor', async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] }
      ]
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const enrichedDept = await enrichDepartmentLayers(dept);
    const layers = enrichedDept.hierarchyLayers || [];

    // Check viewer's authority in this department
    const isSuperAdmin = req.user.isSuperAdmin;
    const isOrgAdmin = req.user.role?.level === 'org_admin' || req.user.role?.level === 'company_admin';
    
    let viewerLayerLevel = null;
    let viewerLayerName = null;
    for (const l of layers) {
      if (l.userIds && l.userIds.includes(req.user.id)) {
        viewerLayerLevel = l.level;
        viewerLayerName = l.name;
        break;
      }
    }

    const isHOD = viewerLayerLevel === 1 || dept.headId === req.user.id;
    const isLeadOrManager = viewerLayerLevel !== null;
    const canMonitor = isSuperAdmin || isOrgAdmin || isLeadOrManager || isHOD;

    if (!canMonitor) {
      return res.status(403).json({ success: false, message: 'You do not have permission to monitor this department.' });
    }

    // Fetch all department members
    const members = await User.findAll({
      where: { departmentId: id, isActive: true },
      attributes: ['id', 'name', 'email', 'phone', 'avatar', 'createdAt'],
      order: [['name', 'ASC']]
    });
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const { Attendance, LeaveRequest, Lead, DesignOrder } = require('../models');
    const memberIds = members.map(m => m.id);

    // Today's Attendance
    const attendances = await Attendance.findAll({
      where: {
        userId: { [Op.in]: memberIds },
        date: todayStr
      }
    });
    const attMap = new Map(attendances.map(a => [a.userId, a]));

    // Leaves today
    const leaves = await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: memberIds },
        startDate: { [Op.lte]: todayStr },
        endDate: { [Op.gte]: todayStr },
        status: 'approved'
      }
    });
    const leaveMap = new Map(leaves.map(l => [l.userId, l]));

    // Active Leads assigned to these members
    const activeLeads = await Lead.findAll({
      where: {
        assignedTo: { [Op.in]: memberIds }
      },
      attributes: ['id', 'name', 'companyName', 'email', 'phone', 'status', 'value', 'nextFollowUp', 'assignedTo', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    });
    const leadsByMember = new Map();
    for (const lead of activeLeads) {
      if (!leadsByMember.has(lead.assignedTo)) leadsByMember.set(lead.assignedTo, []);
      leadsByMember.get(lead.assignedTo).push(lead);
    }

    // Active Designs for these members
    const activeDesigns = await DesignOrder.findAll({
      where: {
        submittedBy: { [Op.in]: memberIds }
      },
      attributes: ['id', 'companyName', 'exhibitionName', 'stallSize', 'status', 'approxBudget', 'submittedBy', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    });
    const designsByMember = new Map();
    for (const d of activeDesigns) {
      if (!designsByMember.has(d.submittedBy)) designsByMember.set(d.submittedBy, []);
      designsByMember.get(d.submittedBy).push(d);
    }

    // Map monitored members with their layer and work stats
    const monitoredMembers = members.map(m => {
      const mPlain = m.toJSON ? m.toJSON() : m;
      
      let memberLayer = null;
      for (const l of layers) {
        if (l.userIds && l.userIds.includes(m.id)) {
          memberLayer = { id: l.id, level: l.level, name: l.name };
          break;
        }
      }

      const todayAtt = attMap.get(m.id);
      const todayLeave = leaveMap.get(m.id);
      const memberLeads = leadsByMember.get(m.id) || [];
      const memberDesigns = designsByMember.get(m.id) || [];

      let status = 'not_clocked';
      if (todayLeave) status = 'on_leave';
      else if (todayAtt) status = todayAtt.clockOut ? 'clocked_out' : 'present';

      const totalLeadsValue = memberLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
      const convertedLeads = memberLeads.filter(l => l.status === 'converted').length;
      const activeLeadsCount = memberLeads.filter(l => l.status !== 'converted' && l.status !== 'lost').length;

      return {
        ...mPlain,
        layer: memberLayer,
        attendanceStatus: status,
        todayAttendance: todayAtt ? {
          clockIn: todayAtt.clockIn,
          clockOut: todayAtt.clockOut,
          duration: todayAtt.duration
        } : null,
        todayLeave: todayLeave ? {
          type: todayLeave.leaveType,
          reason: todayLeave.reason
        } : null,
        workSummary: {
          totalLeads: memberLeads.length,
          activeLeads: activeLeadsCount,
          convertedLeads,
          totalLeadsValue,
          totalDesigns: memberDesigns.length,
          pendingDesigns: memberDesigns.filter(d => d.status === 'pending' || d.status === 'in_progress').length
        },
        leads: memberLeads,
        designs: memberDesigns
      };
    });

    const presentCount = monitoredMembers.filter(m => m.attendanceStatus === 'present' || m.attendanceStatus === 'clocked_out').length;
    const leaveCount = monitoredMembers.filter(m => m.attendanceStatus === 'on_leave').length;
    const totalLeadsAssigned = activeLeads.length;
    const totalPipelineValue = activeLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const totalOngoingDesigns = activeDesigns.filter(d => d.status === 'pending' || d.status === 'in_progress').length;

    res.json({
      success: true,
      department: enrichedDept,
      viewer: {
        isSuperAdmin,
        isOrgAdmin,
        layerLevel: viewerLayerLevel,
        layerName: viewerLayerName,
        isHOD
      },
      summary: {
        totalMembers: members.length,
        presentCount,
        leaveCount,
        notClockedCount: members.length - (presentCount + leaveCount),
        totalLeadsAssigned,
        totalPipelineValue,
        totalOngoingDesigns
      },
      members: monitoredMembers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Reassign a lead to another department member
// @route   POST /api/departments/reassign-lead
router.post('/reassign-lead', async (req, res) => {
  try {
    const { leadId, newAssignedToUserId } = req.body;
    if (!leadId || !newAssignedToUserId) {
      return res.status(400).json({ success: false, message: 'Lead ID and New Assignee are required' });
    }

    const { Lead } = require('../models');
    const lead = await Lead.findByPk(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const newUser = await User.findByPk(newAssignedToUserId);
    if (!newUser) return res.status(404).json({ success: false, message: 'Target user not found' });

    await lead.update({ assignedTo: newAssignedToUserId });
    res.json({ success: true, message: `Lead "${lead.name || 'Lead'}" reassigned to ${newUser.name} successfully!` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get department mapped dependencies (to check before delete)
// @route   GET /api/departments/:id/dependencies
router.get('/:id/dependencies', adminOnly, async (req, res) => {
  try {
    const { User } = require('../models');
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const users = await User.findAll({
      where: { departmentId: req.params.id },
      attributes: ['id', 'name', 'email']
    });

    const canDelete = users.length === 0;
    const blockReasons = [];

    if (users.length > 0) {
      blockReasons.push({
        type: 'Users',
        count: users.length,
        items: users.map(u => `${u.name} (${u.email})`),
        actionRequired: `You must delete or reassign these ${users.length} user(s) in this department first.`
      });
    }

    res.json({
      success: true,
      canDelete,
      name: dept.name,
      code: dept.code,
      mappedItems: {
        users
      },
      blockReasons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
router.delete('/:id', adminOnly, checkPermission('departments', 'departments-list', 'canDelete'), async (req, res) => {
  const { sequelize } = require('../config/db');
  const t = await sequelize.transaction();
  try {
    const { User } = require('../models');
    const dept = await Department.findByPk(req.params.id, { transaction: t });
    if (!dept) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const users = await User.findAll({ where: { departmentId: req.params.id }, attributes: ['id', 'name', 'email'], transaction: t });
    if (users.length > 0) {
      await t.rollback();
      const userNames = users.map(u => u.name).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete: ${users.length} user(s) assigned to this department (${userNames}). You must delete or reassign them first.`,
        mappedType: 'users',
        mappedItems: users
      });
    }

    await dept.destroy({ transaction: t });
    await t.commit();
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc    Get detailed hierarchy data for a department (for Hierarchy Studio)
// @route   GET /api/departments/:id/hierarchy-details
router.get('/:id/hierarchy-details', checkPermission('departments', 'departments-list', 'canView'), async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'head', attributes: ['id', 'name', 'email', 'avatar'] }
      ]
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    // Fetch all company users who could belong to this department
    const companyUsers = await User.findAll({
      where: {
        companyId: dept.companyId,
        isActive: true
      },
      attributes: ['id', 'name', 'email', 'phone', 'avatar', 'departmentId', 'managerId', 'isActive', 'baseSalary'],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'level'] },
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
        { model: Department, as: 'headedDepartments', attributes: ['id', 'name', 'code'] }
      ],
      order: [['name', 'ASC']]
    });

    // Compute reportee counts for all users in this company
    const reporteeCountMap = {};
    companyUsers.forEach(u => {
      if (u.managerId) {
        reporteeCountMap[u.managerId] = (reporteeCountMap[u.managerId] || 0) + 1;
      }
    });

    const userMap = new Map(companyUsers.map(u => {
      const plain = u.toJSON ? u.toJSON() : { ...u };
      plain.reporteeCount = reporteeCountMap[u.id] || 0;
      return [u.id, plain];
    }));

    const rawLayers = Array.isArray(dept.hierarchyLayers) ? dept.hierarchyLayers : [];
    const enrichedLayers = rawLayers.map((l, idx) => {
      const userIds = Array.isArray(l.userIds) ? l.userIds : [];
      const layerUsers = userIds.map(uid => userMap.get(uid)).filter(Boolean);
      return {
        id: l.id || `layer-${idx + 1}-${Date.now()}`,
        level: l.level || (idx + 1),
        name: l.name || (idx === 0 ? 'Layer 1 (HOD)' : `Layer ${idx + 1}`),
        userIds,
        users: layerUsers
      };
    });

    // Find users who have departmentId === dept.id but aren't in any layer
    const allAssignedIds = new Set(rawLayers.flatMap(l => l.userIds || []));
    const deptUsers = companyUsers.filter(u => u.departmentId === dept.id);
    const unassignedMembers = deptUsers.filter(u => !allAssignedIds.has(u.id));

    res.json({
      success: true,
      department: dept,
      layers: enrichedLayers,
      departmentUsers: deptUsers.map(u => userMap.get(u.id)),
      companyUsers: companyUsers.map(u => userMap.get(u.id)),
      unassignedMembers: unassignedMembers.map(u => userMap.get(u.id))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error loading hierarchy details', error: error.message });
  }
});

// @desc    Update hierarchy layers and direct manager reporting assignments
// @route   PUT /api/departments/:id/hierarchy
router.put('/:id/hierarchy', adminOnly, checkPermission('departments', 'departments-list', 'canEdit'), async (req, res) => {
  const { sequelize } = require('../config/db');
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { hierarchyLayers, reportingAssignments } = req.body;

    const dept = await Department.findByPk(id, { transaction: t });
    if (!dept) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const layers = Array.isArray(hierarchyLayers) ? hierarchyLayers : [];
    const primaryHeadId = layers[0]?.userIds?.[0] || null;

    // Validate reporting assignments
    if (reportingAssignments && typeof reportingAssignments === 'object') {
      const pairs = Array.isArray(reportingAssignments) 
        ? reportingAssignments 
        : Object.entries(reportingAssignments).map(([userId, managerId]) => ({ userId, managerId }));

      // Self-reporting check
      for (const p of pairs) {
        if (p.userId && p.managerId && p.userId === p.managerId) {
          await t.rollback();
          return res.status(400).json({ success: false, message: 'A user cannot report to themselves.' });
        }
      }

      // Circular reporting check
      const currentUsers = await User.findAll({
        where: { companyId: dept.companyId },
        attributes: ['id', 'managerId'],
        transaction: t
      });
      const currentMap = {};
      currentUsers.forEach(u => { currentMap[u.id] = u.managerId; });
      pairs.forEach(p => { currentMap[p.userId] = p.managerId || null; });

      for (const p of pairs) {
        if (!p.managerId) continue;
        let curr = p.managerId;
        const visited = new Set([p.userId]);
        while (curr) {
          if (visited.has(curr)) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message: 'Circular reporting detected! A reporting loop was found in the hierarchy.'
            });
          }
          visited.add(curr);
          curr = currentMap[curr];
        }
      }

      // Apply updates to users
      for (const p of pairs) {
        if (p.userId) {
          await User.update(
            { managerId: p.managerId || null },
            { where: { id: p.userId, companyId: dept.companyId }, transaction: t }
          );
        }
      }
    }

    // Assign departmentId for all users placed in layers
    const allLayerUserIds = layers.flatMap(l => l.userIds || []);
    if (allLayerUserIds.length > 0) {
      await User.update(
        { departmentId: dept.id },
        { where: { id: { [Op.in]: allLayerUserIds }, departmentId: null }, transaction: t }
      );
    }

    // Update department layers & primary head
    await dept.update({
      hierarchyLayers: layers,
      headId: primaryHeadId
    }, { transaction: t });

    await t.commit();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'departments', dept.id, dept.name, {
      description: `Configured hierarchy layers and reporting lines for department ${dept.name}`,
      layersCount: layers.length
    });

    res.json({
      success: true,
      message: 'Department hierarchy and reporting lines saved successfully!',
      headId: primaryHeadId
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: 'Server error saving hierarchy', error: error.message });
  }
});

module.exports = router;
