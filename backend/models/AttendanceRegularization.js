const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AttendanceRegularization = sequelize.define('AttendanceRegularization', {
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
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_organizations', key: 'id' }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  checkIn: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOut: {
    type: DataTypes.DATE,
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
  managerNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'crm_attendance_regularizations',
  timestamps: true
});

module.exports = AttendanceRegularization;
