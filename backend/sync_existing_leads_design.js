require('dotenv').config();
const { DesignOrder, Lead } = require('./models');
const { sequelize } = require('./config/db');

async function run() {
  await sequelize.authenticate();
  console.log('Connected');

  const orders = await DesignOrder.findAll();
  console.log(`Found ${orders.length} design orders to sync.`);

  for (const order of orders) {
    if (order.leadId) {
      const mappedStatus = order.status === 'completed' ? 'completed' : 'pending';
      await Lead.update({ designStatus: mappedStatus }, { where: { id: order.leadId } });
      console.log(`Synced Lead ${order.leadId} to designStatus '${mappedStatus}'`);
    }
  }

  process.exit(0);
}

run();
