const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  module: {
    type: DataTypes.ENUM('dashboard', 'uam', 'roles', 'permissions', 'organizations', 'companies', 'departments', 'leads', 'quotations', 'performance', 'closed_sales', 'design', 'chat', 'attendance'),
    allowNull: false
  },
  screen: {
    type: DataTypes.ENUM(
      'dashboard-home',
      'leads-widget', 'projects-widget', 'pending-projects-widget', 'completed-projects-widget',
      'total-profit-card', 'monthly-profit-card', 'deductions-card',
      'profit-trend-chart', 'recent-leads-list', 'recent-projects-list',
      'org-overview', 'system-overview',
      'pending-designs-widget', 'completed-designs-widget', 'change-designs-widget', 'total-designs-widget',
      'users-list', 'user-create', 'user-edit', 'audit-logs-list',
      'roles-list', 'role-create', 'role-edit',
      'permissions-list', 'permission-edit',
      'organizations-list', 'organization-create', 'organization-edit',
      'companies-list', 'company-create', 'company-edit',
      'departments-list', 'department-create', 'department-edit',
      'leads-list', 'lead-create', 'lead-edit', 'lead-delete',
      'quotations-list', 'quotation-create', 'quotation-export',
      'performance-view',
      'closed-sales-list',
      'design-list',
      'my-projects-list', 'completed-models-list',
      'chat-room', 'chat-workspaces',
      'attendance-list'
    ),
    allowNull: false
  },
  canView: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canCreate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canEdit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canDelete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'crm_permissions',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['roleId', 'module', 'screen'] }
  ]
});

module.exports = Permission;
