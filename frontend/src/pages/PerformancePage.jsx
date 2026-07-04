import { useState, useEffect, useCallback } from 'react';
import {
  RiBarChart2Line, RiCalendarEventLine, RiFilterLine, RiUserHeartLine,
  RiPhoneLine, RiCheckboxCircleLine, RiFolderUserLine, RiFileList2Line,
  RiGroupLine, RiHistoryLine, RiUserLine, RiArrowRightUpLine
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

  // Aggregate totals
  const totalCalls = members.reduce((sum, m) => sum + (m.stats?.contactedCount || 0), 0);
  const totalConverted = members.reduce((sum, m) => sum + (m.stats?.convertedCount || 0), 0);
  const totalAssigned = members.reduce((sum, m) => sum + (m.stats?.totalAssigned || 0), 0);
  const conversionRate = totalCalls > 0 ? ((totalConverted / totalCalls) * 100).toFixed(1) : '0';

  // Get current active department label
  const activeDeptLabel = departments.find(d => d.id === selectedDept)?.name || 'Department';

  return (
    <AppLayout>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiBarChart2Line style={{ color: 'var(--accent)' }} /> Team Performance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            {isAdmin 
              ? `Monitor call counts, conversions, and leads across all departments.` 
              : `Review metrics and daily activity for members of ${activeDeptLabel || 'your department'}.`
            }
          </p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            
            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                <RiPhoneLine />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Calls Made</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{totalCalls}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                <RiCheckboxCircleLine />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Converted Leads</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{totalConverted}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139,92,246,0.1)', color: 'rgb(139,92,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                <RiUserHeartLine />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Conversion Rate</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{conversionRate}%</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.1)', color: 'rgb(245,158,11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                <RiFolderUserLine style={{ verticalAlign: 'middle' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Leads</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{totalAssigned}</div>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
            
            {/* Leaderboard/Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiUserLine style={{ color: 'var(--accent)' }} /> Team Leaderboard
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
                        <th>Caller Name</th>
                        <th>Role</th>
                        <th style={{ textAlign: 'center' }}>Leads</th>
                        <th style={{ textAlign: 'center' }}>Calls Made</th>
                        <th style={{ textAlign: 'center' }}>Converted</th>
                        <th>Status Mix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(member => {
                        const callRate = member.stats?.totalAssigned > 0 
                          ? ((member.stats?.convertedCount / member.stats?.totalAssigned) * 100).toFixed(0) 
                          : '0';
                        return (
                          <tr key={member.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{member.name}</div>
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
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                              {member.stats?.contactedCount}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>
                              {member.stats?.convertedCount}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span className="badge badge-info" title="New leads">{member.stats?.newCount} N</span>
                                <span className="badge badge-warning" title="Contacted / In-progress">{member.stats?.inProgressCount} C</span>
                                <span className="badge badge-success" title="Converted">{member.stats?.convertedCount} V</span>
                                <span className="badge badge-danger" title="Lost">{member.stats?.lostCount} L</span>
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

            {/* Activity feed */}
            <div className="card" style={{ padding: 0, maxHeight: 520, overflowY: 'auto' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiHistoryLine style={{ color: 'var(--accent)' }} /> Call Feed (What they did)
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
