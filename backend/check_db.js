require('dotenv').config();
const { User, Role, Department, DesignOrder } = require('./models');
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  console.log('✅ Connected');

  const users = await User.findAll({
    include: [
      { model: Role, as: 'role' },
      { model: Department, as: 'department' }
    ]
  });
  console.log('--- ALL USERS ---');
  users.forEach(u => {
    console.log({
      id: u.id,
      name: u.name,
      email: u.email,
      roleName: u.role?.name,
      roleLevel: u.role?.level,
      deptName: u.department?.name,
      deptCode: u.department?.code,
      organizationId: u.organizationId
    });
  });

  const orders = await DesignOrder.findAll();
  console.log('--- ALL DESIGN ORDERS ---');
  orders.forEach(o => {
    console.log({
      id: o.id,
      companyName: o.companyName,
      organizationId: o.organizationId,
      submittedBy: o.submittedBy
    });
  });
  process.exit(0);
}
run();
