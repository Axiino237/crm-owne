require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

const NEW_WIDGET_SCREENS = [
  'calls-widget',
  'interested-leads-widget'
];

const migrate = async () => {
  await connectDB();
  console.log('🔄 Running migration for new widgets in UAM...\n');

  // Step 1: Add new ENUM values to enum_crm_permissions_screen in Postgres
  for (const val of NEW_WIDGET_SCREENS) {
    try {
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

  // Step 2: Seed permissions for all roles
  const roles = await Role.findAll();
  console.log(`\n📋 Found ${roles.length} roles — seeding new widget permissions...\n`);

  for (const role of roles) {
    const isSuperAdmin = role.code === 'SUPER_ADMIN' || role.level === 'super_admin';
    const isOrgAdmin = role.level === 'org_admin' || role.level === 'company_admin';

    for (const screen of NEW_WIDGET_SCREENS) {
      const [perm, created] = await Permission.findOrCreate({
        where: { roleId: role.id, module: 'dashboard', screen },
        defaults: {
          roleId: role.id,
          module: 'dashboard',
          screen,
          canView: isSuperAdmin || isOrgAdmin, // enabled by default for admins, customizable in UAM
          canCreate: false,
          canEdit: false,
          canDelete: false
        }
      });

      if (created) {
        console.log(`  ➕ Added [${screen}] to role [${role.name}]`);
      } else {
        console.log(`  ✓  [${screen}] already exists for role [${role.name}]`);
      }
    }
  }

  console.log('\n🎉 Migration completed successfully!');
  process.exit(0);
};

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
