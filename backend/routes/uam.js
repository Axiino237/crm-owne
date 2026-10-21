const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Role, Organization, Company, Department } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// GET /api/uam/users
router.get('/users', checkPermission('uam', 'users-list', 'canView'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', companyId, departmentId } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    // Scope: super admin sees all, others scoped to their org
    if (!req.user.isSuperAdmin && req.user.organizationId)
      where.organizationId = req.user.organizationId;

    // Optional filters for dropdowns (e.g. dept head selection)
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'resetOTP', 'resetOTPExpiry', 'resetToken', 'resetTokenExpiry'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
        { model: Department, as: 'headedDepartments', attributes: ['id', 'name', 'code'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    res.json({ success: true, total: count, page: Number(page), limit: Number(limit), users: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/uam/managers - Get potential managers within organization
router.get('/managers', checkPermission('uam', 'users-list', 'canView'), async (req, res) => {
  try {
    const orgId = req.user.isSuperAdmin ? (req.query.organizationId || null) : (req.user.organizationId || null);
    const where = { isActive: true };
    if (orgId) where.organizationId = orgId;

    const managers = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'organizationId'],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'level'] }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, managers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching managers', error: error.message });
  }
});

// GET /api/uam/users/:id
router.get('/users/:id', checkPermission('uam', 'users-list', 'canView'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'resetOTP', 'resetOTPExpiry', 'resetToken', 'resetTokenExpiry'] },
      include: [
        { model: Role, as: 'role' },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] },
        { model: Department, as: 'headedDepartments', attributes: ['id', 'name', 'code'] }
      ]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/uam/users
router.post('/users', checkPermission('uam', 'users-list', 'canCreate'), async (req, res) => {
  try {
    const { name, email, password, phone, roleId, organizationId, companyId, departmentId, paidLeaves, casualLeaves, sickLeaves, baseSalary, monthlyLeaveQuota, managerId } = req.body;
    if (!name || !email || !password || !roleId)
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const role = await Role.findByPk(roleId);
    if (!role) return res.status(400).json({ success: false, message: 'Invalid role' });
    if (role.level === 'super_admin')
      return res.status(403).json({ success: false, message: 'Cannot create Super Admin via UAM' });

    const targetOrgId = req.user.isSuperAdmin ? (organizationId || null) : (req.user.organizationId || null);
    const targetCompanyId = (req.user.role?.level === 'company_admin') ? (req.user.companyId || null) : (companyId || null);

    // Validate managerId within same organization
    let validManagerId = null;
    if (managerId) {
      const mgr = await User.findByPk(managerId);
      if (!mgr) {
        return res.status(400).json({ success: false, message: 'Assigned manager not found' });
      }
      if (targetOrgId && mgr.organizationId && mgr.organizationId !== targetOrgId) {
        return res.status(400).json({ success: false, message: 'Assigned manager must belong to the same organization' });
      }
      validManagerId = mgr.id;
    }

    const user = await User.create({
      name, email: email.toLowerCase(), password, phone,
      roleId,
      organizationId: targetOrgId,
      companyId: targetCompanyId,
      departmentId: departmentId || null,
      paidLeaves: paidLeaves !== undefined && paidLeaves !== '' ? parseInt(paidLeaves, 10) : 12,
      casualLeaves: casualLeaves !== undefined && casualLeaves !== '' ? parseInt(casualLeaves, 10) : 10,
      sickLeaves: sickLeaves !== undefined && sickLeaves !== '' ? parseInt(sickLeaves, 10) : 8,
      baseSalary: baseSalary !== undefined && baseSalary !== '' ? parseFloat(baseSalary) : 0,
      monthlyLeaveQuota: monthlyLeaveQuota !== undefined && monthlyLeaveQuota !== '' ? parseInt(monthlyLeaveQuota, 10) : 1,
      managerId: validManagerId,
      createdById: req.user.id
    });

    const created = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
      ]
    });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'uam', user.id, user.name, `Created user ${user.name} (${user.email})`);

    res.status(201).json({ success: true, message: 'User created successfully', user: created });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/uam/users/:id
