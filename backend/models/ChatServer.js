const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatServer = sequelize.define('ChatServer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'crm_organizations', key: 'id' }
  }
}, {
  tableName: 'crm_chat_servers',
  timestamps: true
});

module.exports = ChatServer;
