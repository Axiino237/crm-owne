const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Holiday = sequelize.define('Holiday', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('public', 'restricted', 'company'),
    defaultValue: 'public'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_organizations', key: 'id' }
  }
}, {
  tableName: 'crm_holidays',
  timestamps: true
});

module.exports = Holiday;
