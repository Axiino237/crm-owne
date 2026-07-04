import { useEffect, useState, useCallback } from 'react';
import { 
  RiTeamLine, 
  RiShieldUserLine, 
  RiBuildingLine, 
  RiBuilding2Line, 
  RiGroupLine, 
  RiUserAddLine,
  RiBriefcaseLine,
  RiMoneyDollarBoxLine,
  RiPercentLine,
  RiCoinsLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiLineChartLine,
  RiPaletteLine
} from 'react-icons/ri';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const StatCard = ({ icon, label, value, color = 'accent' }) => (
  <div className={`stat-card ${color}`}>
    <div className="stat-icon" style={{ color: `var(--${color === 'accent' ? 'accent' : color})` }}>
      {icon}
    </div>
    <div className="stat-value">{value ?? <div className="spinner spinner-sm" />}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const Dashboard = () => {
  const { user, hasPermission } = useAuth();

  // Business stats visibility check
  const canSeeBusinessTab =
    hasPermission('dashboard', 'dashboard-home', 'canView') ||
    hasPermission('dashboard', 'leads-widget', 'canView') ||
    hasPermission('dashboard', 'projects-widget', 'canView') ||
    hasPermission('dashboard', 'pending-projects-widget', 'canView') ||
    hasPermission('dashboard', 'completed-projects-widget', 'canView') ||
    hasPermission('dashboard', 'total-profit-card', 'canView') ||
    hasPermission('dashboard', 'monthly-profit-card', 'canView') ||
    hasPermission('dashboard', 'deductions-card', 'canView') ||
    hasPermission('dashboard', 'profit-trend-chart', 'canView') ||
    hasPermission('dashboard', 'recent-leads-list', 'canView') ||
    hasPermission('dashboard', 'recent-projects-list', 'canView');

  // System Overviews tab visibility check
  const canSeeSystemTab =
    hasPermission('dashboard', 'system-overview', 'canView');

  // Initialize active tab based on permissions
  const [activeTab, setActiveTab] = useState(() => {
    if (canSeeBusinessTab) return 'business';
    if (canSeeSystemTab) return 'system';
    return 'none';
  });
  const [systemStats, setSystemStats] = useState({});
  const [businessStats, setBusinessStats] = useState(null);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  // Dynamic activeTab sync if permissions load late
  useEffect(() => {
    if (canSeeBusinessTab) {
      setActiveTab('business');
    } else if (canSeeSystemTab) {
      setActiveTab('system');
    } else {
      setActiveTab('none');
    }
  }, [canSeeBusinessTab, canSeeSystemTab]);

  const fetchSystemStats = useCallback(async () => {
    setLoadingSystem(true);
    try {
      const results = await Promise.allSettled([
        api.get('/uam/users?limit=1'),
        api.get('/roles/all'),
        api.get('/organizations/all'),
        api.get('/companies/all'),
        api.get('/departments/all'),
      ]);

      setSystemStats({
        users: results[0].status === 'fulfilled' ? results[0].value.data.total : '—',
        roles: results[1].status === 'fulfilled' ? results[1].value.data.roles?.length : '—',
        organizations: results[2].status === 'fulfilled' ? results[2].value.data.organizations?.length : '—',
        companies: results[3].status === 'fulfilled' ? results[3].value.data.companies?.length : '—',
        departments: results[4].status === 'fulfilled' ? results[4].value.data.departments?.length : '—',
      });
    } catch { /* ignore */ }
    setLoadingSystem(false);
  }, []);

  const fetchBusinessStats = useCallback(async () => {
    setLoadingBusiness(true);
    try {
      const res = await api.get('/dashboard/stats');
      setBusinessStats(res.data);
    } catch { /* ignore */ }
    setLoadingBusiness(false);
  }, []);

  useEffect(() => {
    fetchSystemStats();
    fetchBusinessStats();
  }, [fetchSystemStats, fetchBusinessStats]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <AppLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,0.25), rgba(129,140,248,0.1))',
        border: '1px solid rgba(129,140,248,0.3)',
        marginBottom: '24px'
      }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="avatar avatar-lg" style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)', fontSize: '1.25rem' }}>
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {greeting()},
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.name} {user?.isSuperAdmin && '⭐'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--accent-light)', marginTop: '4px' }}>
                {user?.isSuperAdmin ? 'Super Administrator — Full System Access' : `Role: ${user?.role?.name}`}
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          {(canSeeBusinessTab && canSeeSystemTab) && (
            <div style={{
              display: 'flex',
              background: 'rgba(5, 8, 16, 0.6)',
              padding: 4,
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}>
              <button 
                onClick={() => setActiveTab('business')}
                style={{
                  background: activeTab === 'business' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'business' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                💼 Business Stats
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                style={{
                  background: activeTab === 'system' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'system' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                🛡️ System Overviews
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BUSINESS TAB */}
      {activeTab === 'business' && canSeeBusinessTab && (
        <div>
          {/* Business Metrics Grid */}
          {(hasPermission('dashboard', 'leads-widget', 'canView') ||
            hasPermission('dashboard', 'projects-widget', 'canView') ||
            hasPermission('dashboard', 'pending-projects-widget', 'canView') ||
            hasPermission('dashboard', 'completed-projects-widget', 'canView')) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {hasPermission('dashboard', 'leads-widget', 'canView') && (
                <StatCard 
                  icon={<RiTeamLine />} 
                  label="Total Leads" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalLeads} 
                  color="accent" 
                />
              )}
              {hasPermission('dashboard', 'projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiBriefcaseLine />} 
                  label="Total Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalProjects} 
                  color="info" 
                />
              )}
              {hasPermission('dashboard', 'pending-projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiTimeLine />} 
                  label="Pending Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.pendingProjects} 
                  color="warning" 
                />
              )}
              {hasPermission('dashboard', 'completed-projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiCheckDoubleLine />} 
                  label="Completed Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.completedProjects} 
                  color="success" 
                />
              )}
            </div>
          )}

          {/* Design Operations Grid */}
          {(hasPermission('dashboard', 'total-designs-widget', 'canView') ||
            hasPermission('dashboard', 'pending-designs-widget', 'canView') ||
            hasPermission('dashboard', 'completed-designs-widget', 'canView') ||
            hasPermission('dashboard', 'change-designs-widget', 'canView')) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                🎨 Design Operations
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                {hasPermission('dashboard', 'total-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiPaletteLine />} 
                    label="Total Design" 
                    value={loadingBusiness ? null : businessStats?.stats?.totalDesigns} 
                    color="primary" 
                  />
                )}
                {hasPermission('dashboard', 'pending-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiTimeLine />} 
                    label="Pending Design" 
                    value={loadingBusiness ? null : businessStats?.stats?.pendingDesigns} 
                    color="warning" 
                  />
                )}
                {hasPermission('dashboard', 'completed-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiCheckDoubleLine />} 
                    label="Total Completed Design" 
                    value={loadingBusiness ? null : businessStats?.stats?.completedDesigns} 
                    color="success" 
                  />
                )}
                {hasPermission('dashboard', 'change-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiLineChartLine />} 
                    label="Total Changes" 
                    value={loadingBusiness ? null : businessStats?.stats?.changeDesigns} 
                    color="info" 
                  />
                )}
              </div>
            </div>
          )}

          {/* Financial Cards Grid */}
          {(hasPermission('dashboard', 'total-profit-card', 'canView') ||
            hasPermission('dashboard', 'monthly-profit-card', 'canView') ||
            hasPermission('dashboard', 'deductions-card', 'canView')) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {hasPermission('dashboard', 'total-profit-card', 'canView') && (
                <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'var(--bg-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total profit (Revenue - Deductions)</span>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: 'var(--success)' }}>
                        {loadingBusiness ? <div className="spinner spinner-sm" /> : formatCurrency(businessStats?.stats?.totalProfit)}
                      </h2>
                    </div>
                    <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 12, borderRadius: '50%', fontSize: '1.5rem', display: 'flex' }}>
                      <RiMoneyDollarBoxLine />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Revenue:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {loadingBusiness ? '...' : formatCurrency(businessStats?.stats?.totalRevenue)}
                    </span>
                  </div>
                </div>
              )}

              {hasPermission('dashboard', 'monthly-profit-card', 'canView') && (
                <div className="card" style={{ borderLeft: '4px solid var(--accent)', background: 'var(--bg-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Average Monthly Profit</span>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: 'var(--accent)' }}>
                        {loadingBusiness ? <div className="spinner spinner-sm" /> : formatCurrency(businessStats?.stats?.perMonthProfit)}
                      </h2>
                    </div>
                    <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: 12, borderRadius: '50%', fontSize: '1.5rem', display: 'flex' }}>
                      <RiLineChartLine />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Monthly Growth Rate:</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>+14.8%</span>
                  </div>
                </div>
              )}

              {hasPermission('dashboard', 'deductions-card', 'canView') && (
                <div className="card" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--bg-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Deductions & Expenses</span>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: 'var(--danger)' }}>
                        {loadingBusiness ? <div className="spinner spinner-sm" /> : formatCurrency(businessStats?.stats?.totalDeductions)}
                      </h2>
                    </div>
                    <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 12, borderRadius: '50%', fontSize: '1.5rem', display: 'flex' }}>
                      <RiCoinsLine />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Expense ratio:</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                      {loadingBusiness ? '...' : `${Math.round(((businessStats?.stats?.totalDeductions || 0) / (businessStats?.stats?.totalRevenue || 1)) * 100)}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SVG Graph visualization */}
          {hasPermission('dashboard', 'profit-trend-chart', 'canView') && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <span className="card-title">Monthly Net Profit Trend (2026)</span>
              </div>
              {loadingBusiness ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  {/* SVG Visualizer */}
                  <div style={{ position: 'relative', height: 200, width: '100%' }}>
                    <svg style={{ height: '100%', width: '100%', overflow: 'visible' }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="100%" y2="50" stroke="var(--border)" strokeDasharray="5,5" />
                      <line x1="0" y1="100" x2="100%" y2="100" stroke="var(--border)" strokeDasharray="5,5" />
                      <line x1="0" y1="150" x2="100%" y2="150" stroke="var(--border)" strokeDasharray="5,5" />

                      {/* Bars or Lines representing data */}
                      {businessStats?.stats?.monthlyData?.map((item, idx, arr) => {
                        const totalWidth = 100; // in percentage
                        const step = totalWidth / Math.max(1, arr.length);
                        const x = idx * step + step / 2;
                        const maxProfit = Math.max(...arr.map(d => d.profit), 10000);
                        const heightPercent = (item.profit / maxProfit) * 150;
                        const y = 180 - heightPercent;

                        return (
                          <g key={idx}>
                            {/* Colored bar */}
                            <rect 
                              x={`${idx * step + step / 4}%`} 
                              y={y} 
                              width={`${step / 2}%`} 
                              height={heightPercent} 
                              fill="url(#profitGrad)"
                              stroke="var(--accent)"
                              strokeWidth="2"
                              rx="4"
                            />
                            {/* Label value */}
                            <text 
                              x={`${x}%`} 
                              y={y - 8} 
                              textAnchor="middle" 
                              fill="var(--text-primary)" 
                              fontSize="11" 
                              fontWeight="600"
                            >
                              {formatCurrency(item.profit)}
                            </text>
                            {/* Month description */}
                            <text 
                              x={`${x}%`} 
                              y={200} 
                              textAnchor="middle" 
                              fill="var(--text-secondary)" 
                              fontSize="11"
                            >
                              {item.month}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Leads & Projects tables */}
          {(hasPermission('dashboard', 'recent-leads-list', 'canView') ||
            hasPermission('dashboard', 'recent-projects-list', 'canView')) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {hasPermission('dashboard', 'recent-leads-list', 'canView') && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Recent Leads</span>
                    <span className="badge badge-accent">Business Opportunities</span>
                  </div>
                  {loadingBusiness ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Lead Info</th>
                            <th>Source</th>
                            <th>Est. Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businessStats?.recentLeads?.map(lead => (
                            <tr key={lead.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{lead.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lead.companyName || 'Individual'}</div>
                              </td>
                              <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{lead.source}</span></td>
                              <td><span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(lead.value)}</span></td>
                              <td>
                                <span className={`badge ${
                                  lead.status === 'converted' ? 'badge-success' :
                                  lead.status === 'lost' ? 'badge-danger' :
                                  lead.status === 'qualified' ? 'badge-info' : 'badge-warning'
                                }`}>{lead.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {hasPermission('dashboard', 'recent-projects-list', 'canView') && (
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Recent Projects</span>
                    <span className="badge badge-info">Active Engagements</span>
                  </div>
                  {loadingBusiness ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Project Name</th>
                            <th>Budget</th>
                            <th>Deductions</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {businessStats?.recentProjects?.map(project => (
                            <tr key={project.id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{project.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start: {project.startDate}</div>
                              </td>
                              <td><span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(project.revenue)}</span></td>
                              <td><span style={{ color: 'var(--danger)' }}>{formatCurrency(project.deductions)}</span></td>
                              <td>
                                <span className={`badge ${
                                  project.status === 'completed' ? 'badge-success' :
                                  project.status === 'cancelled' ? 'badge-danger' :
                                  project.status === 'in_progress' ? 'badge-info' : 'badge-warning'
                                }`}>{project.status?.replace('_', ' ')}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SYSTEM OVERVIEW TAB */}
      {activeTab === 'system' && canSeeSystemTab && (
        <div>
          {/* Stats Grid */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            {hasPermission('uam', 'users-list', 'canView') && (
              <StatCard icon={<RiTeamLine />} label="Total Users" value={loadingSystem ? null : systemStats.users} color="accent" />
            )}
            {hasPermission('roles', 'roles-list', 'canView') && (
              <StatCard icon={<RiShieldUserLine />} label="Roles" value={loadingSystem ? null : systemStats.roles} color="info" />
            )}
            {user?.isSuperAdmin && (
              <StatCard icon={<RiBuildingLine />} label="Organizations" value={loadingSystem ? null : systemStats.organizations} color="warning" />
            )}
            {hasPermission('companies', 'companies-list', 'canView') && (
              <StatCard icon={<RiBuilding2Line />} label="Companies" value={loadingSystem ? null : systemStats.companies} color="success" />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Quick Access Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Quick Actions</span>
              </div>
              <div className="grid-2" style={{ gap: 16 }}>
                {hasPermission('uam', 'users-list', 'canCreate') && (
                  <a href="/uam/users" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiUserAddLine /> Add User
                  </a>
                )}
                {hasPermission('roles', 'roles-list', 'canCreate') && (
                  <a href="/uam/roles" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiShieldUserLine /> Create Role
                  </a>
                )}
                {user?.isSuperAdmin && (
                  <a href="/organizations" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiBuildingLine /> Add Organization
                  </a>
                )}
                {hasPermission('companies', 'companies-list', 'canCreate') && (
                  <a href="/companies" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiBuilding2Line /> Add Company
                  </a>
                )}
                {hasPermission('departments', 'departments-list', 'canCreate') && (
                  <a href="/departments" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiGroupLine /> Add Department
                  </a>
                )}
              </div>
            </div>

            {/* Department Summary */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="card-title" style={{ display: 'block', marginBottom: 12 }}>Department Breakdown</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>
                  {loadingSystem ? <div className="spinner spinner-sm" /> : systemStats.departments}
                </span>
                <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  Active functional departments configured in database.
                </span>
              </div>
              <a href="/departments" className="btn btn-primary" style={{ marginTop: 24, justifyContent: 'center' }}>
                View Departments
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'none' && (
        <div className="empty-state">
          <RiShieldUserLine size={48} />
          <h3>No Access</h3>
          <p>You don't have permission to view any dashboard statistics.</p>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
