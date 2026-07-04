const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'lost', 'converted'),
    defaultValue: 'new'
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'other'
  },
  value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  notes: DataTypes.TEXT,
  designation: DataTypes.STRING,
  sourceType: DataTypes.STRING,
  sourceName: DataTypes.STRING,
  address: DataTypes.TEXT,
  sourceMode: DataTypes.STRING,
  lastContactedDate: DataTypes.DATEONLY,
  nextFollowUp: DataTypes.DATEONLY,
  alternatePhone: DataTypes.STRING,
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_users', key: 'id' }
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_organizations', key: 'id' }
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  vendorPaidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  designStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'change'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'crm_leads',
  timestamps: true
});

module.exports = Lead;
