const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Department = sequelize.define('Department', {
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
  companyId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  description: DataTypes.TEXT,
  headId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_departments',
  timestamps: true,
  hooks: {
    beforeValidate: async (dept) => {
      if (!dept.code && dept.name) {
        const { generateUniqueCode } = require('../utils/codeGenerator');
        dept.code = await generateUniqueCode(Department, dept.name, 'code', { companyId: dept.companyId });
      }
    }
  },
  indexes: [
    { unique: true, fields: ['code', 'companyId'] }
  ]
});

module.exports = Department;
