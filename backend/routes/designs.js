const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DesignOrder, Lead, User } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');

router.use(protect);

// Configure multer for reference image uploads
const uploadDir = path.join(__dirname, '../uploads/design-references');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image/PDF files are allowed'));
  }
});

// Configure multer for completed model uploads
const modelUploadDir = path.join(__dirname, '../uploads/completed-models');
if (!fs.existsSync(modelUploadDir)) fs.mkdirSync(modelUploadDir, { recursive: true });

const modelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, modelUploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const uploadModel = multer({
  storage: modelStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|zip|rar|obj|fbx|stl|dwg/;
    const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
    if (okExt) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// Scoping helper: build where clause based on role & department
async function buildScopeWhere(user) {
  const w = {};
  if (user.isSuperAdmin || user.role?.level === 'super_admin') return w;

  if (user.organizationId) {
    w.organizationId = user.organizationId;
  }
  return w;
}

// @route  GET /api/designs/designers
router.get('/designers', checkPermission('design', 'design-list', 'canView'), async (req, res) => {
  try {
    const { User, Department, Role } = require('../models');

    // Find all departments that have "design" in name/code
    const depts = await Department.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: '%design%' } },
          { code: { [Op.iLike]: '%design%' } }
        ]
      },
      attributes: ['id']
    });
    const deptIds = depts.map(d => d.id);

    // Find all roles that have "design" in name
    const roles = await Role.findAll({
      where: {
        name: { [Op.iLike]: '%design%' }
      },
      attributes: ['id']
    });
    const roleIds = roles.map(r => r.id);

    // Find all users in these departments or with these roles
    const designers = await User.findAll({
      where: {
        organizationId: req.user.organizationId || null,
        isActive: true,
        [Op.or]: [
          { departmentId: { [Op.in]: deptIds } },
          { roleId: { [Op.in]: roleIds } }
        ]
      },
      attributes: ['id', 'name', 'email']
    });

    res.json({ success: true, designers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  PUT /api/designs/:id/assign
router.put('/:id/assign', checkPermission('design', 'design-list', 'canEdit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { designerId, endTime } = req.body;

    const order = await DesignOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Design order not found' });
    }

    order.assignedDesignerId = designerId || null;
    order.endTime = endTime ? new Date(endTime) : null;
    if (designerId && order.status === 'pending') {
      order.status = 'in_progress';
    }
    await order.save();

    // Log action
    const { logAction } = require('../utils/auditLogger');
    await logAction(
      req,
      'UPDATE',
      'design',
      order.id,
      order.companyName,
      `Assigned design order to designer ${designerId || 'None'} with deadline ${endTime || 'None'}`
    );

    // Refetch with associations
    const updatedOrder = await DesignOrder.findByPk(id, {
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'name', 'companyName', 'phone', 'email'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'designer', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  GET /api/designs/my
router.get('/my', checkPermission('design', 'my-projects-list', 'canView'), async (req, res) => {
  try {
    const orders = await DesignOrder.findAll({
      where: {
        assignedDesignerId: req.user.id,
        organizationId: req.user.organizationId || null
      },
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'name', 'companyName', 'phone', 'email'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  GET /api/designs
router.get('/', checkPermission('design', 'design-list', 'canView'), async (req, res) => {
  try {
    const where = await buildScopeWhere(req.user);
    const orders = await DesignOrder.findAll({
      where,
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'name', 'companyName', 'phone', 'email'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'designer', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  POST /api/designs
router.post('/', checkPermission('design', 'design-list', 'canCreate'), upload.single('referenceImage'), async (req, res) => {
  try {
    const {
      leadId, companyName, website, exhibitionName, stallNo, hallNo, stallSize, sidesOpen,
      receptionCounter, roundTableBarStool, closedMeetingRoom, productDisplayPodiums,
      productNature, productsCount, postersRequired, brochureStand, pantryStorageArea,
      plasmaTV, flooringType, otherInfo, colorScheme, approxBudget
    } = req.body;

    if (!companyName) return res.status(400).json({ success: false, message: 'Company Name is required' });

    const referenceImageUrl = req.file
      ? `/uploads/design-references/${req.file.filename}`
      : null;

    const order = await DesignOrder.create({
      leadId: leadId || null,
      companyName, website, exhibitionName, stallNo, hallNo, stallSize, sidesOpen,
      receptionCounter, roundTableBarStool, closedMeetingRoom, productDisplayPodiums,
      productNature, productsCount, postersRequired, brochureStand, pantryStorageArea,
      plasmaTV, flooringType, otherInfo, colorScheme,
      approxBudget: approxBudget || null,
      referenceImageUrl,
      organizationId: req.user.organizationId || null,
      submittedBy: req.user.id,
      status: 'pending'
    });

    if (leadId) {
      await Lead.update({ designStatus: 'pending' }, { where: { id: leadId } });
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'design', order.id, order.companyName, `Created design order for "${order.companyName}"`);

    res.status(201).json({ success: true, message: 'Design order submitted successfully', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  PUT /api/designs/:id/status
router.put('/:id/status', async (req, res, next) => {
  try {
    const userRole = req.user.role?.level;
    if (req.user.isSuperAdmin || userRole === 'super_admin') {
      return next();
    }

    const { Permission } = require('../models');

    // Check if user has either design/design-list/canEdit OR design/my-projects-list/canEdit
    const hasDesignListEdit = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'design', screen: 'design-list', canEdit: true }
    });

    const hasMyProjectsEdit = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'design', screen: 'my-projects-list', canEdit: true }
    });

    if (hasDesignListEdit || hasMyProjectsEdit) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Access denied: You don't have permission to edit design status"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Permission check failed', error: error.message });
  }
}, async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });
    await order.update({ status: req.body.status });

    if (order.leadId) {
      const mappedStatus = req.body.status === 'completed' ? 'completed' : 'pending';
      await Lead.update({ designStatus: mappedStatus }, { where: { id: order.leadId } });
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'design', order.id, order.companyName, `Updated design order status to "${req.body.status}" for "${order.companyName}"`);

    res.json({ success: true, message: 'Status updated', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  POST /api/designs/:id/complete-model
// Upload final design model file when marking as completed
router.post('/:id/complete-model', uploadModel.single('model'), async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });

    // Delete old model file if exists
    if (order.completedModelUrl) {
      const oldPath = path.join(__dirname, '..', order.completedModelUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const modelUrl = req.file ? `/uploads/completed-models/${req.file.filename}` : null;
    const completedAt = new Date();

    await order.update({
      status: 'completed',
      completedModelUrl: modelUrl,
      completedAt
    });

    // Update lead designStatus
    if (order.leadId) {
      await Lead.update({ designStatus: 'completed' }, { where: { id: order.leadId } });
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'design', order.id, order.companyName, `Marked design as completed with model upload for "${order.companyName}"`);

    res.json({ success: true, message: 'Design marked as completed with model uploaded', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  GET /api/designs/completed-models
// Get all completed design orders with model info (for telecallers)
router.get('/completed-models', checkPermission('design', 'completed-models-list', 'canView'), async (req, res) => {
  try {
    const scopeWhere = await buildScopeWhere(req.user);
    const orders = await DesignOrder.findAll({
      where: { ...scopeWhere, status: 'completed' },
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'designer', attributes: ['id', 'name', 'email'] },
        { model: Lead, as: 'lead', attributes: ['id', 'name', 'companyName', 'phone', 'email'] }
      ],
      order: [['completedAt', 'DESC'], ['updatedAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  PUT /api/designs/:id/get
router.put('/:id/get', checkPermission('design', 'design-list', 'canEdit'), async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });
    if (order.assignedDesignerId) return res.status(400).json({ success: false, message: 'This project is already taken by another designer' });

    await order.update({
      assignedDesignerId: req.user.id,
      status: 'in_progress'
    });

    if (order.leadId) {
      await Lead.update({ designStatus: 'pending' }, { where: { id: order.leadId } });
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'design', order.id, order.companyName, `Accepted/Assigned design project for "${order.companyName}"`);

    res.json({ success: true, message: 'Project accepted! Moved to My Projects.', order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  DELETE /api/designs/:id
router.delete('/:id', checkPermission('design', 'design-list', 'canDelete'), async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });
    if (order.referenceImageUrl) {
      const fullPath = path.join(__dirname, '..', order.referenceImageUrl);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    await order.destroy();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'design', order.id, order.companyName, `Deleted design order for "${order.companyName}"`);

    res.json({ success: true, message: 'Design order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
