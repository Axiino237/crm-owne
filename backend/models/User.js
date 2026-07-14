const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: DataTypes.STRING,
  avatar: DataTypes.STRING,
  roleId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isSuperAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetOTP: DataTypes.STRING,
  resetOTPExpiry: DataTypes.DATE,
  resetOTPVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resetToken: DataTypes.STRING,
  resetTokenExpiry: DataTypes.DATE,
  lastLogin: DataTypes.DATE,
  lastActiveAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
