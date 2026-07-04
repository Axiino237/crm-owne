const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Company = sequelize.define('Company', {
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
    set(val) { this.setDataValue('code', val?.toUpperCase()); }
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false
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
  tableName: 'crm_companies',
  timestamps: true,
  hooks: {
    beforeValidate: async (company) => {
      if (!company.code && company.name) {
        const { generateUniqueCode } = require('../utils/codeGenerator');
        company.code = await generateUniqueCode(Company, company.name, 'code', { organizationId: company.organizationId });
      }
    }
  },
  indexes: [
    { unique: true, fields: ['code', 'organizationId'] }
  ]
});

module.exports = Company;
