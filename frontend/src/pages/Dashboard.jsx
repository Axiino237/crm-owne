import { useEffect, useState, useCallback, useMemo } from 'react';
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
  RiPaletteLine,
  RiPhoneLine,
  RiUserHeartLine
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const StatCard = ({ icon, label, value, color = 'accent', onClick }) => (
  <div 
    className={`stat-card ${color}`}
    onClick={onClick}
    style={{ 
      cursor: onClick ? 'pointer' : 'default', 
      transition: 'transform 0.18s ease, box-shadow 0.18s ease' 
    }}
  >
    <div className="stat-icon" style={{ color: `var(--${color === 'accent' ? 'accent' : color})` }}>
      {icon}
    </div>
    <div className="stat-value">{value ?? <div className="spinner spinner-sm" />}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Business stats visibility check (only checks actual business widgets, not general page access)
  const canSeeBusinessTab =
    hasPermission('dashboard', 'leads-widget', 'canView') ||
    hasPermission('dashboard', 'calls-widget', 'canView') ||
    hasPermission('dashboard', 'interested-leads-widget', 'canView') ||
    hasPermission('dashboard', 'projects-widget', 'canView') ||
    hasPermission('dashboard', 'pending-projects-widget', 'canView') ||
    hasPermission('dashboard', 'completed-projects-widget', 'canView') ||
    hasPermission('dashboard', 'total-profit-card', 'canView') ||
    hasPermission('dashboard', 'monthly-profit-card', 'canView') ||
    hasPermission('dashboard', 'deductions-card', 'canView') ||
    hasPermission('dashboard', 'profit-trend-chart', 'canView') ||
    hasPermission('dashboard', 'recent-leads-list', 'canView') ||
    hasPermission('dashboard', 'recent-projects-list', 'canView') ||
    hasPermission('dashboard', 'pending-designs-widget', 'canView') ||
    hasPermission('dashboard', 'completed-designs-widget', 'canView') ||
    hasPermission('dashboard', 'change-designs-widget', 'canView') ||
    hasPermission('dashboard', 'total-designs-widget', 'canView');

  // System Overviews tab visibility check
  const canSeeSystemTab =
    hasPermission('dashboard', 'system-overview', 'canView');

  // Initialize active tab based on permissions
  const [activeTab, setActiveTab] = useState(() => {
    if (canSeeSystemTab && !canSeeBusinessTab) return 'system';
    if (canSeeBusinessTab) return 'business';
    if (canSeeSystemTab) return 'system';
    return 'none';
  });
  const [systemStats, setSystemStats] = useState({});
  const [businessStats, setBusinessStats] = useState(null);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Prepare smooth line chart points and curves
  const lineChartData = useMemo(() => {
    const rawData = businessStats?.stats?.monthlyData || [];
    
    // Rolling monthly timeline for 2026
    const monthKeys = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'];
    
    const pointsData = monthKeys.map(m => {
      const short = m.slice(0, 3).toLowerCase();
      const match = rawData.find(d => d.month && d.month.toLowerCase().includes(short));
      return {
        month: m,
        label: m.split(' ')[0],
        sales: match ? Math.max(0, parseFloat(match.revenue) || 0) : 0,
        hasData: !!match
      };
    });

    const maxVal = Math.max(...pointsData.map(p => p.sales), 10000);
    const paddingLeft = 70;
    const paddingRight = 45;
    const chartWidth = 800 - paddingLeft - paddingRight;
    const baselineY = 175;
    const topY = 40;
    const chartHeight = baselineY - topY;

    const coords = pointsData.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(1, pointsData.length - 1)) * chartWidth;
      const y = baselineY - (p.sales > 0 ? (p.sales / maxVal) * chartHeight : 0);
      return { ...p, x, y };
    });

    // Build smooth cubic bezier line path
    let linePath = '';
    if (coords.length > 0) {
      linePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
    }

    const last = coords[coords.length - 1] || { x: 755, y: baselineY };
    const first = coords[0] || { x: paddingLeft, y: baselineY };
    const areaPath = linePath ? `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z` : '';

    return { coords, linePath, areaPath, maxVal, baselineY, topY, paddingLeft, chartWidth };
  }, [businessStats?.stats?.monthlyData]);

  // Dynamic activeTab sync if permissions load late
  useEffect(() => {
    if (canSeeBusinessTab && canSeeSystemTab) {
      setActiveTab(prev => (prev === 'system' || prev === 'business') ? prev : 'business');
    } else if (canSeeSystemTab) {
      setActiveTab('system');
    } else if (canSeeBusinessTab) {
      setActiveTab('business');
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
    finally {
      setLoadingBusiness(false);
    }
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
              <div style={{ fontSize: '0.875rem', color: 'var(--accent-light)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{user?.isSuperAdmin ? 'Super Administrator — Full System Access' : `Role: ${user?.role?.name}`}</span>
                {businessStats?.isDeptHead && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
                    👑 Department Head View (Team Leads & Projects)
                  </span>
                )}
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
          {/* Business Metrics Grid - 6 Core Cards */}
          {(hasPermission('dashboard', 'leads-widget', 'canView') ||
            hasPermission('dashboard', 'calls-widget', 'canView') ||
            hasPermission('dashboard', 'interested-leads-widget', 'canView') ||
            hasPermission('dashboard', 'projects-widget', 'canView') ||
            hasPermission('dashboard', 'pending-projects-widget', 'canView') ||
            hasPermission('dashboard', 'completed-projects-widget', 'canView')) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {hasPermission('dashboard', 'leads-widget', 'canView') && (
                <StatCard 
                  icon={<RiTeamLine />} 
                  label="Total Leads" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalLeads} 
                  color="accent" 
                  onClick={() => navigate('/leads')}
                />
              )}
              {hasPermission('dashboard', 'calls-widget', 'canView') && (
                <StatCard 
                  icon={<RiPhoneLine />} 
                  label="Total Calls" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalCalls} 
                  color="info" 
                  onClick={() => navigate('/leads')}
                />
              )}
              {hasPermission('dashboard', 'interested-leads-widget', 'canView') && (
                <StatCard 
                  icon={<RiUserHeartLine />} 
                  label="Total Interested Leads" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalInterestedLeads} 
                  color="warning" 
                  onClick={() => navigate('/leads?status=qualified')}
                />
              )}
              {hasPermission('dashboard', 'projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiBriefcaseLine />} 
                  label="Total Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalProjects} 
                  color="accent" 
                  onClick={() => navigate('/leads?status=converted')}
                />
              )}
              {hasPermission('dashboard', 'pending-projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiTimeLine />} 
                  label="Pending Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.pendingProjects} 
                  color="warning" 
                  onClick={() => navigate('/leads?status=converted')}
                />
              )}
              {hasPermission('dashboard', 'completed-projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiCheckDoubleLine />} 
                  label="Completed Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.completedProjects} 
                  color="success" 
                  onClick={() => navigate('/leads?status=converted')}
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
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Sales (Deal Value)</span>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: 'var(--success)' }}>
                        {loadingBusiness ? <div className="spinner spinner-sm" /> : formatCurrency(businessStats?.stats?.totalSales ?? businessStats?.stats?.totalRevenue)}
                      </h2>
                    </div>
                    <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: 12, borderRadius: '50%', fontSize: '1.5rem', display: 'flex' }}>
                      <RiMoneyDollarBoxLine />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Closed Deals:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {businessStats?.stats?.totalProjects ?? 0} Projects
                    </span>
                  </div>
                </div>
              )}

              {hasPermission('dashboard', 'monthly-profit-card', 'canView') && (
                <div className="card" style={{ borderLeft: '4px solid var(--accent)', background: 'var(--bg-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Average Monthly Sales</span>
                      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8, color: 'var(--accent)' }}>
                        {loadingBusiness ? <div className="spinner spinner-sm" /> : formatCurrency(businessStats?.stats?.perMonthSales ?? businessStats?.stats?.totalRevenue)}
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

          {/* SVG Line Graph visualization */}
          {hasPermission('dashboard', 'profit-trend-chart', 'canView') && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="card-title">Monthly Total Sales Trend (2026)</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    📈 Sales Trend
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Peak: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(lineChartData.maxVal)}</strong>
                </div>
              </div>

              {loadingBusiness ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (
                <div style={{ marginTop: '16px', position: 'relative' }}>
                  <svg 
                    viewBox="0 0 800 230" 
                    style={{ width: '100%', height: 'auto', maxHeight: '260px', overflow: 'visible', display: 'block' }}
                  >
                    <defs>
                      {/* Gradient fill under line */}
                      <linearGradient id="profitLineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.38" />
                        <stop offset="70%" stopColor="#6366f1" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>

                      {/* Drop shadow / glow for line */}
                      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.5" />
                      </filter>
                    </defs>

                    {/* Horizontal Grid lines with currency labels */}
                    {[
                      { y: lineChartData.topY, val: lineChartData.maxVal },
                      { y: lineChartData.topY + (lineChartData.baselineY - lineChartData.topY) * 0.33, val: lineChartData.maxVal * 0.66 },
                      { y: lineChartData.topY + (lineChartData.baselineY - lineChartData.topY) * 0.66, val: lineChartData.maxVal * 0.33 },
                      { y: lineChartData.baselineY, val: 0 }
                    ].map((grid, idx) => (
                      <g key={idx}>
                        <line 
                          x1={lineChartData.paddingLeft} 
                          y1={grid.y} 
                          x2={lineChartData.paddingLeft + lineChartData.chartWidth} 
                          y2={grid.y} 
                          stroke="rgba(255, 255, 255, 0.08)" 
                          strokeDasharray={idx === 3 ? "none" : "5,5"} 
                          strokeWidth={idx === 3 ? "1.5" : "1"}
                        />
                        <text 
                          x={lineChartData.paddingLeft - 10} 
                          y={grid.y + 4} 
                          textAnchor="end" 
                          fill="var(--text-secondary)" 
                          fontSize="10" 
                          fontWeight="500"
                        >
                          {formatCurrency(grid.val)}
                        </text>
                      </g>
                    ))}

                    {/* Gradient Area under the Curve */}
                    {lineChartData.areaPath && (
                      <path 
                        d={lineChartData.areaPath} 
                        fill="url(#profitLineGrad)" 
                      />
                    )}

                    {/* The Smooth Trend Line */}
                    {lineChartData.linePath && (
                      <path 
                        d={lineChartData.linePath} 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        filter="url(#neonGlow)"
                      />
                    )}

                    {/* Hover Guide line */}
                    {hoveredPoint && (
                      <line 
                        x1={hoveredPoint.x} 
                        y1={lineChartData.topY - 10} 
                        x2={hoveredPoint.x} 
                        y2={lineChartData.baselineY} 
                        stroke="#818cf8" 
                        strokeWidth="1.5" 
                        strokeDasharray="3,3" 
                        opacity="0.8"
                      />
                    )}

                    {/* Data Points, Dots & Value Pills */}
                    {lineChartData.coords.map((pt, idx) => {
                      const isHovered = hoveredPoint?.month === pt.month;
                      const hasValue = pt.sales > 0;

                      return (
                        <g 
                          key={idx} 
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        >
                          {/* Invisible wide hover target */}
                          <rect 
                            x={pt.x - 25} 
                            y={lineChartData.topY} 
                            width="50" 
                            height={lineChartData.baselineY - lineChartData.topY + 30} 
                            fill="transparent" 
                          />

                          {/* Outer halo on active point */}
                          {(hasValue || isHovered) && (
                            <circle 
                              cx={pt.x} 
                              cy={pt.y} 
                              r={isHovered ? 12 : 8} 
                              fill="rgba(99, 102, 241, 0.3)" 
                              style={{ transition: 'all 0.2s ease' }}
                            />
                          )}

                          {/* Center Dot */}
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={isHovered ? 6 : (hasValue ? 5 : 3.5)} 
                            fill={hasValue || isHovered ? "#6366f1" : "rgba(255, 255, 255, 0.3)"} 
                            stroke={hasValue || isHovered ? "#ffffff" : "transparent"} 
                            strokeWidth={hasValue || isHovered ? "2.5" : "0"} 
                            style={{ transition: 'all 0.2s ease' }}
                          />

                          {/* Value Pill above the active point */}
                          {(hasValue || isHovered) && (
                            <g style={{ transition: 'transform 0.2s ease' }}>
                              <rect 
                                x={pt.x - 45} 
                                y={pt.y - 34} 
                                width="90" 
                                height="24" 
                                rx="6" 
                                fill="#111425" 
                                stroke={isHovered ? "#a5b4fc" : "#6366f1"} 
                                strokeWidth="1.2"
                              />
                              <text 
                                x={pt.x} 
                                y={pt.y - 18} 
                                textAnchor="middle" 
                                fill="#e0e7ff" 
                                fontSize="11" 
                                fontWeight="700"
                              >
                                {formatCurrency(pt.sales)}
                              </text>
                            </g>
                          )}

                          {/* Month Label below baseline */}
                          <text 
                            x={pt.x} 
                            y={lineChartData.baselineY + 22} 
                            textAnchor="middle" 
                            fill={hasValue || isHovered ? "var(--text-primary)" : "var(--text-secondary)"} 
                            fontSize={hasValue || isHovered ? "12" : "11"} 
                            fontWeight={hasValue || isHovered ? "700" : "500"}
                          >
                            {pt.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
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
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="card-title">Recent Leads</span>
                      {businessStats?.isDeptHead && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          Department Scope
                        </span>
                      )}
                    </div>
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
                            {(businessStats?.isDeptHead || user?.isSuperAdmin) && <th>Assigned Member</th>}
                            <th>Expo</th>
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
                              {(businessStats?.isDeptHead || user?.isSuperAdmin) && (
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      background: 'rgba(99, 102, 241, 0.2)',
                                      color: 'var(--accent)',
                                      fontSize: '0.72rem',
                                      fontWeight: 700
                                    }}>
                                      {lead.assignee?.name ? lead.assignee.name.charAt(0).toUpperCase() : '?'}
                                    </span>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {lead.assignee?.name || 'Unassigned'}
                                    </span>
                                  </div>
                                </td>
                              )}
                              <td><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{lead.expo}</span></td>
                              <td><span style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(lead.value)}</span></td>
                              <td>
                                <span className={`badge ${
                                  lead.status === 'converted' ? 'badge-success' :
                                  lead.status === 'lost' ? 'badge-danger' :
                                  lead.status === 'qualified' ? 'badge-accent' :
                                  lead.status === 'not_interested' ? 'badge-secondary' :
                                  lead.status === 'contacted' ? 'badge-warning' : 'badge-info'
                                }`}>
                                  {lead.status === 'contacted' ? 'Call Not Picked' :
                                   lead.status === 'qualified' ? 'Qualified (Interested)' :
                                   lead.status === 'not_interested' ? 'Not Interested' :
                                   lead.status ? (lead.status.charAt(0).toUpperCase() + lead.status.slice(1)) : 'New'}
                                </span>
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
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="card-title">Recent Projects</span>
                      {businessStats?.isDeptHead && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                          Department Scope
                        </span>
                      )}
                    </div>
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
                            {(businessStats?.isDeptHead || user?.isSuperAdmin) && <th>Assigned Member</th>}
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
                              {(businessStats?.isDeptHead || user?.isSuperAdmin) && (
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 24,
                                      height: 24,
                                      borderRadius: '50%',
                                      background: 'rgba(99, 102, 241, 0.2)',
                                      color: 'var(--accent)',
                                      fontSize: '0.72rem',
                                      fontWeight: 700
                                    }}>
                                      {project.assignee?.name ? project.assignee.name.charAt(0).toUpperCase() : '?'}
                                    </span>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {project.assignee?.name || 'Unassigned'}
                                    </span>
                                  </div>
                                </td>
                              )}
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
            {user?.isSuperAdmin && hasPermission('organizations', 'organizations-list', 'canView') && (
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
                {user?.isSuperAdmin && hasPermission('organizations', 'organization-create', 'canCreate') && (
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
