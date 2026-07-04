require('dotenv').config();
const { User, Role, Department, DesignOrder } = require('./models');
const { sequelize } = require('./config/db');
const { Op } = require('sequelize');

async function buildScopeWhere(user) {
  const level = user.role?.level;
  const w = {};
  if (user.isSuperAdmin || level === 'super_admin') return w;

  // Check if user is on the Design Team (by role name or department name/code)
  let isDesignTeam = false;
  if (user.role?.name && user.role.name.toLowerCase().includes('design')) {
    isDesignTeam = true;
  }
  if (user.departmentId) {
    const dept = await Department.findByPk(user.departmentId);
    if (dept && (dept.name.toLowerCase().includes('design') || (dept.code && dept.code.toLowerCase().includes('design')))) {
      isDesignTeam = true;
    }
  }

  console.log('Is Design Team calculated:', isDesignTeam);

  if (isDesignTeam) {
    // Design team members must see all design requests in their organization
    if (user.organizationId) {
      w.organizationId = user.organizationId;
    }
    return w;
  }

  // Sales/Tele-caller submission-based scoping
  if ((level === 'org_admin') && user.organizationId) {
    w.organizationId = user.organizationId;
  } else if (level === 'dept_manager' && user.departmentId) {
    const deptUsers = await User.findAll({ where: { departmentId: user.departmentId }, attributes: ['id'] });
    w.submittedBy = { [Op.in]: deptUsers.map(u => u.id) };
  } else {
    w.submittedBy = user.id;
  }
  return w;
}

async function run() {
  await sequelize.authenticate();
  console.log('Connected');

  const user = await User.findOne({
    where: { email: 'vijaydesign@crm.com' },
    include: [{ model: Role, as: 'role' }]
  });

  if (!user) {
    console.log('User not found!');
    process.exit(1);
  }

  console.log('Loaded User:', {
    name: user.name,
    role: user.role?.name,
    deptId: user.departmentId,
    orgId: user.organizationId
  });

  const where = await buildScopeWhere(user);
  console.log('Generated Where Clause:', where);

  const orders = await DesignOrder.findAll({ where });
  console.log('Design Orders found count:', orders.length);
  orders.forEach(o => {
    console.log({
      id: o.id,
      companyName: o.companyName,
      orgId: o.organizationId,
      status: o.status
    });
  });

  process.exit(0);
}
run();
