const express = require('express');
const router = express.Router();
const { Lead, Project, User, DesignOrder } = require('../models');
const { protect } = require('../middleware/auth');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

router.use(protect);

// Helper to seed dummy data if empty
async function seedDummyDataIfEmpty() {
  try {
    const leadCount = await Lead.count();
    if (leadCount === 0) {
      await Lead.bulkCreate([
        { name: 'John Doe', companyName: 'Google Inc.', email: 'john@google.com', phone: '+1 555-1234', status: 'converted', source: 'Website', value: 50000.00, notes: 'Interested in CRM custom systems' },
        { name: 'Jane Smith', companyName: 'Acme Corp', email: 'jane@acme.com', phone: '+1 555-5678', status: 'qualified', source: 'Referral', value: 25000.00, notes: 'Follow up next Tuesday' },
        { name: 'Vijay Kumar', companyName: 'Vee Tech', email: 'vijay@veetech.in', phone: '+91 9876543210', status: 'contacted', source: 'LinkedIn', value: 15000.00, notes: 'Shared brochure' },
        { name: 'Sarah Connor', companyName: 'Cyberdyne Systems', email: 'sarah@cyberdyne.com', phone: '+1 555-9000', status: 'new', source: 'Google Ads', value: 120000.00, notes: 'Very high intent lead' },
        { name: 'Robert Downey', companyName: 'Stark Industries', email: 'tony@stark.com', phone: '+1 555-3000', status: 'converted', source: 'Partner', value: 450000.00, notes: 'Signed contract' },
        { name: 'Elon Musk', companyName: 'X Corp', email: 'elon@x.com', phone: '+1 555-4242', status: 'lost', source: 'Cold Email', value: 90000.00, notes: 'Not interested at this time' },
        { name: 'Sundar Pichai', companyName: 'Alphabet', email: 'sundar@google.com', phone: '+1 555-1111', status: 'new', source: 'Website', value: 80000.00, notes: 'Requested demo request' },
        { name: 'Mark Zuckerberg', companyName: 'Meta', email: 'mark@meta.com', phone: '+1 555-2222', status: 'contacted', source: 'LinkedIn', value: 150000.00, notes: 'Interested in enterprise subscription' }
      ]);
      console.log('✅ Dummy leads seeded successfully!');
    }

    const projectCount = await Project.count();
    if (projectCount === 0) {
      // Seed projects over the last few months with realistic revenues & deductions
      await Project.bulkCreate([
        { name: 'CRM Customization', description: 'Enterprise CRM integration', status: 'completed', revenue: 75000.00, deductions: 12000.00, startDate: '2026-01-10', endDate: '2026-03-15' },
        { name: 'HR Portal App', description: 'Internal employee hub', status: 'completed', revenue: 45000.00, deductions: 8000.00, startDate: '2026-02-01', endDate: '2026-04-20' },
        { name: 'Supabase SQL Setup', description: 'Database migration and seeding', status: 'in_progress', revenue: 30000.00, deductions: 5000.00, startDate: '2026-05-15', endDate: null },
        { name: 'Mobile Companion iOS', description: 'Vite-based PWA application wrapper', status: 'pending', revenue: 60000.00, deductions: 15000.00, startDate: '2026-06-01', endDate: null },
        { name: 'AI Search Agent Integration', description: 'Integrating semantic web search agents', status: 'in_progress', revenue: 95000.00, deductions: 22000.00, startDate: '2026-06-15', endDate: null },
        { name: 'E-commerce API Integration', description: 'Payment gateway and checkout', status: 'completed', revenue: 40000.00, deductions: 9000.00, startDate: '2026-03-01', endDate: '2026-05-10' },
        { name: 'Security Audit & Compliance', description: 'SOC2 readiness', status: 'cancelled', revenue: 20000.00, deductions: 4000.00, startDate: '2026-04-01', endDate: '2026-04-10' }
      ]);
      console.log('✅ Dummy projects seeded successfully!');
    }
  } catch (error) {
    console.error('❌ Error seeding dummy business data:', error);
  }
}

