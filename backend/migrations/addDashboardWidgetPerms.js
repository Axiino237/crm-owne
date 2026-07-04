/**
 * Migration script: Add new dashboard widget permissions to PostgreSQL ENUM
 * and insert missing permission rows for all existing roles.
 * 
 * Run with: node backend/migrations/addDashboardWidgetPerms.js
 */

require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

const NEW_DASHBOARD_SCREENS = [
  'leads-widget',
  'projects-widget',
  'pending-projects-widget',
  'completed-projects-widget',
  'total-profit-card',
  'monthly-profit-card',
  'deductions-card',
  'profit-trend-chart',
  'recent-leads-list',
  'recent-projects-list',
  'org-overview',
];

const migrate = async () => {
  await connectDB();
  console.log('🔄 Running dashboard widget permission migration...\n');

  // Step 1: Add new ENUM values to the crm_enum_screen type in Postgres
  // Sequelize ALTER TYPE must be done via raw query
  for (const val of NEW_DASHBOARD_SCREENS) {
    try {
      // PostgreSQL: ADD VALUE IF NOT EXISTS (Postgres 9.1+)
      await sequelize.query(
        `DO $$ BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_enum
             WHERE enumlabel = '${val}'
             AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_crm_permissions_screen')
           ) THEN
             ALTER TYPE "enum_crm_permissions_screen" ADD VALUE '${val}';
           END IF;
         END $$;`
      );
      console.log(`  ✅ ENUM value added: ${val}`);
    } catch (err) {
      console.log(`  ⚠️  Skipping ENUM '${val}': ${err.message}`);
    }
  }

  // Step 2: Find all roles and insert missing permission rows
  const roles = await Role.findAll();
  console.log(`\n📋 Found ${roles.length} roles — seeding missing dashboard widget permissions...\n`);

  for (const role of roles) {
    for (const screen of NEW_DASHBOARD_SCREENS) {
      const isSuperAdmin = role.code === 'SUPER_ADMIN';
      const [, created] = await Permission.findOrCreate({
        where: { roleId: role.id, module: 'dashboard', screen },
        defaults: {
          canView: isSuperAdmin,
          canCreate: isSuperAdmin,
          canEdit: isSuperAdmin,
          canDelete: isSuperAdmin
        }
      });
      if (created) {
        console.log(`  ➕ [${role.name}] dashboard/${screen} — ${isSuperAdmin ? 'Full Access' : 'No Access (configure via UAM)'}`);
      } else {
        console.log(`  ✔️  [${role.name}] dashboard/${screen} — already exists`);
      }
    }
  }

  console.log('\n🎉 Migration complete!\n');
  console.log('💡 You can now control dashboard widget visibility per-role via the Permissions page in UAM.\n');
  await sequelize.close();
};

migrate().catch(err => {
  console.error('❌ Migration error:', err);
  sequelize.close().catch(() => {});
  process.exit(1);
});
