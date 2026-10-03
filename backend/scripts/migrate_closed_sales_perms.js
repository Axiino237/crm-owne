require('dotenv').config();
const { sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

async function migrate() {
  try {
    const screens = [
      'closed-sales-value',
      'closed-sales-paid',
      'closed-sales-balance',
      'closed-sales-vendor-payout'
    ];

    for (const screen of screens) {
      try {
        await sequelize.query(`ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS '${screen}'`);
        console.log(`Added enum value '${screen}'`);
      } catch (err) {
        console.log(`Enum note for '${screen}': ${err.message}`);
      }
    }

    // Now seed default permissions for Super Admin and Admin
    const roles = await Role.findAll();
    console.log(`Found ${roles.length} roles to check permissions for.`);

    for (const role of roles) {
      const isSuper = role.code === 'SUPER_ADMIN';
      const isAdmin = role.code === 'ADMIN';

      for (const screen of screens) {
        const existing = await Permission.findOne({
          where: { roleId: role.id, module: 'closed_sales', screen }
        });

        if (!existing) {
          await Permission.create({
            roleId: role.id,
            module: 'closed_sales',
            screen,
            canView: isSuper || isAdmin,
            canCreate: false,
            canEdit: isSuper || isAdmin,
            canDelete: false
          });
          console.log(`Created perm for role ${role.name} (${role.code}): ${screen} (canView: ${isSuper || isAdmin})`);
        } else {
          console.log(`Perm already exists for ${role.code}: ${screen}`);
        }
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
