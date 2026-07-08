const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'crm_users', key: 'id' }
  },
  receiverId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_users', key: 'id' }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  chatServerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_chat_servers', key: 'id' }
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_companies', key: 'id' }
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'crm_organizations', key: 'id' }
  }
}, {
  tableName: 'crm_chat_messages',
  timestamps: true
});

module.exports = ChatMessage;
