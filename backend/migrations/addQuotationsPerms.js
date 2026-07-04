/**
 * Migration: Add quotations module ENUM values to PostgreSQL
 * Run: node backend/migrations/addQuotationsPerms.js
 */

require('dotenv').config();
const { connectDB, sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

const migrate = async () => {
  await connectDB();
  console.log('🔄 Running quotations permission migration...\n');

  // Add 'quotations' to the module ENUM
  try {
    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'quotations'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_crm_permissions_module')
        ) THEN
          ALTER TYPE "enum_crm_permissions_module" ADD VALUE 'quotations';
        END IF;
      END $$;
    `);
    console.log('  ✅ Module ENUM value added: quotations');
  } catch (e) {
    console.log('  ⚠️  Module ENUM skip:', e.message);
  }

  // Add screen ENUM values
  const screens = ['quotations-list', 'quotation-create', 'quotation-export'];
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
      console.log(`  ⚠️  Skip '${val}':`, e.message);
    }
  }

  // Seed permission rows for all roles
  const roles = await Role.findAll();
  console.log(`\n📋 Found ${roles.length} roles — seeding quotation permissions...\n`);

  for (const role of roles) {
    const isSuperAdmin = role.code === 'SUPER_ADMIN';
    for (const screen of screens) {
      const [, created] = await Permission.findOrCreate({
        where: { roleId: role.id, module: 'quotations', screen },
        defaults: {
          canView: isSuperAdmin,
          canCreate: isSuperAdmin,
          canEdit: isSuperAdmin,
          canDelete: isSuperAdmin
        }
      });
      console.log(`  ${created ? '➕' : '✔️ '} [${role.name}] quotations/${screen} — ${isSuperAdmin ? 'Full Access' : 'No Access'}`);
    }
  }

  console.log('\n🎉 Quotations migration complete!\n');
  await sequelize.close();
};

migrate().catch(err => {
  console.error('❌ Error:', err);
  sequelize.close().catch(() => {});
  process.exit(1);
});