// Stats Endpoint
router.get('/stats', async (req, res) => {
  try {
    // await seedDummyDataIfEmpty();

    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
    const isOrgAdmin = userRole === 'org_admin';
    const isCompanyAdmin = userRole === 'company_admin';
    const isDeptManager = userRole === 'dept_manager';
    const isRegular = userRole === 'user';

    // Base scoping where clause for dashboard counts
    const countsWhere = {};
    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        countsWhere.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        const companyUserIds = (await User.findAll({
          where: { companyId: req.user.companyId },
          attributes: ['id']
        })).map(u => u.id);
        countsWhere.assignedTo = { [Op.or]: [{ [Op.in]: companyUserIds }, null] };
      } else if (isDeptManager && req.user.departmentId) {
        const deptUserIds = (await User.findAll({
          where: { departmentId: req.user.departmentId },
          attributes: ['id']
        })).map(u => u.id);
        countsWhere.assignedTo = { [Op.or]: [{ [Op.in]: deptUserIds }, null] };
      } else if (isRegular) {
        countsWhere.assignedTo = req.user.id;
      }
    }

    const totalLeads = await Lead.count({ where: countsWhere });
    const totalProjects = await Project.count();
    
    const pendingProjects = await Project.count({
      where: {
        status: { [Op.in]: ['pending', 'in_progress'] }
      }
    });

    const completedProjects = await Project.count({
      where: {
        status: 'completed'
      }
    });

    // Count design statuses from converted leads
    // Design team scoping check
    let isDesignTeam = false;
    if (req.user.role?.name && req.user.role.name.toLowerCase().includes('design')) {
      isDesignTeam = true;
    }
    if (req.user.departmentId) {
      const { Department } = require('../models');
      const dept = await Department.findByPk(req.user.departmentId);
      if (dept && (dept.name.toLowerCase().includes('design') || (dept.code && dept.code.toLowerCase().includes('design')))) {
        isDesignTeam = true;
      }
    }

    const designOrderWhere = {};
    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        designOrderWhere.organizationId = req.user.organizationId;
      } else if (isDesignTeam) {
        designOrderWhere.assignedDesignerId = req.user.id;
        if (req.user.organizationId) designOrderWhere.organizationId = req.user.organizationId;
      } else if (isDeptManager && req.user.departmentId) {
        const deptUserIds = (await User.findAll({
          where: { departmentId: req.user.departmentId },
          attributes: ['id']
        })).map(u => u.id);
        designOrderWhere.submittedBy = { [Op.in]: deptUserIds };
        if (req.user.organizationId) designOrderWhere.organizationId = req.user.organizationId;
      } else {
        designOrderWhere.submittedBy = req.user.id;
        if (req.user.organizationId) designOrderWhere.organizationId = req.user.organizationId;
      }
    }

    const totalDesigns = await DesignOrder.count({
      where: designOrderWhere
    });

    const pendingDesigns = await DesignOrder.count({
      where: {
        ...designOrderWhere,
        status: { [Op.in]: ['pending', 'in_progress'] }
      }
    });

    const completedDesigns = await DesignOrder.count({
      where: {
        ...designOrderWhere,
        status: 'completed'
      }
    });

    const changeWhere = {};
    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        changeWhere.organizationId = req.user.organizationId;
      } else if (isDesignTeam) {
        const assignedLeadIds = (await DesignOrder.findAll({
          where: { assignedDesignerId: req.user.id },
          attributes: ['leadId']
        })).map(o => o.leadId).filter(Boolean);
        changeWhere.id = { [Op.in]: assignedLeadIds };
        if (req.user.organizationId) changeWhere.organizationId = req.user.organizationId;
      } else if (isDeptManager && req.user.departmentId) {
        const deptUserIds = (await User.findAll({
          where: { departmentId: req.user.departmentId },
          attributes: ['id']
        })).map(u => u.id);
        changeWhere.submittedBy = { [Op.in]: deptUserIds };
        if (req.user.organizationId) changeWhere.organizationId = req.user.organizationId;
      } else {
        changeWhere.submittedBy = req.user.id;
        if (req.user.organizationId) changeWhere.organizationId = req.user.organizationId;
      }
    }

    const changeDesigns = await Lead.count({
      where: {
        ...changeWhere,
        status: 'converted',
        designStatus: 'change'
      }
    });

    // Compute financial totals from Converted Leads (fully paid only: value = paidAmount)

    const financialWhere = {
      status: 'converted'
    };

    // Only count leads where value === paidAmount
    financialWhere[Op.and] = [
      sequelize.where(sequelize.col('value'), '=', sequelize.col('paidAmount'))
    ];

    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        financialWhere.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        const companyUserIds = (await User.findAll({
          where: { companyId: req.user.companyId },
          attributes: ['id']
        })).map(u => u.id);
        financialWhere.assignedTo = { [Op.or]: [{ [Op.in]: companyUserIds }, null] };
      } else if (isDeptManager && req.user.departmentId) {
        const deptUserIds = (await User.findAll({
          where: { departmentId: req.user.departmentId },
          attributes: ['id']
        })).map(u => u.id);
        financialWhere.assignedTo = { [Op.or]: [{ [Op.in]: deptUserIds }, null] };
      } else if (isRegular) {
        financialWhere.assignedTo = req.user.id;
      }
    }

    const financeStats = await Lead.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('value')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('vendorPaidAmount')), 'totalDeductions']
      ],
      where: financialWhere,
      raw: true
    });

    const totalRevenue = parseFloat(financeStats?.totalRevenue || 0);
    const totalDeductions = parseFloat(financeStats?.totalDeductions || 0);
    const totalProfit = totalRevenue - totalDeductions;

    // Monthly average
    const monthlyData = await Lead.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('SUM', sequelize.col('value')), 'revenue'],
        [sequelize.fn('SUM', sequelize.col('vendorPaidAmount')), 'deductions']
      ],
      where: financialWhere,
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Format monthly data for front-end charts
    const monthlyList = monthlyData.map(m => {
      const rev = parseFloat(m.revenue || 0);
      const ded = parseFloat(m.deductions || 0);
      return {
        month: m.month ? new Date(m.month).toLocaleString('default', { month: 'short', year: 'numeric' }) : 'Jan 2026',
        revenue: rev,
        deductions: ded,
        profit: rev - ded
      };
    });

    const activeMonths = Math.max(1, monthlyList.length);
    const perMonthProfit = totalProfit / activeMonths;

    // Fetch lists to show inside dashboard summaries
    const recentLeads = await Lead.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const recentProjects = await Project.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      stats: {
        totalLeads,
        totalProjects,
        pendingProjects,
        completedProjects,
        totalDesigns,
        pendingDesigns,
        completedDesigns,
        changeDesigns,
        totalRevenue,
        totalDeductions,
        totalProfit,
        perMonthProfit,
        monthlyData: monthlyList.length > 0 ? monthlyList : [{ month: 'Jul 2026', revenue: totalRevenue, deductions: totalDeductions, profit: totalProfit }]
      },
      recentLeads,
      recentProjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
