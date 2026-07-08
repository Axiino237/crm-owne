const express = require('express');
const router = express.Router();
const { ChatServer, ChatMessage, Company, User, Role, Department } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(protect);

// Helper to get organizationId (with fallback for Super Admin)
const getOrgId = async (req) => {
  let orgId = req.user.organizationId;
  if (req.user.isSuperAdmin && !orgId) {
    const { Organization } = require('../models');
    const firstOrg = await Organization.findOne();
    orgId = firstOrg?.id;
  }
  return orgId;
};

// @desc   Get all chat servers and unassigned companies in user's organization
// @route  GET /api/chat/servers
router.get('/servers', async (req, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    // Get all chat servers in org
    const servers = await ChatServer.findAll({
      where: { organizationId: orgId },
      include: [{ model: Company, as: 'companies', attributes: ['id', 'name', 'code'] }],
      order: [['name', 'ASC']]
    });

    // Get all companies in org (to show which are unassigned / available)
    const companies = await Company.findAll({
      where: { organizationId: orgId },
      attributes: ['id', 'name', 'code', 'chatServerId'],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, servers, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving chat servers', error: error.message });
  }
});

// @desc   Create a chat server (Org/Super Admin only)
// @route  POST /api/chat/server
router.post('/server', adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Server name is required' });
    }

    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const server = await ChatServer.create({
      name,
      organizationId: orgId
    });

    res.status(201).json({ success: true, message: 'Chat server created successfully', server });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating chat server', error: error.message });
  }
});

// @desc   Update a chat server name and company links (Org/Super Admin only)
// @route  PUT /api/chat/server/:id
router.put('/server/:id', adminOnly, async (req, res) => {
  try {
    const { name, companyIds } = req.body;
    const server = await ChatServer.findByPk(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Chat server not found' });
    }

    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    // Update name if provided
    if (name) {
      await server.update({ name });
    }

    // Update linked companies if provided
    if (companyIds && Array.isArray(companyIds)) {
      // First, unlink all companies previously linked to this server
      await Company.update({ chatServerId: null }, { where: { chatServerId: server.id } });

      // Link new companies
      if (companyIds.length > 0) {
        await Company.update(
          { chatServerId: server.id },
          { where: { id: { [Op.in]: companyIds }, organizationId: orgId } }
        );
      }
    }

    res.json({ success: true, message: 'Chat server updated successfully', server });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating chat server', error: error.message });
  }
});

// @desc   Delete a chat server (Org/Super Admin only)
// @route  DELETE /api/chat/server/:id
router.delete('/server/:id', adminOnly, async (req, res) => {
  try {
    const server = await ChatServer.findByPk(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Chat server not found' });
    }

    // Unlink all companies from this server
    await Company.update({ chatServerId: null }, { where: { chatServerId: server.id } });

    // Delete server
    await server.destroy();

    res.json({ success: true, message: 'Chat server deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting chat server', error: error.message });
  }
});

// @desc   Get message history for a channel (server, company private, or one-on-one DM)
// @route  GET /api/chat/messages
router.get('/messages', async (req, res) => {
  try {
    const { chatServerId, companyId, receiverId } = req.query;
    
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const whereClause = { organizationId: orgId };
    
    if (receiverId) {
      // Direct Message history between req.user.id and receiverId
      const currentUserId = req.user.id;
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { senderId: currentUserId, receiverId: receiverId },
            { senderId: receiverId, receiverId: currentUserId }
          ]
        },
        { chatServerId: null },
        { companyId: null }
      ];
    } else if (chatServerId) {
      // User must have access to this server (must belong to a company assigned to this server, or be an admin)
      const server = await ChatServer.findByPk(chatServerId);
      if (!server || server.organizationId !== orgId) {
        return res.status(403).json({ success: false, message: 'Unauthorized server access' });
      }

      if (!req.user.isSuperAdmin && !['super_admin', 'org_admin'].includes(req.user.role?.level)) {
        const userCompany = await Company.findByPk(req.user.companyId);
        if (!userCompany || userCompany.chatServerId !== chatServerId) {
          return res.status(403).json({ success: false, message: 'Access denied to this chat workspace' });
        }
      }
      whereClause.chatServerId = chatServerId;
      whereClause.receiverId = null;
    } else if (companyId) {
      // User must belong to this company (or be an admin)
      if (!req.user.isSuperAdmin && !['super_admin', 'org_admin'].includes(req.user.role?.level) && req.user.companyId !== companyId) {
        return res.status(403).json({ success: false, message: 'Access denied to this company workspace' });
      }
      whereClause.companyId = companyId;
      whereClause.chatServerId = null;
      whereClause.receiverId = null;
    } else {
      return res.status(400).json({ success: false, message: 'Either chatServerId, companyId, or receiverId is required' });
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      include: [
        { 
          model: User, 
          as: 'sender', 
          attributes: ['id', 'name', 'email', 'avatar'],
          include: [
            { model: Company, as: 'company', attributes: ['id', 'name'] },
            { model: Role, as: 'role', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [['createdAt', 'ASC']],
      limit: 150
    });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving messages', error: error.message });
  }
});

