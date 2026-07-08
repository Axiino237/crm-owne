const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'crm_users', key: 'id' }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  leaveType: {
    type: DataTypes.ENUM('casual', 'sick', 'earned', 'other'),
    defaultValue: 'casual'
  },
  leaveDuration: {
    type: DataTypes.ENUM('full_day', 'half_day'),
    defaultValue: 'full_day'
  },
  halfDaySession: {
    type: DataTypes.ENUM('first_half', 'second_half'),
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_users', key: 'id' }
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_organizations', key: 'id' }
  }
}, {
  tableName: 'crm_leave_requests',
  timestamps: true
});

module.exports = LeaveRequest;
