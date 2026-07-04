require('dotenv').config();
const { Lead } = require('./models');
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  console.log('Connected');

  const leads = await Lead.findAll({
    where: { status: 'converted' }
  });

  console.log('--- CONVERTED LEADS ---');
  leads.forEach(l => {
    console.log({
      id: l.id,
      name: l.name,
      companyName: l.companyName,
      status: l.status,
      designStatus: l.designStatus,
      organizationId: l.organizationId
    });
  });

  process.exit(0);
}

run();
