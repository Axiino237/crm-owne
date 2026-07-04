require('dotenv').config();
const { User, Role, Permission } = require('./models');
const { connectDB, sequelize } = require('./config/db');

async function run() {
  await connectDB();
  console.log('✅ Connected');

  const merly = await User.findOne({
    where: { email: 'telecallhead@crm.com' },
    include: [{ model: Role, as: 'role' }]
  });

  const permissions = await Permission.findAll({
    where: { roleId: merly.roleId }
  });

  console.log('--- PERMISSIONS ---');
  permissions.forEach(p => {
    console.log({
      module: p.module,
      screen: p.screen,
      canView: p.canView,
      canCreate: p.canCreate,
      canEdit: p.canEdit,
      canDelete: p.canDelete
    });
  });

  process.exit(0);
}
run();
