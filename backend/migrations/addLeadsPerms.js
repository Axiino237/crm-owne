/**
 * Migration: Add leads module ENUM values to PostgreSQL
 * Run: node backend/migrations/addLeadsPerms.js
 */

require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

const migrate = async () => {
  await connectDB();
  console.log('🔄 Running leads permission migration...\n');

  // Step 1: Add 'leads' to the module ENUM
  try {
    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'leads'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_crm_permissions_module')
        ) THEN
          ALTER TYPE "enum_crm_permissions_module" ADD VALUE 'leads';
        END IF;
      END $$;
    `);
    console.log('  ✅ Module ENUM value added: leads');
  } catch (e) {
    console.log('  ⚠️  Module ENUM skip:', e.message);
  }

  // Step 2: Add screen ENUM values
  const screens = ['leads-list', 'lead-create', 'lead-edit', 'lead-delete'];
  for (const val of screens) {
    try {
      await sequelize.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = '${val}'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_crm_permissions_screen')
          ) THEN
            ALTER TYPE "enum_crm_permissions_screen" ADD VALUE '${val}';
          END IF;
        END $$;
      `);
      console.log(`  ✅ Screen ENUM value added: ${val}`);
    } catch (e) {
      console.log(`  ⚠️  Screen ENUM skip '${val}':`, e.message);
    }
  }

  // Step 3: Insert permission rows for all roles
  const roles = await Role.findAll();
  console.log(`\n📋 Found ${roles.length} roles — seeding leads permissions...\n`);

  for (const role of roles) {
    const isSuperAdmin = role.code === 'SUPER_ADMIN';
    for (const screen of screens) {
      const [, created] = await Permission.findOrCreate({
        where: { roleId: role.id, module: 'leads', screen },
        defaults: {
          canView: isSuperAdmin,
          canCreate: isSuperAdmin,
          canEdit: isSuperAdmin,
          canDelete: isSuperAdmin
        }
      });
      console.log(`  ${created ? '➕' : '✔️ '} [${role.name}] leads/${screen} — ${isSuperAdmin ? 'Full Access' : 'No Access'}`);
    }
  }

  console.log('\n🎉 Leads migration complete!\n');
  await sequelize.close();
};

migrate().catch(err => {
  console.error('❌ Error:', err);
  sequelize.close().catch(() => {});
  process.exit(1);
});