router.put('/users/:id', checkPermission('uam', 'users-list', 'canEdit'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isSuperAdmin) return res.status(403).json({ success: false, message: 'Cannot edit Super Admin' });

    if (!req.user.isSuperAdmin && user.organizationId && req.user.organizationId && user.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot edit users from another organization' });
    }

    const { name, email, phone, roleId, organizationId, companyId, departmentId, isActive, paidLeaves, casualLeaves, sickLeaves, baseSalary, monthlyLeaveQuota, managerId } = req.body;

    if (roleId) {
      const role = await Role.findByPk(roleId);
      if (!role) return res.status(400).json({ success: false, message: 'Invalid role' });
      if (role.level === 'super_admin' && !req.user.isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Only Super Admin can assign a Super Admin role' });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (phone !== undefined) updates.phone = phone;
    if (roleId) updates.roleId = roleId;
    if (req.user.isSuperAdmin && organizationId !== undefined) updates.organizationId = organizationId || null;
    if (companyId !== undefined) updates.companyId = companyId || null;
    if (departmentId !== undefined) updates.departmentId = departmentId || null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (paidLeaves !== undefined) updates.paidLeaves = paidLeaves === '' ? 0 : parseInt(paidLeaves, 10);
    if (casualLeaves !== undefined) updates.casualLeaves = casualLeaves === '' ? 0 : parseInt(casualLeaves, 10);
    if (sickLeaves !== undefined) updates.sickLeaves = sickLeaves === '' ? 0 : parseInt(sickLeaves, 10);
    if (baseSalary !== undefined) updates.baseSalary = baseSalary === '' ? 0 : parseFloat(baseSalary);
    if (monthlyLeaveQuota !== undefined) updates.monthlyLeaveQuota = monthlyLeaveQuota === '' ? 1 : parseInt(monthlyLeaveQuota, 10);

    if (managerId !== undefined) {
      if (managerId === user.id) {
        return res.status(400).json({ success: false, message: 'User cannot be their own manager' });
      }
      if (managerId) {
        const mgr = await User.findByPk(managerId);
        if (!mgr) return res.status(400).json({ success: false, message: 'Assigned manager not found' });
        const userOrg = updates.organizationId !== undefined ? updates.organizationId : user.organizationId;
        if (userOrg && mgr.organizationId && mgr.organizationId !== userOrg) {
          return res.status(400).json({ success: false, message: 'Assigned manager must belong to the same organization' });
        }
        updates.managerId = mgr.id;
      } else {
        updates.managerId = null;
      }
    }

    await user.update(updates);

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'code'] },
        { model: Company, as: 'company', attributes: ['id', 'name', 'code'] },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
      ]
    });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'uam', user.id, user.name, {
      description: `Updated user ${user.name} (${user.email})`,
      changes: updates
    });

    res.json({ success: true, message: 'User updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// DELETE /api/uam/users/:id
router.delete('/users/:id', checkPermission('uam', 'users-list', 'canDelete'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isSuperAdmin) return res.status(403).json({ success: false, message: 'Cannot delete Super Admin' });
    if (user.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete your own account' });

    if (!req.user.isSuperAdmin && user.organizationId && req.user.organizationId && user.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot delete users from another organization' });
    }

    const userId = user.id;
    const {
      Attendance, Lead, DesignOrder, LeaveRequest,
      ChatMessage, AuditLog
    } = require('../models');

    // 1. Delete records that cannot have null userId (allowNull: false)
    if (Attendance) {
      await Attendance.destroy({ where: { userId } }).catch(err => console.error('Error deleting user attendance:', err.message));
    }
    if (LeaveRequest) {
      await LeaveRequest.destroy({ where: { userId } }).catch(err => console.error('Error deleting user leave requests:', err.message));
      await LeaveRequest.update({ approvedBy: null }, { where: { approvedBy: userId } }).catch(err => console.error('Error nullifying leave approvals:', err.message));
    }
    if (ChatMessage) {
      await ChatMessage.destroy({ 
        where: { 
          [Op.or]: [
            { senderId: userId },
            { receiverId: userId }
          ] 
        } 
      }).catch(err => console.error('Error deleting user chat messages:', err.message));
    }

    // 2. Nullify records that allow null userId (allowNull: true)
    if (Lead) {
      await Lead.update({ assignedTo: null }, { where: { assignedTo: userId } }).catch(err => console.error('Error nullifying lead assignment:', err.message));
    }
    if (DesignOrder) {
      await DesignOrder.update({ assignedDesignerId: null }, { where: { assignedDesignerId: userId } }).catch(err => console.error('Error nullifying design designer:', err.message));
      await DesignOrder.update({ submittedBy: null }, { where: { submittedBy: userId } }).catch(err => console.error('Error nullifying design submitter:', err.message));
    }
    if (AuditLog) {
      await AuditLog.update({ userId: null }, { where: { userId } }).catch(err => console.error('Error nullifying audit logs:', err.message));
    }

    // 3. Now safely delete the user
    await user.destroy();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'uam', userId, user.name, `Deleted user ${user.name} (${user.email})`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('User delete failed:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/uam/my-permissions
router.get('/my-permissions', async (req, res) => {
  try {
    const { Permission } = require('../models');
    const permissions = await Permission.findAll({ where: { roleId: req.user.roleId } });
    res.json({ success: true, isSuperAdmin: req.user.isSuperAdmin, permissions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
