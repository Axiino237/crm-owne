const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  revenue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  deductions: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  startDate: DataTypes.DATEONLY,
  endDate: DataTypes.DATEONLY
}, {
  tableName: 'crm_projects',
  timestamps: true
});

module.exports = Project;