// @desc   Send a chat message
// @route  POST /api/chat/message
router.post('/message', async (req, res) => {
  try {
    const { message, chatServerId, companyId, receiverId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const data = {
      senderId: req.user.id,
      message,
      organizationId: orgId
    };

    if (receiverId) {
      data.receiverId = receiverId;
      data.chatServerId = null;
      data.companyId = null;
    } else if (chatServerId) {
      data.chatServerId = chatServerId;
      data.companyId = null;
      data.receiverId = null;
    } else if (companyId) {
      data.companyId = companyId;
      data.chatServerId = null;
      data.receiverId = null;
    } else {
      return res.status(400).json({ success: false, message: 'Target channel or receiver is required' });
    }

    const newMessage = await ChatMessage.create(data);

    // Fetch message with sender details populated for instant rendering
    const msg = await ChatMessage.findByPk(newMessage.id, {
      include: [
        { 
          model: User, 
          as: 'sender', 
          attributes: ['id', 'name', 'email', 'avatar'],
          include: [
            { model: Company, as: 'company', attributes: ['id', 'name'] },
            { model: Role, as: 'role', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error sending message', error: error.message });
  }
});

// @desc   Get members list that the current user is allowed to chat/DM with
// @route  GET /api/chat/members
router.get('/members', async (req, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    let targetCompanyIds = [];

    // Admins can see all companies members in the organization
    const isAdminRole = req.user.isSuperAdmin || ['super_admin', 'org_admin'].includes(req.user.role?.level);
    if (isAdminRole) {
      const companies = await Company.findAll({ where: { organizationId: orgId } });
      targetCompanyIds = companies.map(c => c.id);
    } else {
      // Find current user's company and check its chatServerId
      const userCompany = await Company.findByPk(req.user.companyId);
      if (userCompany && userCompany.chatServerId) {
        // Linked to a workspace server: get all companies sharing this server
        const connectedCompanies = await Company.findAll({
          where: { chatServerId: userCompany.chatServerId, organizationId: orgId }
        });
        targetCompanyIds = connectedCompanies.map(c => c.id);
      } else {
        // Isolated: can only see members of their own company
        targetCompanyIds = req.user.companyId ? [req.user.companyId] : [];
      }
    }

    // Get all active users in target companies (excluding current user)
    const users = await User.findAll({
      where: { 
        companyId: { [Op.in]: targetCompanyIds }, 
        organizationId: orgId,
        isActive: true,
        id: { [Op.ne]: req.user.id } // Exclude myself from member list for cleaner DMs listing
      },
      attributes: ['id', 'name', 'email', 'avatar', 'lastActiveAt'],
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [['name', 'ASC']]
    });

    const cutoff = new Date(Date.now() - 180000); // 3 minutes ago
    const members = users.map(u => {
      const isOnline = u.lastActiveAt && new Date(u.lastActiveAt) > cutoff;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        companyName: u.company?.name || 'Unassigned',
        roleName: u.role?.name || 'User',
        deptName: u.department?.name || 'Unassigned',
        isOnline: !!isOnline
      };
    });

    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching members', error: error.message });
  }
});

module.exports = router;
