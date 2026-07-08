const { Sequelize } = require('sequelize');

// Parse DATABASE_URL manually to avoid connection string overrides
const connectionString = process.env.DATABASE_URL;
const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
const match = connectionString.match(regex);

if (!match) {
  console.error("Invalid DATABASE_URL format");
  process.exit(1);
}

const [_, username, password, host, port, database] = match;

const decodedPassword = decodeURIComponent(password);

const sequelize = new Sequelize(database, username, decodedPassword, {
  host: host,
  port: port,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // This disables SSL verification check
    }
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL Connected (Supabase)');
    
    // Add new ENUM values to Postgres if they exist to prevent sync failures
    try {
      await sequelize.query("ALTER TYPE enum_crm_permissions_module ADD VALUE IF NOT EXISTS 'performance'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'performance-view'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'audit-logs-list'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'system-overview'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_module ADD VALUE IF NOT EXISTS 'closed_sales'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'closed-sales-list'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'pending-designs-widget'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'completed-designs-widget'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'change-designs-widget'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'total-designs-widget'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_module ADD VALUE IF NOT EXISTS 'design'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'design-list'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'my-projects-list'");
      await sequelize.query("ALTER TABLE crm_design_orders ADD COLUMN IF NOT EXISTS \"endTime\" TIMESTAMP WITH TIME ZONE");
      await sequelize.query("ALTER TABLE crm_design_orders ADD COLUMN IF NOT EXISTS \"completedModelUrl\" TEXT");
      await sequelize.query("ALTER TABLE crm_design_orders ADD COLUMN IF NOT EXISTS \"completedAt\" TIMESTAMP WITH TIME ZONE");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'completed-models-list'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_module ADD VALUE IF NOT EXISTS 'attendance'");
      await sequelize.query("ALTER TYPE enum_crm_permissions_screen ADD VALUE IF NOT EXISTS 'attendance-list'");
    } catch (err) {
      // Silently ignore if types do not exist yet (will be created by sync)
    }

    await sequelize.sync();
    console.log('✅ Database tables synced');
  } catch (error) {
    console.error('❌ PostgreSQL Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
