require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
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

  app.listen(PORT, async () => {
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

        // Core module permissions
        await Permission.upsert({ roleId: role.id, module: 'performance', screen: 'performance-view', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'closed_sales', screen: 'closed-sales-list', ...fullAccess });

        // Design module — view + create for all admin-level roles
        await Permission.upsert({ roleId: role.id, module: 'design', screen: 'design-list', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'design', screen: 'my-projects-list', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'design', screen: 'completed-models-list', ...fullAccess });

        // Dashboard design widgets
        await Permission.upsert({ roleId: role.id, module: 'dashboard', screen: 'pending-designs-widget', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'dashboard', screen: 'completed-designs-widget', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'dashboard', screen: 'change-designs-widget', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'dashboard', screen: 'total-designs-widget', ...fullAccess });
        await Permission.upsert({ roleId: role.id, module: 'dashboard', screen: 'system-overview', ...fullAccess });

        // Audit logs - SUPER_ADMIN gets full access on startup
        if (role.code === 'SUPER_ADMIN') {
          await Permission.upsert({ roleId: role.id, module: 'uam', screen: 'audit-logs-list', ...fullAccess });
        }
      }
      console.log(`✅ Permissions auto-synced for ${adminRoles.length} admin-level role(s)`);
    } catch (err) {
      console.log('⚠️ Could not auto-sync permissions:', err.message);
    }
  });
};

startServer();
