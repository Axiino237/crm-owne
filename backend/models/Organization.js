const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    set(val) { this.setDataValue('code', val?.toUpperCase()); }
  },
  description: DataTypes.TEXT,
  logo: DataTypes.STRING,
  address: DataTypes.TEXT,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  website: DataTypes.STRING,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_organizations',
  timestamps: true,
  hooks: {
    beforeValidate: async (organization) => {
      if (!organization.code && organization.name) {
        const { generateUniqueCode } = require('../utils/codeGenerator');
        organization.code = await generateUniqueCode(Organization, organization.name);
      }
    }
  }
});

module.exports = Organization;
