const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const multer = require('multer');
const XLSX = require('xlsx');
const { Lead, User, Organization } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

// Multer — memory storage for CSV / Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV or Excel files are allowed'));
  }
});

// Simple CSV parser — no external dependencies needed
const parseCSV = (buffer) => {
  const text = buffer.toString('utf8');
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas inside
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += ch;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
};

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'lost', 'converted'];
const VALID_SOURCES = ['website', 'referral', 'social_media', 'cold_call', 'email', 'other'];

// @desc   Get all leads
// @route  GET /api/leads
router.get('/', checkPermission('leads', 'leads-list', 'canView'), async (req, res) => {
  try {
    const { search = '', status, source, page = 1, limit = 10 } = req.query;

    // Base search + source + org scope (shared between table and badge counts)
    const baseWhere = {};
    if (search) {
      baseWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { sourceType: { [Op.iLike]: `%${search}%` } },
        { sourceName: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { sourceMode: { [Op.iLike]: `%${search}%` } },
        { alternatePhone: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (source) baseWhere.source = source;

    // Scope by org / role hierarchy
    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
    const isOrgAdmin = userRole === 'org_admin';
    const isCompanyAdmin = userRole === 'company_admin';

    const { Department } = require('../models');
    const managedDept = !isSuper && !isOrgAdmin && !isCompanyAdmin
      ? await Department.findOne({ where: { headId: req.user.id }, attributes: ['id'] })
      : null;
    const isDeptHead = !!managedDept;
    const hasTeamScope = (userRole === 'dept_manager') || isDeptHead;
    const scopedDeptId = managedDept?.id || req.user.departmentId;

    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        baseWhere.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        // Company admin sees leads assigned to company users or unassigned in company scope
        const companyUserIds = (await User.findAll({
          where: { companyId: req.user.companyId },
          attributes: ['id']
        })).map(u => u.id);
        baseWhere.organizationId = req.user.organizationId;
        baseWhere.assignedTo = { [Op.or]: [{ [Op.in]: companyUserIds }, null] };
      } else if (hasTeamScope && scopedDeptId) {
        // Team head / dept manager sees leads of department users or unassigned in department scope
        const deptUserIds = (await User.findAll({
          where: { departmentId: scopedDeptId },
          attributes: ['id']
        })).map(u => u.id);
        baseWhere.organizationId = req.user.organizationId;
        baseWhere.assignedTo = { [Op.or]: [{ [Op.in]: deptUserIds }, null] };
      } else {
        // Regular user sees only leads assigned directly to them
        baseWhere.organizationId = req.user.organizationId;
        baseWhere.assignedTo = req.user.id;
      }
    }

    // Table query — includes status filter if provided
    const tableWhere = { ...baseWhere };
    if (status) tableWhere.status = status;

    const { count, rows } = await Lead.findAndCountAll({
      where: tableWhere,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit)
    });

    // Per-status badge counts — uses baseWhere WITHOUT status filter
    // so all status pills always show real totals across the whole dataset
    const { sequelize } = require('../config/db');
    const statusCountRows = await Lead.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: baseWhere,
      group: ['status'],
      raw: true
    });
    const statusCounts = {};
    statusCountRows.forEach(r => { statusCounts[r.status] = parseInt(r.count, 10); });

    res.json({ success: true, total: count, page: Number(page), limit: Number(limit), leads: rows, statusCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


// @desc   Download CSV template
// @route  GET /api/leads/csv-template
router.get('/csv-template', checkPermission('leads', 'leads-list', 'canView'), (req, res) => {
  const headers = 'Company Name,Contact Person,Email,Phone Number,Designation,Source Type,Source Name,Address,Assigned To,Status,Source Mode,Last Contacted Date,Next Follow Up,Remarks,Alternate Phone';
  const sample  = 'Acme Corp,John Doe,john@acme.com,9876543210,CEO,Social Media,Google Ads,123 Main St,admin@crm.com,new,Online,2026-06-30,2026-07-15,Looking for CRM options,9876543211';
  const csv = `${headers}\n${sample}\n`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads_template.csv"');
  res.send(csv);
});

// @desc   Get single lead
// @route  GET /api/leads/:id
router.get('/:id', checkPermission('leads', 'leads-list', 'canView'), async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
      ]
    });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Scoping check for read authorization
    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
    const isOrgAdmin = userRole === 'org_admin';
    const isCompanyAdmin = userRole === 'company_admin';

    const { Department } = require('../models');
    const managedDept = !isSuper && !isOrgAdmin && !isCompanyAdmin
      ? await Department.findOne({ where: { headId: req.user.id }, attributes: ['id'] })
      : null;
    const isDeptHead = !!managedDept;
    const hasTeamScope = (userRole === 'dept_manager') || isDeptHead;
    const scopedDeptId = managedDept?.id || req.user.departmentId;

    let isAuthorized = false;
    if (isSuper) {
      isAuthorized = true;
    } else if (lead.organizationId === req.user.organizationId) {
      if (isOrgAdmin) {
        isAuthorized = true;
      } else if (lead.assignedTo === req.user.id) {
        isAuthorized = true;
      } else if (isCompanyAdmin && req.user.companyId) {
        if (lead.assignedTo) {
          const assigneeUser = await User.findByPk(lead.assignedTo, { attributes: ['companyId'] });
          if (assigneeUser && assigneeUser.companyId === req.user.companyId) isAuthorized = true;
        } else {
          isAuthorized = true; // Company Admin sees unassigned
        }
      } else if (hasTeamScope && scopedDeptId) {
        if (lead.assignedTo) {
          const assigneeUser = await User.findByPk(lead.assignedTo, { attributes: ['departmentId'] });
          if (assigneeUser && assigneeUser.departmentId === scopedDeptId) isAuthorized = true;
        } else {
          isAuthorized = true; // Manager/Head sees unassigned
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view this lead' });
    }

    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Create lead
// @route  POST /api/leads
router.post('/', checkPermission('leads', 'leads-list', 'canCreate'), async (req, res) => {
  try {
    const {
      name, companyName, email, phone, status, source, value, notes, assignedTo,
      designation, sourceType, sourceName, address, sourceMode, lastContactedDate, nextFollowUp, alternatePhone,
      paidAmount, vendorPaidAmount, designStatus
    } = req.body;
    if (!name && !companyName) return res.status(400).json({ success: false, message: 'Either Contact Person or Company Name is required' });

    const lead = await Lead.create({
      name,
      companyName: companyName || null,
      email: email || null,
      phone: phone || null,
      status: status || 'new',
      source: source || 'other',
      value: value || 0,
      notes: notes || null,
      assignedTo: assignedTo || (req.user.role?.level === 'user' ? req.user.id : null),
      designation: designation || null,
      sourceType: sourceType || null,
      sourceName: sourceName || null,
      address: address || null,
      sourceMode: sourceMode || null,
      lastContactedDate: lastContactedDate || null,
      nextFollowUp: nextFollowUp || null,
      alternatePhone: alternatePhone || null,
      paidAmount: paidAmount || 0,
      vendorPaidAmount: vendorPaidAmount || 0,
      designStatus: designStatus || 'pending',
      organizationId: req.user.organizationId || null
    });

    const created = await Lead.findByPk(lead.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }]
    });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'leads', lead.id, lead.companyName || lead.name, `Created lead "${lead.companyName || lead.name}"`);

    res.status(201).json({ success: true, message: 'Lead created successfully', lead: created });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Update lead
// @route  PUT /api/leads/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userRole = req.user.role?.level;
    if (req.user.isSuperAdmin || userRole === 'super_admin') {
      return next();
    }

    const { Permission } = require('../models');
    
    // Check if user has either leads/leads-list/canEdit OR closed_sales/closed-sales-list/canEdit
    const hasLeadsEdit = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'leads', screen: 'leads-list', canEdit: true }
    });
    
    const hasClosedSalesEdit = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'closed_sales', screen: 'closed-sales-list', canEdit: true }
    });
    
    if (hasLeadsEdit || hasClosedSalesEdit) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: "Access denied: You don't have permission to edit leads/closed-sales"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Permission check failed', error: error.message });
  }
}, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const {
      name, companyName, email, phone, status, source, value, notes, assignedTo,
      designation, sourceType, sourceName, address, sourceMode, lastContactedDate, nextFollowUp, alternatePhone,
      paidAmount, vendorPaidAmount, designStatus
    } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (companyName !== undefined) updates.companyName = companyName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (status !== undefined) updates.status = status;
    if (source !== undefined) updates.source = source;
    if (value !== undefined) updates.value = value;
    if (notes !== undefined) updates.notes = notes;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (designation !== undefined) updates.designation = designation;
    if (sourceType !== undefined) updates.sourceType = sourceType;
    if (sourceName !== undefined) updates.sourceName = sourceName;
    if (address !== undefined) updates.address = address;
    if (sourceMode !== undefined) updates.sourceMode = sourceMode;
    if (lastContactedDate !== undefined) updates.lastContactedDate = lastContactedDate || null;
    if (nextFollowUp !== undefined) updates.nextFollowUp = nextFollowUp || null;
    if (alternatePhone !== undefined) updates.alternatePhone = alternatePhone;
    if (paidAmount !== undefined) updates.paidAmount = paidAmount;
    if (vendorPaidAmount !== undefined) updates.vendorPaidAmount = vendorPaidAmount;
    if (designStatus !== undefined) updates.designStatus = designStatus;

    await lead.update(updates);

    const updated = await Lead.findByPk(lead.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }]
    });

    const { logAction } = require('../utils/auditLogger');
    const isClosedSalesAction = status === 'converted' || paidAmount !== undefined || vendorPaidAmount !== undefined;
    const logModule = isClosedSalesAction ? 'closed_sales' : 'leads';
    await logAction(req, 'UPDATE', logModule, lead.id, lead.companyName || lead.name, {
      description: `Updated lead "${lead.companyName || lead.name}"`,
      changes: updates
    });

    res.json({ success: true, message: 'Lead updated successfully', lead: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Bulk Delete leads
// @route  DELETE /api/leads/bulk-delete
router.delete('/bulk-delete', checkPermission('leads', 'leads-list', 'canDelete'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No lead IDs provided' });
    }

    const where = { id: { [Op.in]: ids } };
    // Scope to org for non-super-admins
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const deleted = await Lead.destroy({ where });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'leads', null, `${deleted} leads`, `Bulk deleted ${deleted} lead(s)`);

    res.json({ success: true, message: `${deleted} lead(s) deleted successfully`, count: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Delete lead
// @route  DELETE /api/leads/:id
router.delete('/:id', checkPermission('leads', 'leads-list', 'canDelete'), async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    await lead.destroy();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'leads', lead.id, lead.companyName || lead.name, `Deleted lead "${lead.companyName || lead.name}"`);

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/bulk-upload', checkPermission('leads', 'leads-list', 'canCreate'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let rows = [];
    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      rows = rawRows.map(row => {
        const newRow = {};
        for (const [key, value] of Object.entries(row)) {
          newRow[key.trim().toLowerCase()] = String(value).trim();
        }
        return newRow;
      });
    } else {
      const parsed = parseCSV(req.file.buffer);
      rows = parsed.rows;
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file is empty or has no data rows' });
    }

    const { User } = require('../models');
    const allUsers = await User.findAll({ attributes: ['id', 'name', 'email'] });

    const results = { created: 0, skipped: 0, errors: [] };
    const orgId = req.user.organizationId || null;

    const parseCSVDate = (val) => {
      if (!val) return null;
      // If it is a potential Excel serial date number
      if (!isNaN(val) && parseFloat(val) > 20000 && parseFloat(val) < 60000) {
        const date = new Date(Math.round((parseFloat(val) - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2

      // Map columns (support lowercase, spaces, and no-spaces variants)
      const name = (row['contact person'] || row['contactperson'] || row['name'] || row['lead name'] || row['leadname'] || '').trim();
      const companyName = (row['company name'] || row['companyname'] || row['company'] || '').trim();

      if (!name && !companyName) {
        results.errors.push({ row: rowNum, error: 'Either Contact Person or Company Name is required' });
        results.skipped++;
        continue;
      }

      // Status mapping (default to 'new')
      let status = (row['status'] || 'new').trim().toLowerCase();
      if (!VALID_STATUSES.includes(status)) {
        status = 'new';
      }

      // Assignee lookup
      const assignedToVal = (row['assigned to'] || row['assignedto'] || '').trim().toLowerCase();
      let assignedToId = null;
      if (assignedToVal) {
        const found = allUsers.find(u =>
          u.email.toLowerCase() === assignedToVal ||
          u.name.toLowerCase() === assignedToVal
        );
        if (found) {
          assignedToId = found.id;
        }
      } else if (req.user.role?.level === 'user') {
        assignedToId = req.user.id;
      }

      try {
        await Lead.create({
          name: name || null,
          companyName: companyName || null,
          email: (row['email'] || '').trim() || null,
          phone: (row['phone number'] || row['phonenumber'] || row['phone'] || row['mobile'] || '').trim() || null,
          status,
          source: (row['source type'] || row['sourcetype'] || row['source'] || 'other').trim().toLowerCase() || 'other',
          value: parseFloat(row['value'] || row['estimated value'] || '0') || 0,
          notes: (row['remarks'] || row['notes'] || row['note'] || '').trim() || null,
          designation: (row['designation'] || '').trim() || null,
          sourceType: (row['source type'] || row['sourcetype'] || '').trim() || null,
          sourceName: (row['source name'] || row['sourcename'] || '').trim() || null,
          address: (row['address'] || '').trim() || null,
          sourceMode: (row['source mode'] || row['sourcemode'] || '').trim() || null,
          lastContactedDate: parseCSVDate(row['last contacted date'] || row['lastcontacteddate']),
          nextFollowUp: parseCSVDate(row['next follow up'] || row['nextfollowup']),
          alternatePhone: (row['alternate phone'] || row['alternatephone'] || '').trim() || null,
          assignedTo: assignedToId,
          organizationId: orgId
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, name, error: err.message });
        results.skipped++;
      }
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'leads', null, 'Bulk Upload', `Bulk uploaded leads: ${results.created} created, ${results.skipped} skipped`);

    res.json({
      success: true,
      message: `Bulk upload complete: ${results.created} created, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
