// Central model registry + associations
const User = require('./User');
const Role = require('./Role');
const Permission = require('./Permission');
const Organization = require('./Organization');
const Company = require('./Company');
const Department = require('./Department');
const Lead = require('./Lead');
const Project = require('./Project');
const DesignOrder = require('./DesignOrder');
const AuditLog = require('./AuditLog');
const Attendance = require('./Attendance');
const LeaveRequest = require('./LeaveRequest');
const Holiday = require('./Holiday');
const ChatServer = require('./ChatServer');
const ChatMessage = require('./ChatMessage');

// ---- Associations ----

// Role belongs to Organization / Company (scope)
Role.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Role.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// User belongs to Role, Org, Company, Department
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Permission belongs to Role
Permission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(Permission, { foreignKey: 'roleId', as: 'permissions' });

// Company belongs to Organization
Company.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Company, { foreignKey: 'organizationId', as: 'companies' });

// Department belongs to Company + Organization
Department.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Department.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Department.belongsTo(User, { foreignKey: 'headId', as: 'head', constraints: false });
Company.hasMany(Department, { foreignKey: 'companyId', as: 'departments' });
Department.hasMany(User, { foreignKey: 'departmentId', as: 'members' });

// Lead associations
Lead.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee', constraints: false });
Lead.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization', constraints: false });

// DesignOrder associations
DesignOrder.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead', constraints: false });
DesignOrder.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter', constraints: false });
DesignOrder.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization', constraints: false });
DesignOrder.belongsTo(User, { foreignKey: 'assignedDesignerId', as: 'designer', constraints: false });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

// Attendance associations
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendances' });
Attendance.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization', constraints: false });

// LeaveRequest associations
LeaveRequest.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
User.hasMany(LeaveRequest, { foreignKey: 'userId', as: 'leaveRequests' });
LeaveRequest.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver', constraints: false });

// Holiday associations
Holiday.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization', constraints: false });

// ChatServer and ChatMessage associations
ChatServer.hasMany(Company, { foreignKey: 'chatServerId', as: 'companies' });
Company.belongsTo(ChatServer, { foreignKey: 'chatServerId', as: 'chatServer' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender', constraints: false });
ChatMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver', constraints: false });
ChatMessage.belongsTo(ChatServer, { foreignKey: 'chatServerId', constraints: false });
ChatMessage.belongsTo(Company, { foreignKey: 'companyId', constraints: false });

module.exports = { 
  User, Role, Permission, Organization, Company, Department, Lead, Project, DesignOrder, AuditLog, Attendance, LeaveRequest, Holiday, ChatServer, ChatMessage 
};
