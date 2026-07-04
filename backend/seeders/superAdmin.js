require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const { User, Role, Permission } = require('../models');

const ALL_PERMISSIONS = [
  // dashboard
  { module: 'dashboard', screen: 'dashboard-home' },
  { module: 'dashboard', screen: 'leads-widget' },
  { module: 'dashboard', screen: 'projects-widget' },
  { module: 'dashboard', screen: 'pending-projects-widget' },
  { module: 'dashboard', screen: 'completed-projects-widget' },
  { module: 'dashboard', screen: 'total-profit-card' },
  { module: 'dashboard', screen: 'monthly-profit-card' },
  { module: 'dashboard', screen: 'deductions-card' },
  { module: 'dashboard', screen: 'profit-trend-chart' },
  { module: 'dashboard', screen: 'recent-leads-list' },
  { module: 'dashboard', screen: 'recent-projects-list' },
  { module: 'dashboard', screen: 'org-overview' },
  { module: 'dashboard', screen: 'system-overview' },
  // uam
  { module: 'uam', screen: 'users-list' },
  { module: 'uam', screen: 'user-create' },
  { module: 'uam', screen: 'user-edit' },
  { module: 'uam', screen: 'audit-logs-list' },
  // roles
  { module: 'roles', screen: 'roles-list' },
  { module: 'roles', screen: 'role-create' },
  { module: 'roles', screen: 'role-edit' },
  // permissions
  { module: 'permissions', screen: 'permissions-list' },
  { module: 'permissions', screen: 'permission-edit' },
  // organizations
  { module: 'organizations', screen: 'organizations-list' },
  { module: 'organizations', screen: 'organization-create' },
  { module: 'organizations', screen: 'organization-edit' },
  // companies
  { module: 'companies', screen: 'companies-list' },
  { module: 'companies', screen: 'company-create' },
  { module: 'companies', screen: 'company-edit' },
  // departments
  { module: 'departments', screen: 'departments-list' },
  { module: 'departments', screen: 'department-create' },
  { module: 'departments', screen: 'department-edit' },
  // leads
  { module: 'leads', screen: 'leads-list' },
  { module: 'leads', screen: 'lead-create' },
  { module: 'leads', screen: 'lead-edit' },
  { module: 'leads', screen: 'lead-delete' },
  // quotations
  { module: 'quotations', screen: 'quotations-list' },
  { module: 'quotations', screen: 'quotation-create' },
  { module: 'quotations', screen: 'quotation-export' },
];

const seed = async () => {
  await connectDB();

  console.log('🌱 Starting seed...');

  // 1. Create or find Super Admin Role
  let [superAdminRole] = await Role.findOrCreate({
    where: { code: 'SUPER_ADMIN' },
    defaults: {
      name: 'Super Admin',
      description: 'System-level Super Administrator',
      level: 'super_admin',
      isSystem: true,
      isActive: true
    }
  });
  console.log('✅ Super Admin role initialized');

  // 2. Create Super Admin permissions (full access)
  for (const perm of ALL_PERMISSIONS) {
    await Permission.findOrCreate({
      where: { roleId: superAdminRole.id, module: perm.module, screen: perm.screen },
      defaults: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true
      }
    });
  }
  console.log('✅ Super Admin permissions seeded');

  // 3. Create Super Admin User
  let [superAdminUser] = await User.findOrCreate({
    where: { email: process.env.SUPER_ADMIN_EMAIL },
    defaults: {
      name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
      password: process.env.SUPER_ADMIN_PASSWORD,
      roleId: superAdminRole.id,
      isSuperAdmin: true,
      isActive: true
    }
  });
  console.log(`✅ Super Admin user initialized: ${process.env.SUPER_ADMIN_EMAIL}`);

  // 4. Create a default Admin Role
  let [adminRole] = await Role.findOrCreate({
    where: { code: 'ADMIN' },
    defaults: {
      name: 'Admin',
      description: 'Organization Administrator',
      level: 'org_admin',
      isSystem: true,
      isActive: true
    }
  });
  console.log('✅ Admin role initialized');

  // 5. Give Admin role permissions (all except organizations)
  const adminPerms = ALL_PERMISSIONS.filter(p => p.module !== 'organizations');
  for (const perm of adminPerms) {
    await Permission.findOrCreate({
      where: { roleId: adminRole.id, module: perm.module, screen: perm.screen },
      defaults: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true
      }
    });
  }
  console.log('✅ Admin permissions seeded');

  console.log('\n🎉 Seed complete!');
  console.log(`\n📧 Login: ${process.env.SUPER_ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${process.env.SUPER_ADMIN_PASSWORD}`);
  
  await sequelize.close();
};

seed().catch(err => {
  console.error('❌ Seed error:', err);
  sequelize.close().catch(() => {});
  process.exit(1);
});
