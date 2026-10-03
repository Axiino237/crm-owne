import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RiGroupLine, RiTeamLine, RiUserLine, RiBuildingLine,
  RiBuilding2Line, RiSearchLine, RiFilterLine, RiCheckboxCircleLine,
  RiCloseCircleLine, RiTimeLine, RiBriefcaseLine, RiCalendarLine,
  RiArrowRightLine, RiExchangeLine, RiShieldUserLine, RiDraftLine,
  RiCheckDoubleLine, RiAlertLine, RiRefreshLine, RiEyeLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

/* ── Workload Inspection & Reassign Modal ── */
const InspectWorkModal = ({ member, departmentId, allMembers, onClose, onReassigned }) => {
  const [activeTab, setActiveTab] = useState('leads');
  const [reassignLead, setReassignLead] = useState(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const leads = member?.leads || [];
  const designs = member?.designs || [];

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignLead || !targetUserId) return;
    setReassigning(true);
    try {
      const res = await api.post('/departments/reassign-lead', {
        leadId: reassignLead.id,
        newAssignedToUserId: targetUserId
      });
      toast.success(res.data?.message || 'Lead reassigned successfully!');
      setReassignLead(null);
      setTargetUserId('');
      if (onReassigned) onReassigned();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reassignment failed');
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1250 }}>
      <div className="modal" style={{ maxWidth: 760, width: '94%' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 800, color: 'white'
            }}>
              {member.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {member.name}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center', marginTop: 2 }}>
                <span>{member.email}</span>
                {member.layer ? (
                  <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                    {member.layer.name} (Level {member.layer.level})
                  </span>
                ) : (
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Team Member</span>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Modal Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setActiveTab('leads')}
            style={{
              background: activeTab === 'leads' ? 'rgba(129,140,248,0.15)' : 'transparent',
              color: activeTab === 'leads' ? 'var(--accent)' : 'var(--text-secondary)',
              border: activeTab === 'leads' ? '1px solid var(--accent)' : '1px solid transparent',
              padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            🎯 Active Leads ({leads.length})
          </button>
          <button
            onClick={() => setActiveTab('designs')}
            style={{
              background: activeTab === 'designs' ? 'rgba(129,140,248,0.15)' : 'transparent',
              color: activeTab === 'designs' ? 'var(--accent)' : 'var(--text-secondary)',
              border: activeTab === 'designs' ? '1px solid var(--accent)' : '1px solid transparent',
              padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            🎨 Design Orders ({designs.length})
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body" style={{ padding: '16px 24px', maxHeight: 380, overflowY: 'auto' }}>
          {activeTab === 'leads' && (
            leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <RiBriefcaseLine style={{ fontSize: '2rem', display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
                No active leads currently assigned to this member.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leads.map(lead => (
                  <div key={lead.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                        {lead.name} {lead.companyName && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {lead.companyName}</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3, display: 'flex', gap: 12 }}>
                        <span>Status: <strong style={{ textTransform: 'capitalize', color: 'var(--accent)' }}>{lead.status}</strong></span>
                        {lead.value > 0 && <span>Value: <strong>₹{Number(lead.value).toLocaleString('en-IN')}</strong></span>}
                        {lead.nextFollowUp && <span>Follow-up: <strong>{new Date(lead.nextFollowUp).toLocaleDateString()}</strong></span>}
                      </div>
                    </div>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setReassignLead(lead)}
                      style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                      title="Reassign to another member"
                    >
                      <RiExchangeLine /> Reassign
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'designs' && (
            designs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <RiDraftLine style={{ fontSize: '2rem', display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
                No design orders submitted by or assigned to this member.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {designs.map(d => (
                  <div key={d.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                        {d.companyName} {d.exhibitionName && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({d.exhibitionName})</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3, display: 'flex', gap: 12 }}>
                        <span>Stall: <strong>{d.stallSize || 'N/A'}</strong></span>
                        <span>Status: <strong style={{ textTransform: 'capitalize', color: 'var(--info)' }}>{d.status}</strong></span>
                        {d.approxBudget > 0 && <span>Budget: <strong>₹{Number(d.approxBudget).toLocaleString('en-IN')}</strong></span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Reassignment Drawer/Sub-dialog */}
        {reassignLead && (
          <div style={{
            margin: '0 24px 16px 24px',
            padding: '14px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10
          }}>
            <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.875rem', marginBottom: 8 }}>
              🔄 Reassign Lead: "{reassignLead.name}" to another team member:
            </div>
            <form onSubmit={handleReassignSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                className="form-control"
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                required
                style={{ flex: 1, minWidth: 200, fontSize: '0.85rem' }}
              >
                <option value="">— Select Target Team Member —</option>
                {allMembers.filter(m => m.id !== member.id).map(m => (
                  <option key={m.id} value={m.id}>
                    👤 {m.name} {m.layer ? `(${m.layer.name})` : ''} · {m.email}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={reassigning || !targetUserId}
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setReassignLead(null)}
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Team Monitor Dashboard Page ── */
const TeamMonitorPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDeptId = searchParams.get('departmentId') || '';

  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(initialDeptId);
  const [monitorData, setMonitorData] = useState(null);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingMonitor, setLoadingMonitor] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [filterLayer, setFilterLayer] = useState('all');
  const [filterAtt, setFilterAtt] = useState('all');
  const [searchMember, setSearchMember] = useState('');
  const [inspectMember, setInspectMember] = useState(null);

  // 1. Fetch available departments
  useEffect(() => {
    let isMounted = true;
    setLoadingDepts(true);
    api.get('/departments/all')
      .then(res => {
        if (isMounted) {
          const list = res.data.departments || [];
          setDepartments(list);
          if (!selectedDeptId && list.length > 0) {
            setSelectedDeptId(list[0].id);
            setSearchParams({ departmentId: list[0].id });
          }
        }
      })
      .catch(() => {
        if (isMounted) toast.error('Failed to load departments');
      })
      .finally(() => {
        if (isMounted) setLoadingDepts(false);
      });

    return () => { isMounted = false; };
  }, []);

  // 2. Fetch live team monitor data when selectedDeptId changes
  const fetchMonitor = useCallback(async () => {
    if (!selectedDeptId) return;
    setLoadingMonitor(true);
    setError(null);
    try {
      const res = await api.get(`/departments/${selectedDeptId}/team-monitor`);
      setMonitorData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load department monitor');
    } finally {
      setLoadingMonitor(false);
    }
  }, [selectedDeptId]);

  useEffect(() => {
    fetchMonitor();
  }, [fetchMonitor]);

  const handleDeptChange = (id) => {
    setSelectedDeptId(id);
    setSearchParams({ departmentId: id });
  };

  const department = monitorData?.department;
  const layers = department?.hierarchyLayers || [];
  const members = monitorData?.members || [];
  const summary = monitorData?.summary || {};
  const viewer = monitorData?.viewer || {};

  // Filtered members list
  const filteredMembers = members.filter(m => {
    // Layer filter
    if (filterLayer === 'members-only' && m.layer) return false;
    if (filterLayer !== 'all' && filterLayer !== 'members-only') {
      if (m.layer?.id !== filterLayer) return false;
    }
    // Attendance filter
    if (filterAtt === 'present' && m.attendanceStatus !== 'present' && m.attendanceStatus !== 'clocked_out') return false;
    if (filterAtt === 'leave' && m.attendanceStatus !== 'on_leave') return false;
    if (filterAtt === 'not_clocked' && m.attendanceStatus !== 'not_clocked') return false;
    // Search
    if (searchMember) {
      const q = searchMember.toLowerCase();
      return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AppLayout title="Team Work Monitor">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiGroupLine style={{ color: 'var(--accent)' }} /> Team Work Monitor
          </h1>
          <p className="page-subtitle">
            Supervise department hierarchy layers, live attendance, and daily workload operations
          </p>
        </div>

        <button
          className="btn btn-outline"
          onClick={fetchMonitor}
          disabled={loadingMonitor}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RiRefreshLine style={{ animation: loadingMonitor ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Top Department Switcher & Hierarchy Path */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {/* Department Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Select Department:</span>
            <select
              className="form-control"
              value={selectedDeptId}
              onChange={e => handleDeptChange(e.target.value)}
              disabled={loadingDepts}
              style={{ minWidth: 240, fontWeight: 600, fontSize: '0.9rem' }}
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  🏢 {d.name} {d.code && `(${d.code})`}
                </option>
              ))}
            </select>
          </div>

          {/* Viewer Layer Status Badge */}
          {viewer && (
            <div style={{
              background: 'rgba(129, 140, 248, 0.1)',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.8rem',
              color: 'var(--accent)'
            }}>
              👑 Supervisory Status: <strong>{viewer.isSuperAdmin ? 'Super Admin' : viewer.layerName ? `${viewer.layerName} (Level ${viewer.layerLevel})` : viewer.isHOD ? 'Department Head' : 'Department Manager'}</strong>
            </div>
          )}
        </div>

        {/* Dynamic Hierarchy Layers Breadcrumb Visualizer */}
        {layers.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Active Dynamic Hierarchy Layers:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {layers.map((layer, idx) => (
                <div key={layer.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    background: idx === 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(129, 140, 248, 0.12)',
                    border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(129, 140, 248, 0.25)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    color: idx === 0 ? '#f59e0b' : 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>{idx === 0 ? '👑' : `Level ${layer.level || idx + 1}:`}</span>
                    <strong>{layer.name}</strong>
                    <span style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '1px 6px',
                      fontSize: '0.7rem'
                    }}>
                      {(layer.users || []).length} assigned
                    </span>
                  </div>
                  {idx < layers.length && <RiArrowRightLine style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }} />}
                </div>
              ))}
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.8rem',
                color: 'var(--success)'
              }}>
                👥 Regular Department Members
              </div>
            </div>
          </div>
        )}
      </div>

      {loadingMonitor ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading live department team data...</div>
        </div>
      ) : error ? (
        <div style={{
          padding: 24,
          borderRadius: 10,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: 'var(--danger)',
          textAlign: 'center'
        }}>
          <RiAlertLine style={{ fontSize: '2rem', display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Access Restricted</div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Total Members */}
            <div className="stat-card accent">
              <div className="stat-icon" style={{ color: 'var(--accent)' }}><RiTeamLine /></div>
              <div className="stat-value">{summary.totalMembers || 0}</div>
              <div className="stat-label">Supervised Members</div>
            </div>

            {/* Attendance Today */}
            <div className="stat-card success">
              <div className="stat-icon" style={{ color: 'var(--success)' }}><RiCheckboxCircleLine /></div>
              <div className="stat-value">{summary.presentCount || 0}</div>
              <div className="stat-label">Present Today ({summary.leaveCount || 0} on leave)</div>
            </div>

            {/* Active Leads */}
            <div className="stat-card warning">
              <div className="stat-icon" style={{ color: 'var(--warning, #f59e0b)' }}><RiBriefcaseLine /></div>
              <div className="stat-value">{summary.totalLeadsAssigned || 0}</div>
              <div className="stat-label">
                Active Leads (₹{Number(summary.totalPipelineValue || 0).toLocaleString('en-IN')})
              </div>
            </div>

            {/* Ongoing Designs */}
            <div className="stat-card info">
              <div className="stat-icon" style={{ color: 'var(--info)' }}><RiDraftLine /></div>
              <div className="stat-value">{summary.totalOngoingDesigns || 0}</div>
              <div className="stat-label">Ongoing Design Orders</div>
            </div>
          </div>

          {/* Members Table Card */}
          <div className="card">
            {/* Card Filters Bar */}
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingBottom: 14 }}>
              {/* Search Member */}
              <div className="input-wrapper" style={{ width: 240 }}>
                <RiSearchLine className="input-icon" />
                <input
                  className="form-control"
                  placeholder="Search team member..."
                  value={searchMember}
                  onChange={e => setSearchMember(e.target.value)}
                  style={{ padding: '6px 12px 6px 36px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Filter by Layer & Attendance */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="form-control"
                  value={filterLayer}
                  onChange={e => setFilterLayer(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  <option value="all">All Layers</option>
                  {layers.map(l => (
                    <option key={l.id} value={l.id}>
                      Level {l.level}: {l.name}
                    </option>
                  ))}
                  <option value="members-only">Regular Members Only</option>
                </select>

                <select
                  className="form-control"
                  value={filterAtt}
                  onChange={e => setFilterAtt(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  <option value="all">All Attendance</option>
                  <option value="present">🟢 Present Only</option>
                  <option value="leave">🔴 On Leave Only</option>
                  <option value="not_clocked">⚪ Not Clocked</option>
                </select>
              </div>
            </div>

            {/* Members Table */}
            {filteredMembers.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👥</div>
                <h3>No members found</h3>
                <p>No team members matching your selected filter criteria.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Team Member</th>
                      <th>Hierarchy Layer</th>
                      <th>Today's Attendance</th>
                      <th>Active Workload</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(m => {
                      const isPresent = m.attendanceStatus === 'present' || m.attendanceStatus === 'clocked_out';
                      const isLeave = m.attendanceStatus === 'on_leave';

                      return (
                        <tr key={m.id}>
                          {/* Member info */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem', color: 'white'
                              }}>
                                {m.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{m.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Hierarchy Layer */}
                          <td>
                            {m.layer ? (
                              <span style={{
                                background: m.layer.level === 1 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(129, 140, 248, 0.12)',
                                color: m.layer.level === 1 ? '#f59e0b' : 'var(--accent)',
                                border: m.layer.level === 1 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(129, 140, 248, 0.25)',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {m.layer.level === 1 ? '👑 ' : `Level ${m.layer.level} · `}
                                {m.layer.name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Executive</span>
                            )}
                          </td>

                          {/* Live Attendance */}
                          <td>
                            {isPresent ? (
                              <div>
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <RiCheckboxCircleLine /> Present
                                </span>
                                {m.todayAttendance?.clockIn && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    In: {new Date(m.todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            ) : isLeave ? (
                              <div>
                                <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <RiCloseCircleLine /> On Leave
                                </span>
                                {m.todayLeave?.reason && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    {m.todayLeave.reason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="badge badge-secondary" style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>
                                Not Clocked
                              </span>
                            )}
                          </td>

                          {/* Workload */}
                          <td>
                            <div style={{ fontSize: '0.8125rem' }}>
                              <div>
                                🎯 <strong>{m.workSummary?.activeLeads || 0}</strong> active leads
                                {m.workSummary?.totalLeadsValue > 0 && (
                                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                                    (₹{Number(m.workSummary.totalLeadsValue).toLocaleString('en-IN')})
                                  </span>
                                )}
                              </div>
                              {m.workSummary?.totalDesigns > 0 && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--info)', marginTop: 2 }}>
                                  🎨 {m.workSummary.pendingDesigns || 0} ongoing designs
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Action */}
                          <td>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setInspectMember(m)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', padding: '4px 10px' }}
                              id={`inspect-btn-${m.id}`}
                            >
                              <RiEyeLine /> Inspect Work
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Member Inspection Modal */}
      {inspectMember && (
        <InspectWorkModal
          member={inspectMember}
          departmentId={selectedDeptId}
          allMembers={members}
          onClose={() => setInspectMember(null)}
          onReassigned={() => {
            fetchMonitor();
            setInspectMember(null);
          }}
        />
      )}
    </AppLayout>
  );
};

export default TeamMonitorPage;
