const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Role = sequelize.define('Role', {
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
  level: {
    type: DataTypes.ENUM('super_admin', 'org_admin', 'company_admin', 'dept_manager', 'user'),
    defaultValue: 'user'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_roles',
  timestamps: true,
  hooks: {
    beforeValidate: async (role) => {
      if (!role.code && role.name) {
        const { generateUniqueCode } = require('../utils/codeGenerator');
        role.code = await generateUniqueCode(Role, role.name);
      }
    }
  }
});

module.exports = Role;
