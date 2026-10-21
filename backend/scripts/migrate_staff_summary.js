require('dotenv').config();
const { sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

async function migrate() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1. Enum update
    const screens = [
      'staff-summary', 'staff-summary-dept', 'staff-summary-all',
      'attendance-team', 'attendance-all-departments',
      'dashboard-all', 'performance-team', 'performance-all-departments', 'net-profit-card'
    ];
    for (const scr of screens) {
      try {
        await sequelize.query(`ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS '${scr}'`);
        console.log(`Added enum value '${scr}' to enum_crm_permissions_screen`);
      } catch (err) {
        console.log(`Enum note (enum_crm_permissions_screen): ${err.message}`);
      }
      try {
        await sequelize.query(`ALTER TYPE enum_permissions_screen ADD VALUE IF NOT EXISTS '${scr}'`);
        console.log(`Added enum value '${scr}' to enum_permissions_screen`);
      } catch (err) {
        console.log(`Enum note (enum_permissions_screen): ${err.message}`);
      }
    }

    // 1.5 Lead statuses
    const leadStatuses = [
      'not_answering', 'number_busy', 'not_interested', 'not_participating',
      'requirement_received', 'call_back', 'follow_ups', 'design_sent',
      'quote_sent', 'sales_closed'
    ];
    for (const st of leadStatuses) {
      try {
        await sequelize.query(`ALTER TYPE enum_crm_leads_status ADD VALUE IF NOT EXISTS '${st}'`);
        console.log(`Added enum value '${st}' to enum_crm_leads_status`);
      } catch (err) {
        console.log(`Lead status enum note (${st}): ${err.message}`);
      }
      try {
        await sequelize.query(`ALTER TYPE enum_leads_status ADD VALUE IF NOT EXISTS '${st}'`);
      } catch (err) {}
    }

    // 2. User columns
    try {
      await sequelize.query(`ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS "baseSalary" NUMERIC(12, 2) DEFAULT 0`);
      await sequelize.query(`ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS "monthlyLeaveQuota" INTEGER DEFAULT 1`);
      console.log('crm_users columns verified.');
    } catch (err) {
      console.log(`crm_users column note: ${err.message}`);
    }

    try {
      await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "baseSalary" NUMERIC(12, 2) DEFAULT 0`);
      await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "monthlyLeaveQuota" INTEGER DEFAULT 1`);
      console.log('users columns verified.');
    } catch (err) {
      console.log(`users column note: ${err.message}`);
    }

    // 2.5 Design order requirement doc and completedFiles columns
    try {
      await sequelize.query(`ALTER TABLE crm_design_orders ADD COLUMN IF NOT EXISTS "requirementDocUrl" TEXT`);
      await sequelize.query(`ALTER TABLE crm_design_orders ADD COLUMN IF NOT EXISTS "requirementDocName" TEXT`);
      await sequelize.query(`ALTER TABLE crm_design_orders ADD COLUMN IF NOT EXISTS "completedFiles" JSONB`);
      console.log('crm_design_orders requirementDoc and completedFiles columns verified.');
    } catch (err) {
      console.log(`crm_design_orders requirementDoc columns note: ${err.message}`);
    }

    // 3. Grant default permission to roles
    const roles = await Role.findAll();
    console.log(`Found ${roles.length} roles.`);

    for (const role of roles) {
      const isSuper = role.code === 'SUPER_ADMIN' || role.level === 'super_admin';
      const isAdmin = role.code === 'ADMIN' || ['org_admin', 'company_admin'].includes(role.level);
      const isHR = role.code === 'HR';
      const isDeptHead = role.level === 'dept_head' || role.code === 'DEPT_HEAD';
      const shouldHaveView = isSuper || isAdmin || isHR;

      // staff-summary (own profile)
      const existing = await Permission.findOne({
        where: { roleId: role.id, module: 'uam', screen: 'staff-summary' }
      });

      if (!existing) {
        await Permission.create({
          roleId: role.id,
          module: 'uam',
          screen: 'staff-summary',
          canView: shouldHaveView,
          canCreate: shouldHaveView,
          canEdit: shouldHaveView,
          canDelete: false
        });
        console.log(`Created staff-summary permission for role ${role.name}: canView=${shouldHaveView}`);
      } else if (shouldHaveView && !existing.canView) {
        existing.canView = true;
        existing.canEdit = true;
        await existing.save();
      }

      // staff-summary-dept (own department)
      const shouldHaveDept = isSuper || isAdmin || isHR || isDeptHead;
      const existingStaffDept = await Permission.findOne({
        where: { roleId: role.id, module: 'uam', screen: 'staff-summary-dept' }
      });
      if (!existingStaffDept) {
        await Permission.create({
          roleId: role.id,
          module: 'uam',
          screen: 'staff-summary-dept',
          canView: shouldHaveDept,
          canCreate: false,
          canEdit: shouldHaveDept,
          canDelete: false
        });
        console.log(`Created staff-summary-dept for role ${role.name}: canView=${shouldHaveDept}`);
      }

      // staff-summary-all (overall org / all departments)
      const shouldHaveAll = isSuper || isAdmin;
      const existingStaffAll = await Permission.findOne({
        where: { roleId: role.id, module: 'uam', screen: 'staff-summary-all' }
      });
      if (!existingStaffAll) {
        await Permission.create({
          roleId: role.id,
          module: 'uam',
          screen: 'staff-summary-all',
          canView: shouldHaveAll,
          canCreate: false,
          canEdit: shouldHaveAll,
          canDelete: false
        });
        console.log(`Created staff-summary-all for role ${role.name}: canView=${shouldHaveAll}`);
      }

      // attendance-team (own department attendance)
      const existingAttTeam = await Permission.findOne({
        where: { roleId: role.id, module: 'attendance', screen: 'attendance-team' }
      });
      if (!existingAttTeam) {
        await Permission.create({
          roleId: role.id,
          module: 'attendance',
          screen: 'attendance-team',
          canView: shouldHaveDept,
          canCreate: false,
          canEdit: false,
          canDelete: false
        });
        console.log(`Created attendance-team for role ${role.name}: canView=${shouldHaveDept}`);
      }

      // attendance-all-departments (all departments attendance)
      const existingAttAll = await Permission.findOne({
        where: { roleId: role.id, module: 'attendance', screen: 'attendance-all-departments' }
      });
      if (!existingAttAll) {
        await Permission.create({
          roleId: role.id,
          module: 'attendance',
          screen: 'attendance-all-departments',
          canView: shouldHaveAll,
          canCreate: false,
          canEdit: false,
          canDelete: false
        });
        console.log(`Created attendance-all-departments for role ${role.name}: canView=${shouldHaveAll}`);
      }

      // dashboard-all permission
      const existingDashAll = await Permission.findOne({
        where: { roleId: role.id, module: 'dashboard', screen: 'dashboard-all' }
      });
      const shouldHaveDashAll = isSuper || isAdmin;
      if (!existingDashAll) {
        await Permission.create({
          roleId: role.id,
          module: 'dashboard',
          screen: 'dashboard-all',
          canView: shouldHaveDashAll,
          canCreate: false,
          canEdit: false,
          canDelete: false
        });
        console.log(`Created dashboard-all permission for role ${role.name} (${role.code}): canView=${shouldHaveDashAll}`);
      }

      // performance-team permission
      const existingPerfTeam = await Permission.findOne({
        where: { roleId: role.id, module: 'performance', screen: 'performance-team' }
      });
      const shouldHavePerfTeam = isSuper || isAdmin;
      if (!existingPerfTeam) {
        await Permission.create({
          roleId: role.id,
          module: 'performance',
          screen: 'performance-team',
          canView: shouldHavePerfTeam,
          canCreate: false,
          canEdit: false,
          canDelete: false
        });
        console.log(`Created performance-team permission for role ${role.name}: canView=${shouldHavePerfTeam}`);
      }

      // performance-all-departments permission
      const existingPerfDepts = await Permission.findOne({
        where: { roleId: role.id, module: 'performance', screen: 'performance-all-departments' }
      });
      const shouldHavePerfDepts = isSuper || isAdmin;
      if (!existingPerfDepts) {
        await Permission.create({
          roleId: role.id,
          module: 'performance',
          screen: 'performance-all-departments',
          canView: shouldHavePerfDepts,
          canCreate: false,
          canEdit: false,
          canDelete: false
        });
        console.log(`Created performance-all-departments permission for role ${role.name}: canView=${shouldHavePerfDepts}`);
      }

      // net-profit-card permission
      const existingNetProfit = await Permission.findOne({
        where: { roleId: role.id, module: 'dashboard', screen: 'net-profit-card' }
      });
      const shouldHaveNetProfit = isSuper || isAdmin;
      if (!existingNetProfit) {
        await Permission.create({
          roleId: role.id,
          module: 'dashboard',
          screen: 'net-profit-card',
          canView: shouldHaveNetProfit,
          canCreate: false,
          canEdit: false,
          canDelete: false
        });
        console.log(`Created net-profit-card permission for role ${role.name}: canView=${shouldHaveNetProfit}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
