const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DesignOrder = sequelize.define('DesignOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_leads', key: 'id' }
  },
  companyName: { type: DataTypes.STRING, allowNull: false },
  website: { type: DataTypes.STRING, allowNull: true },
  exhibitionName: { type: DataTypes.STRING, allowNull: true },
  stallNo: { type: DataTypes.STRING, allowNull: true },
  hallNo: { type: DataTypes.STRING, allowNull: true },
  stallSize: { type: DataTypes.STRING, allowNull: true },
  sidesOpen: { type: DataTypes.STRING, allowNull: true },
  receptionCounter: { type: DataTypes.STRING, allowNull: true },      // y/n
  roundTableBarStool: { type: DataTypes.STRING, allowNull: true },    // y/n + count
  closedMeetingRoom: { type: DataTypes.STRING, allowNull: true },     // y/n + count
  productDisplayPodiums: { type: DataTypes.STRING, allowNull: true },
  productNature: { type: DataTypes.TEXT, allowNull: true },
  productsCount: { type: DataTypes.STRING, allowNull: true },
  postersRequired: { type: DataTypes.STRING, allowNull: true },       // Flex/Backlit/Sunboard
  brochureStand: { type: DataTypes.STRING, allowNull: true },         // y/n
  pantryStorageArea: { type: DataTypes.STRING, allowNull: true },     // y/n
  plasmaTV: { type: DataTypes.STRING, allowNull: true },              // y/n
  flooringType: { type: DataTypes.STRING, allowNull: true },
  otherInfo: { type: DataTypes.TEXT, allowNull: true },
  colorScheme: { type: DataTypes.STRING, allowNull: true },
  approxBudget: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
  referenceImageUrl: { type: DataTypes.TEXT, allowNull: true },       // stored file path
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
    defaultValue: 'pending'
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_organizations', key: 'id' }
  },
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_users', key: 'id' }
  },
  assignedDesignerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_users', key: 'id' }
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedModelUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'crm_design_orders',
  timestamps: true
});

module.exports = DesignOrder;
