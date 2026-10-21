const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DesignOrder, Lead, User, Permission } = require('../models');
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
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    const allowedExts = /\.(jpe?g|png|gif|webp|pdf|xls|xlsx|csv|doc|docx|txt)$/i;
    if (allowedExts.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only PDF, Excel (.xls/.xlsx), CSV, Word (.doc/.docx), or Image files are allowed'));
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
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|gif|webp|pdf|zip|rar|7z|cdr|mp4|glb|gltf|obj|fbx|stl|dwg)$/i;
    const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
    if (okExt) cb(null, true);
    else cb(new Error('File type not allowed. Supported formats: zip, cdr, png, jpg/jpeg, mp4, pdf, glb/gltf, obj, fbx, stl, dwg'));
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
router.put('/:id/assign', checkPermission('design', 'design-list', 'canEdit'), upload.single('requirementDoc'), async (req, res) => {
  try {
    const { id } = req.params;
    const { designerId, endTime } = req.body;

    const order = await DesignOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Design order not found' });
    }

    // If a requirement document was uploaded in this request
    if (req.file) {
      const docUrl = `/uploads/design-references/${req.file.filename}`;
      order.requirementDocUrl = docUrl;
      order.requirementDocName = req.file.originalname;
      if (!order.referenceImageUrl) order.referenceImageUrl = docUrl;
    }

    // ⛔ CRITICAL RULE: Requirment file illama assign panna mudiyathu!
    if (designerId) {
      const hasDoc = !!(order.requirementDocUrl || order.referenceImageUrl || req.file);
      if (!hasDoc) {
        return res.status(400).json({
          success: false,
          message: 'Requirement file illama designer assign panna mudiyathu! Please upload a requirement document (PDF, Excel, CSV, or Doc).'
        });
      }
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

    // Emit real-time project assignment notification to the assigned designer
    if (designerId) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${designerId}`).emit('project_assigned', {
          orderId: order.id,
          companyName: order.companyName,
          assignedBy: req.user.name,
          deadline: endTime || null,
          message: `You have been assigned a new design project: "${order.companyName}"`
        });
      }
    }

    res.json({ success: true, order: updatedOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  POST /api/designs/:id/requirement-doc
// Upload or replace requirement document (PDF, Excel, CSV, Word Doc, Images)
router.post('/:id/requirement-doc', checkPermission('design', 'design-list', 'canEdit'), upload.single('requirementDoc'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a requirement file (PDF, Excel, CSV, or Doc) to upload' });
    }
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });

    const docUrl = `/uploads/design-references/${req.file.filename}`;
    order.requirementDocUrl = docUrl;
    order.requirementDocName = req.file.originalname;
    if (!order.referenceImageUrl) {
      order.referenceImageUrl = docUrl;
    }
    await order.save();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'UPDATE', 'design', order.id, order.companyName, `Uploaded requirement document "${req.file.originalname}" for "${order.companyName}"`);

    const updatedOrder = await DesignOrder.findByPk(order.id, {
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'name', 'companyName', 'phone', 'email'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'designer', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({ success: true, message: 'Requirement document uploaded successfully', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route  GET /api/designs/:id/requirement-doc
// Stream or download requirement document (supports ?token=..., ?view=1 for inline preview)
router.get('/:id/requirement-doc', async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });

    const docPath = order.requirementDocUrl || order.referenceImageUrl;
    if (!docPath) {
      return res.status(404).json({ success: false, message: 'No requirement document attached to this order' });
    }

    const filename = path.basename(docPath);
    const filePath = path.join(__dirname, '../uploads/design-references', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Requirement file not found on server' });
    }

    const ext = path.extname(filename).toLowerCase();
    let downloadName = order.requirementDocName || filename;
    if (!path.extname(downloadName) && ext) {
      downloadName += ext;
    }

    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.txt': 'text/plain'
    };
    const cType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', cType);

    // If query view=1 or inline=1, view inline (e.g. view PDF in browser tab)
    if (req.query.view === '1' || req.query.inline === '1') {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
      return res.sendFile(filePath);
    }

    // Force download with the user's original document name
    return res.download(filePath, downloadName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route  GET /api/designs/:id/completed-model
// Download or view completed 3D / design model file (supports ?fileIndex=..., ?view=1 for inline preview/streaming)
router.get('/:id/completed-model', async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Design order not found' });
    }

    let targetUrl = order.completedModelUrl;
    let targetName = null;

    const files = Array.isArray(order.completedFiles) ? order.completedFiles : [];
    if (req.query.fileIndex !== undefined && files[parseInt(req.query.fileIndex, 10)]) {
      const idx = parseInt(req.query.fileIndex, 10);
      targetUrl = files[idx].url;
      targetName = files[idx].name;
    } else if (files.length > 0 && !targetUrl) {
      targetUrl = files[0].url;
      targetName = files[0].name;
    }

    if (!targetUrl) {
      return res.status(404).json({ success: false, message: 'Completed model file not found' });
    }

    const filename = path.basename(targetUrl);
    const filePath = path.join(__dirname, '../uploads/completed-models', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Model file not found on server' });
    }

    const ext = path.extname(filename).toLowerCase();
    const downloadName = targetName || `${(order.companyName || 'Model').replace(/[^a-zA-Z0-9_-]/g, '_')}_Model${ext}`;

    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.cdr': 'application/octet-stream',
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.obj': 'text/plain',
      '.fbx': 'application/octet-stream',
      '.stl': 'model/stl',
      '.dwg': 'application/acad'
    };
    const cType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', cType);

    if (req.query.view === '1' || req.query.inline === '1') {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(downloadName)}"`);
      return res.sendFile(filePath);
    }

    return res.download(filePath, downloadName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin';

    // Auto-sync any leads with status 'requirement_received' that don't have a DesignOrder yet
    const pendingReqLeads = await Lead.findAll({
      where: {
        status: 'requirement_received',
        ...(!isSuper && req.user.organizationId ? { organizationId: req.user.organizationId } : {})
      }
    });

    for (const l of pendingReqLeads) {
      const exists = await DesignOrder.findOne({ where: { leadId: l.id } });
      if (!exists) {
        await DesignOrder.create({
          leadId: l.id,
          companyName: l.companyName || l.name || 'Unnamed Company',
          exhibitionName: l.expoName || l.expoType || '',
          organizationId: l.organizationId || req.user.organizationId || null,
          submittedBy: l.assignedTo || req.user.id,
          status: 'pending'
        }).catch(() => {});
        await l.update({ designStatus: 'pending' }).catch(() => {});
      }
    }

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
    const requirementDocUrl = referenceImageUrl;
    const requirementDocName = req.file ? req.file.originalname : null;

    const order = await DesignOrder.create({
      leadId: leadId || null,
      companyName, website, exhibitionName, stallNo, hallNo, stallSize, sidesOpen,
      receptionCounter, roundTableBarStool, closedMeetingRoom, productDisplayPodiums,
      productNature, productsCount, postersRequired, brochureStand, pantryStorageArea,
      plasmaTV, flooringType, otherInfo, colorScheme,
      approxBudget: approxBudget || null,
      referenceImageUrl,
      requirementDocUrl,
      requirementDocName,
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
// Upload completed design files (supports multiple files: zip, cdr, png, jpg, mp4, pdf, glb/gltf)
router.post('/:id/complete-model', uploadModel.any(), async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });

    const existingFiles = Array.isArray(order.completedFiles) ? [...order.completedFiles] : [];

    if (files.length === 0 && existingFiles.length === 0 && !order.completedModelUrl) {
      return res.status(400).json({
        success: false,
        message: 'A design file is required (supported: zip, cdr, png, jpg/jpeg, mp4, pdf, glb/gltf). Please select at least one file.'
      });
    }

    const newUploadedFiles = files.map(file => ({
      url: `/uploads/completed-models/${file.filename}`,
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      ext: path.extname(file.originalname).toLowerCase().replace('.', ''),
      uploadedAt: new Date().toISOString()
    }));

    const combinedFiles = [...existingFiles, ...newUploadedFiles];
    const primaryUrl = combinedFiles[0]?.url || (files[0] ? `/uploads/completed-models/${files[0].filename}` : order.completedModelUrl);
    const completedAt = order.completedAt || new Date();

    await order.update({
      status: 'completed',
      completedModelUrl: primaryUrl,
      completedFiles: combinedFiles,
      completedAt
    });

    // Update lead designStatus
    if (order.leadId) {
      await Lead.update({ designStatus: 'completed' }, { where: { id: order.leadId } });
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(
      req,
      'UPDATE',
      'design',
      order.id,
      order.companyName,
      `Marked design as completed with ${newUploadedFiles.length} file(s) for "${order.companyName}"`
    );

    const updatedOrder = await DesignOrder.findByPk(order.id, {
      include: [
        { model: Lead, as: 'lead', attributes: ['id', 'name', 'companyName', 'phone', 'email'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'designer', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      success: true,
      message: `Design marked as completed with ${combinedFiles.length} file(s) attached`,
      order: updatedOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route  DELETE /api/designs/:id/complete-files/:fileIndex
// Delete one of the completed files from a completed order
router.delete('/:id/complete-files/:fileIndex', async (req, res) => {
  try {
    const order = await DesignOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Design order not found' });

    let files = Array.isArray(order.completedFiles) ? [...order.completedFiles] : [];
    const index = parseInt(req.params.fileIndex, 10);

    if (isNaN(index) || index < 0 || index >= files.length) {
      return res.status(400).json({ success: false, message: 'Invalid file index' });
    }

    const removed = files[index];
    files.splice(index, 1);

    if (removed?.url) {
      const diskPath = path.join(__dirname, '..', removed.url);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch (_) {}
      }
    }

    const primaryUrl = files[0]?.url || null;
    await order.update({
      completedFiles: files,
      completedModelUrl: primaryUrl
    });

    res.json({ success: true, message: 'File removed successfully', completedFiles: files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
