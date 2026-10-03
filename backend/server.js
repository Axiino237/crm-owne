require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://178.238.236.200', 'http://crm.178-238-236-200.sslip.io'],
    credentials: true
  }
});

// Map of active users: userId -> Set(socket.id)
const activeUsers = new Map();

// Configure socket authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication error: Token missing'));

  try {
    const jwt = require('jsonwebtoken');
    const { User, Role } = require('./models');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid or inactive user'));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Token invalid'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  const userId = socket.user.id;
  
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
    // Broadcast user online status change
    io.emit('status_change', { userId, isOnline: true });
  }
  activeUsers.get(userId).add(socket.id);

  // Join rooms for easy broadcasting
  socket.join(`org_${socket.user.organizationId}`);
  if (socket.user.companyId) {
    socket.join(`company_${socket.user.companyId}`);
  }

  socket.on('disconnect', () => {
    const userSockets = activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        activeUsers.delete(userId);
        // Broadcast user offline status change
        io.emit('status_change', { userId, isOnline: false });
      }
    }
  });
});

// Attach socket objects to express app
app.set('io', io);
app.set('activeUsers', activeUsers);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://178.238.236.200', 'http://crm.178-238-236-200.sslip.io'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/uam', require('./routes/uam'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/org-overview', require('./routes/orgOverview'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/closed-sales', require('./routes/closedSales'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/chat', require('./routes/chat'));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Start server only after DB is fully connected + synced
const startServer = async () => {
  // Wait for DB connection + ALTER TYPE + sync to complete
  await connectDB();

  server.listen(PORT, async () => {
    console.log(`\n🚀 CRM Server running on http://localhost:${PORT}`);
    console.log(`📋 API Docs: http://localhost:${PORT}/api/health\n`);

    // Auto-seed/ensure permissions for admin-level roles on startup
    try {
      const { Role, Permission } = require('./models');
      const { Op } = require('sequelize');

      // Automatically correct custom roles that need correct level mapping
      await Role.update({ level: 'org_admin' }, { where: { name: 'ORG ADMIN' } });
      await Role.update({ level: 'dept_manager' }, { where: { name: 'Tele Team head' } });

      // Seed for ALL elevated roles: system admins + org admins + department managers
      const adminRoles = await Role.findAll({
        where: {
          [Op.or]: [
            { code: ['SUPER_ADMIN', 'ADMIN'] },
            { level: ['org_admin', 'dept_manager'] }
          ]
        }
      });

      for (const role of adminRoles) {
        const fullAccess = { canView: true, canCreate: true, canEdit: true, canDelete: true };
        const ensurePerm = async (module, screen, access = fullAccess) => {
          await Permission.findOrCreate({
            where: { roleId: role.id, module, screen },
            defaults: { roleId: role.id, module, screen, ...access }
          });
        };

        // ✅ Dashboard — ALL business stat widgets
        await ensurePerm('dashboard', 'dashboard-home');
        await ensurePerm('dashboard', 'leads-widget');
        await ensurePerm('dashboard', 'projects-widget');
        await ensurePerm('dashboard', 'pending-projects-widget');
        await ensurePerm('dashboard', 'completed-projects-widget');
        await ensurePerm('dashboard', 'total-profit-card');
        await ensurePerm('dashboard', 'monthly-profit-card');
        await ensurePerm('dashboard', 'deductions-card');
        await ensurePerm('dashboard', 'profit-trend-chart');
        await ensurePerm('dashboard', 'recent-leads-list');
        await ensurePerm('dashboard', 'recent-projects-list');

        // ✅ Dashboard — Design widgets
        await ensurePerm('dashboard', 'total-designs-widget');
        await ensurePerm('dashboard', 'pending-designs-widget');
        await ensurePerm('dashboard', 'completed-designs-widget');
        await ensurePerm('dashboard', 'change-designs-widget');
        await ensurePerm('dashboard', 'system-overview');

        // ✅ Core modules
        await ensurePerm('performance', 'performance-view');
        await ensurePerm('closed_sales', 'closed-sales-list');
        await ensurePerm('attendance', 'attendance-list');

        // ✅ Chat module
        await ensurePerm('chat', 'chat-room');
        await ensurePerm('chat', 'chat-workspaces');

        // ✅ Design module
        await ensurePerm('design', 'design-list');
        await ensurePerm('design', 'my-projects-list');
        await ensurePerm('design', 'completed-models-list');

        // ✅ Leads & Quotations
        await ensurePerm('leads', 'leads-list');
        await ensurePerm('leads', 'lead-create');
        await ensurePerm('leads', 'lead-edit');
        await ensurePerm('leads', 'lead-delete');
        await ensurePerm('quotations', 'quotations-list');
        await ensurePerm('quotations', 'quotation-create');
        await ensurePerm('quotations', 'quotation-export');

        // ✅ Audit logs - SUPER_ADMIN only
        if (role.code === 'SUPER_ADMIN') {
          await ensurePerm('uam', 'audit-logs-list');
        }
      }
      console.log(`✅ Permissions auto-synced for ${adminRoles.length} admin-level role(s)`);
    } catch (err) {
      console.log('⚠️ Could not auto-sync permissions:', err.message);
    }
  });
};

startServer();
