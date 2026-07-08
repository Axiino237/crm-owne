import { useState, useEffect, useCallback } from 'react';
import {
  RiBarChart2Line, RiCalendarEventLine, RiFilterLine, RiUserHeartLine,
  RiPhoneLine, RiCheckboxCircleLine, RiFolderUserLine, RiFileList2Line,
  RiGroupLine, RiHistoryLine, RiUserLine, RiArrowRightUpLine,
  RiPaletteLine, RiCheckDoubleLine, RiMoneyDollarCircleLine, RiWallet3Line
} from 'react-icons/ri';
import AppLayout from '../components/AppLayout';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Months config for filtering
const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const PerformancePage = () => {
  const { user } = useAuth();
  
  const [departments, setDepartments] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeptHead, setIsDeptHead] = useState(false);
  const [hasTeamAccess, setHasTeamAccess] = useState(false);
  const [headDeptName, setHeadDeptName] = useState('');
  const [isDesignDept, setIsDesignDept] = useState(false);

  // Filter states
  const [selectedDept, setSelectedDept] = useState('');
  const [year, setYear] = useState('2026');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  // User role helpers
  const userRole = user?.role?.level;
  const isManager = userRole === 'dept_manager';
  const isRegularUser = userRole === 'user';
  const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || user?.isSuperAdmin;

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDept) params.set('departmentId', selectedDept);
      if (year) params.set('year', year);
      if (month) params.set('month', month);
      if (day) params.set('day', day);

      const res = await api.get(`/performance?${params}`);
      if (res.data.success) {
        setMembers(res.data.members || []);
        setActivities(res.data.activities || []);
        setIsDeptHead(res.data.isDeptHead || false);
        setHasTeamAccess(res.data.hasTeamAccess || false);
        setHeadDeptName(res.data.headDeptName || '');
        setIsDesignDept(res.data.isDesignDept || false);
        if (res.data.departments) {
          setDepartments(res.data.departments);
        }
        if (res.data.selectedDepartmentId && !selectedDept) {
          setSelectedDept(res.data.selectedDepartmentId);
        }
      }
    } catch (err) {
      toast.error('Failed to load performance metrics');
    }
    setLoading(false);
  }, [selectedDept, year, month, day]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const formatCurrency = (v) => {
    const n = parseFloat(v) || 0;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  };

  // Aggregate totals
  const totalCalls = members.reduce((sum, m) => sum + (m.stats?.contactedCount || 0), 0);
  const totalConverted = members.reduce((sum, m) => sum + (m.stats?.convertedCount || 0), 0);
  const totalAssigned = members.reduce((sum, m) => sum + (m.stats?.totalAssigned || 0), 0);
  const totalClosedVal = members.reduce((sum, m) => sum + (m.stats?.totalClosedVal || 0), 0);
  const totalNetProfit = members.reduce((sum, m) => sum + (m.stats?.netProfit || 0), 0);
  const conversionRate = totalCalls > 0 ? ((totalConverted / totalCalls) * 100).toFixed(1) : '0';
  const designCompletionRate = totalAssigned > 0 ? ((totalConverted / totalAssigned) * 100).toFixed(1) : '0';

  // Get current active department label
  const activeDeptLabel = departments.find(d => d.id === selectedDept)?.name || 'Department';

  return (
    <AppLayout>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiBarChart2Line style={{ color: 'var(--accent)' }} /> Team Performance
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              {isAdmin 
                ? `Monitor call counts, conversions, and leads across all departments.` 
                : hasTeamAccess
                  ? `Reviewing metrics for members of ${headDeptName || activeDeptLabel || 'your department'}.`
                  : `Your personal performance metrics.`
              }
            </p>
            {/* Dept Head Badge */}
            {isDeptHead && (
              <span style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                👑 Department Head — {headDeptName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          
          {/* Department Filter (Admins only) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiGroupLine style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              disabled={!isAdmin}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: isAdmin ? 'pointer' : 'default',
                opacity: isAdmin ? 1 : 0.75
              }}
            >
              {!isAdmin && <option value={selectedDept}>{activeDeptLabel}</option>}
              {isAdmin && departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              {isAdmin && departments.length === 0 && <option value="">No departments</option>}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
            <RiCalendarEventLine style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Period:</span>
            
            {/* Year selector */}
            <select
              value={year}
              onChange={e => { setYear(e.target.value); setMonth(''); setDay(''); }}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="">Today Only</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2027">2027</option>
            </select>

            {/* Month selector */}
            {year && (
              <select
                value={month}
                onChange={e => { setMonth(e.target.value); setDay(''); }}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}

            {/* Day selector */}
            {year && month && (
              <select
                value={day}
                onChange={e => setDay(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Days</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          <button 
            className="btn btn-sm btn-outline" 
            onClick={() => { setYear('2026'); setMonth(''); setDay(''); }} 
            style={{ marginLeft: 'auto' }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-secondary)' }}>Loading performance data...</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            
            {/* Card 1: Calls Made OR Stalls Assigned */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                {isDesignDept ? <RiPaletteLine /> : <RiPhoneLine />}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {isDesignDept 
                    ? (hasTeamAccess || isAdmin ? 'Total Designs' : 'My Designs')
                    : (hasTeamAccess || isAdmin ? 'Team Calls' : 'My Calls')
                  }
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{totalCalls}</div>
              </div>
            </div>

            {/* Card 2: Converted Leads OR Completed Designs */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                {isDesignDept ? <RiCheckDoubleLine /> : <RiCheckboxCircleLine />}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {isDesignDept 
                    ? (hasTeamAccess || isAdmin ? 'Team Completed' : 'My Completed')
                    : (hasTeamAccess || isAdmin ? 'Team Converted' : 'My Converted')
                  }
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{totalConverted}</div>
              </div>
            </div>

            {/* Card 3: Conversion Rate OR Completion Rate */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139,92,246,0.1)', color: 'rgb(139,92,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                <RiUserHeartLine />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {isDesignDept ? 'Completion Rate' : 'Conversion Rate'}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {isDesignDept ? designCompletionRate : conversionRate}%
                </div>
              </div>
            </div>

            {/* Card 4: Assigned Leads OR Pending Designs */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'rgb(245,158,11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                <RiFolderUserLine />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {isDesignDept 
                    ? (hasTeamAccess || isAdmin ? 'Team Assigned' : 'My Assigned')
                    : (hasTeamAccess || isAdmin ? 'Team Leads' : 'My Leads')
                  }
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{totalAssigned}</div>
              </div>
            </div>

            {/* Card 5: Closed Value OR Design Budget */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(6,182,212,0.1)', color: 'rgb(6,182,212)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                <RiMoneyDollarCircleLine />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {isDesignDept ? 'Completed Budget' : 'Total Closed'}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {formatCurrency(totalClosedVal)}
                </div>
              </div>
            </div>

            {/* Card 6: Office Profit OR Generated Revenue */}
            <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(236,72,153,0.1)', color: 'rgb(236,72,153)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                <RiWallet3Line />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {isDesignDept ? 'Generated Rev.' : 'Net Profit'}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                  {formatCurrency(totalNetProfit)}
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: hasTeamAccess || isAdmin ? '2fr 1fr' : '1fr', gap: 24, alignItems: 'flex-start' }}>
            
            {/* Leaderboard Table — only for admins and team-access users */}
            {(hasTeamAccess || isAdmin) && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiUserLine style={{ color: 'var(--accent)' }} />
                  {isDeptHead ? `👑 ${headDeptName} — Team Leaderboard` : 'Team Leaderboard'}
                </h3>
                <span style={{ fontSize: '0.75rem', background: 'var(--accent-glow)', color: 'var(--accent)', padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>
                  {members.length} member{members.length !== 1 && 's'}
                </span>
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                  No members found in this department.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{isDesignDept ? 'Designer Name' : 'Caller Name'}</th>
                        <th>Role</th>
                        <th style={{ textAlign: 'center' }}>{isDesignDept ? 'Designs' : 'Leads'}</th>
                        {!isDesignDept && <th style={{ textAlign: 'center' }}>Calls Made</th>}
                        <th style={{ textAlign: 'center' }}>{isDesignDept ? 'Completed' : 'Converted'}</th>
                        <th style={{ textAlign: 'right' }}>{isDesignDept ? 'Budget (₹)' : 'Closed (₹)'}</th>
                        <th style={{ textAlign: 'right' }}>{isDesignDept ? 'Revenue (₹)' : 'Profit (₹)'}</th>
                        <th>Status Mix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => {
                        return (
                          <tr key={member.id} style={member.isHead ? { background: 'rgba(245,158,11,0.04)', borderLeft: '2px solid rgba(245,158,11,0.4)' } : {}}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: member.isHead ? 'rgba(245,158,11,0.15)' : 'var(--accent-glow)', color: member.isHead ? '#f59e0b' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                  {member.isHead ? '👑' : member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {member.name}
                                    {member.isHead && (
                                      <span style={{ fontSize: '0.68rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '1px 6px', borderRadius: 8, fontWeight: 700 }}>HEAD</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{member.role}</span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {member.stats?.totalAssigned}
                            </td>
                            {!isDesignDept && (
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                                {member.stats?.contactedCount}
                              </td>
                            )}
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                              {member.stats?.convertedCount}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {formatCurrency(member.stats?.totalClosedVal)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                              {formatCurrency(member.stats?.netProfit)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {isDesignDept ? (
                                  <>
                                    <span className="badge badge-info" title="Pending design orders">{member.stats?.newCount} P</span>
                                    <span className="badge badge-warning" title="In progress design orders">{member.stats?.inProgressCount} I</span>
                                    <span className="badge badge-success" title="Completed design orders">{member.stats?.convertedCount} C</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="badge badge-info" title="New leads">{member.stats?.newCount} N</span>
                                    <span className="badge badge-warning" title="Contacted">{member.stats?.inProgressCount} C</span>
                                    <span className="badge badge-success" title="Converted">{member.stats?.convertedCount} V</span>
                                    <span className="badge badge-danger" title="Lost">{member.stats?.lostCount} L</span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            )}

            {/* Personal stats card for regular users (non-head, non-admin) */}
            {!hasTeamAccess && !isAdmin && members.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiUserLine style={{ color: 'var(--accent)' }} /> My Performance
                </h3>
                {members.map(me => (
                  <div key={me.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                        {me.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{me.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{me.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {isDesignDept ? (
                        [
                          { label: 'Designs Assigned', val: me.stats?.totalAssigned, color: '#f59e0b' },
                          { label: 'Completed Designs', val: me.stats?.convertedCount, color: '#10b981' },
                          { label: 'Completed Budget', val: formatCurrency(me.stats?.totalClosedVal), color: '#06b6d4' },
                          { label: 'Generated Revenue', val: formatCurrency(me.stats?.netProfit), color: '#ec4899' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{val}</div>
                          </div>
                        ))
                      ) : (
                        [
                          { label: 'Leads Assigned', val: me.stats?.totalAssigned, color: '#f59e0b' },
                          { label: 'Calls Made', val: me.stats?.contactedCount, color: '#818cf8' },
                          { label: 'Converted Leads', val: me.stats?.convertedCount, color: '#10b981' },
                          { label: 'Closed Amount', val: formatCurrency(me.stats?.totalClosedVal), color: '#06b6d4' },
                          { label: 'Net Profit', val: formatCurrency(me.stats?.netProfit), color: '#ec4899' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{val}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity feed */}
            <div className="card" style={{ padding: 0, maxHeight: 520, overflowY: 'auto' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiHistoryLine style={{ color: 'var(--accent)' }} /> 
                  {isDesignDept ? 'Design Log Feed (What they completed)' : 'Call Feed (What they did)'}
                </h3>
              </div>

              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  No calls or activities logged for this period.
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {activities.map(act => (
                    <div key={act.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {act.assignee?.name || 'Unassigned'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {act.lastContactedDate}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Contacted <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{act.name || act.companyName || 'Lead'}</span>
                      </div>
                      {act.notes ? (
                        <div style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {act.notes}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No remarks added
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </AppLayout>
  );
};

export default PerformancePage;
