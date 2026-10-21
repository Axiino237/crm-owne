import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RiNodeTree, RiTeamLine, RiUserLine, RiBuilding2Line,
  RiBuildingLine, RiShieldUserLine, RiArrowDownLine, RiArrowUpLine,
  RiAddLine, RiDeleteBinLine, RiCloseLine, RiCheckLine,
  RiSaveLine, RiRefreshLine, RiSearchLine, RiInformationLine,
  RiAlertLine, RiOrganizationChart, RiExternalLinkLine, RiArrowRightLine,
  RiUserAddLine
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const HierarchyPage = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(user?.role?.level) || user?.isSuperAdmin;

  // Selection states
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Hierarchy Data states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('layers'); // 'layers' | 'matrix' | 'tree'
  const [searchMember, setSearchMember] = useState('');

  // Department detail data
  const [department, setDepartment] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [layers, setLayers] = useState([]);
  const [reportingMap, setReportingMap] = useState({}); // { [userId]: managerId }
  const [unassignedMembers, setUnassignedMembers] = useState([]);

  // Dirty flag to warn before unsaved exit
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 1. Fetch Companies
  useEffect(() => {
    api.get('/companies/all')
      .then(res => {
        const list = res.data.companies || [];
        setCompanies(list);
        if (list.length > 0) {
          // If user belongs to a company, prefer it, otherwise first
          const defaultCo = list.find(c => c.id === user?.companyId) || list[0];
          setSelectedCompanyId(defaultCo.id);
        }
      })
      .catch(() => toast.error('Failed to load companies'));
  }, [user?.companyId]);

  // 2. Fetch Departments for selected Company
  useEffect(() => {
    if (!selectedCompanyId) {
      setDepartments([]);
      setSelectedDeptId('');
      return;
    }
    api.get(`/departments/all?companyId=${selectedCompanyId}`)
      .then(res => {
        const list = res.data.departments || [];
        setDepartments(list);
        if (list.length > 0) {
          setSelectedDeptId(list[0].id);
        } else {
          setSelectedDeptId('');
          setDepartment(null);
          setLayers([]);
        }
      })
      .catch(() => toast.error('Failed to load departments'));
  }, [selectedCompanyId]);

  // 3. Fetch Detailed Hierarchy for Selected Department
  const fetchHierarchyDetails = useCallback(async () => {
    if (!selectedDeptId) {
      setDepartment(null);
      setLayers([]);
      setCompanyUsers([]);
      setReportingMap({});
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/departments/${selectedDeptId}/hierarchy-details`);
      const data = res.data;
      setDepartment(data.department || null);
      setCompanyUsers(data.companyUsers || []);
      setDepartmentUsers(data.departmentUsers || []);
      
      const loadedLayers = (data.layers && data.layers.length > 0)
        ? data.layers
        : [
            { id: 'layer-1', level: 1, name: 'Layer 1 (HOD)', userIds: [] },
            { id: 'layer-2', level: 2, name: 'Layer 2 (Team Leads)', userIds: [] },
            { id: 'layer-3', level: 3, name: 'Layer 3 (Team Members)', userIds: [] }
          ];

      setLayers(loadedLayers);

      // Build initial reporting map
      const repMap = {};
      (data.companyUsers || []).forEach(u => {
        repMap[u.id] = u.managerId || '';
      });
      setReportingMap(repMap);
      setUnassignedMembers(data.unassignedMembers || []);
      setHasUnsavedChanges(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load department hierarchy');
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId]);

  useEffect(() => {
    fetchHierarchyDetails();
  }, [fetchHierarchyDetails]);

  // Quick lookup maps
  const userMap = useMemo(() => {
    const map = new Map();
    companyUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [companyUsers]);

  // Filtered members by search
  const matchesSearch = useCallback((u) => {
    if (!searchMember.trim()) return true;
    const q = searchMember.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.name?.toLowerCase().includes(q)
    );
  }, [searchMember]);

  // ── Layer Manipulation Handlers ──
  const handleAddLayer = () => {
    const nextLevel = layers.length + 1;
    const defaultName = nextLevel === 2
      ? 'Layer 2 (Team Leads)'
      : nextLevel === 3
        ? 'Layer 3 (Senior Staff)'
        : nextLevel === 4
          ? 'Layer 4 (Associates & Members)'
          : `Layer ${nextLevel} (Tier ${nextLevel})`;

    setLayers(prev => [
      ...prev,
      {
        id: `layer-${Date.now()}`,
        level: nextLevel,
        name: defaultName,
        userIds: []
      }
    ]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveLayer = (idxToRemove) => {
    if (layers.length <= 1) {
      return toast.error('You must keep at least Layer 1 (HOD) in the hierarchy.');
    }
    setLayers(prev =>
      prev
        .filter((_, idx) => idx !== idxToRemove)
        .map((l, idx) => ({ ...l, level: idx + 1 }))
    );
    setHasUnsavedChanges(true);
  };

  const handleMoveLayer = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= layers.length) return;
    setLayers(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((l, i) => ({ ...l, level: i + 1 }));
    });
    setHasUnsavedChanges(true);
  };

  const handleLayerNameChange = (idx, newName) => {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, name: newName } : l));
    setHasUnsavedChanges(true);
  };

  const handleAddUserToLayer = (layerIdx, userId) => {
    if (!userId) return;
    setLayers(prev => {
      // First remove user from any other layer if already present
      const cleaned = prev.map(l => ({
        ...l,
        userIds: (l.userIds || []).filter(id => id !== userId)
      }));
      // Then add to chosen layer
      cleaned[layerIdx].userIds = [...(cleaned[layerIdx].userIds || []), userId];
      return cleaned;
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveUserFromLayer = (layerIdx, userId) => {
    setLayers(prev => prev.map((l, i) => {
      if (i !== layerIdx) return l;
      return { ...l, userIds: (l.userIds || []).filter(id => id !== userId) };
    }));
    setHasUnsavedChanges(true);
  };

  // ── Reporting Matrix Manipulation Handlers ──
  const handleManagerChange = (employeeId, managerId) => {
    if (employeeId === managerId) {
      return toast.error('An employee cannot report to themselves.');
    }
    setReportingMap(prev => ({
      ...prev,
      [employeeId]: managerId || ''
    }));
    setHasUnsavedChanges(true);
  };

  // Auto-assign all subordinate members to primary HOD
  const handleAutoAssignToHOD = () => {
    const primaryHeadId = layers[0]?.userIds?.[0];
    if (!primaryHeadId) {
      return toast.error('Please assign a primary HOD in Layer 1 first.');
    }
    const newMap = { ...reportingMap };
    layers.slice(1).forEach(layer => {
      (layer.userIds || []).forEach(uid => {
        newMap[uid] = primaryHeadId;
      });
    });
    setReportingMap(newMap);
    setHasUnsavedChanges(true);
    toast.success('Assigned all lower layer members to report to Layer 1 HOD!');
  };

  // Auto-cascade: Layer N members report to Layer N-1 lead
  const handleAutoCascade = () => {
    if (layers.length < 2) {
      return toast.error('Need at least 2 layers to auto-cascade reporting lines.');
    }
    const newMap = { ...reportingMap };
    for (let i = 1; i < layers.length; i++) {
      const prevLayer = layers[i - 1];
      const currLayer = layers[i];
      const prevLeaderId = prevLayer.userIds?.[0];
      if (prevLeaderId) {
        (currLayer.userIds || []).forEach(uid => {
          newMap[uid] = prevLeaderId;
        });
      }
    }
    setReportingMap(newMap);
    setHasUnsavedChanges(true);
    toast.success('Auto-cascaded reporting lines from higher layers!');
  };

  // ── Save Entire Hierarchy & Reporting Lines ──
  const handleSaveHierarchy = async () => {
    if (!selectedDeptId) return;
    setSaving(true);
    try {
      const payload = {
        hierarchyLayers: layers.map(l => ({
          id: l.id,
          level: l.level,
          name: l.name,
          userIds: l.userIds || []
        })),
        reportingAssignments: reportingMap
      };

      const res = await api.put(`/departments/${selectedDeptId}/hierarchy`, payload);
      toast.success(res.data.message || 'Hierarchy successfully saved!');
      setHasUnsavedChanges(false);
      fetchHierarchyDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save hierarchy');
    } finally {
      setSaving(false);
    }
  };

  // Check stats
  const totalAssignedUsers = useMemo(() => {
    const ids = new Set(layers.flatMap(l => l.userIds || []));
    return ids.size;
  }, [layers]);

  const multiHeadCount = useMemo(() => {
    const ids = new Set(layers.flatMap(l => l.userIds || []));
    let count = 0;
    ids.forEach(id => {
      const u = userMap.get(id);
      if (u?.headedDepartments && u.headedDepartments.length > 1) {
        count++;
      }
    });
    return count;
  }, [layers, userMap]);

  return (
    <AppLayout title="Hierarchy Studio">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* ── Top Header & Actions ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
              }}>
                <RiNodeTree />
              </div>
              <div>
                <h1 className="page-title" style={{ margin: 0, fontSize: '1.4rem' }}>
                  Hierarchy Studio & Authority Tree
                </h1>
                <p className="page-subtitle" style={{ margin: '3px 0 0', fontSize: '0.85rem' }}>
                  Design multi-tier authority layers, configure manager-to-reportee mapping, and streamline organizational workflow.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {hasUnsavedChanges && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b',
                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                padding: '5px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6
              }}>
                <RiAlertLine /> Unsaved Changes
              </span>
            )}

            <button
              className="btn btn-outline btn-sm"
              onClick={fetchHierarchyDetails}
              disabled={loading || saving}
              title="Reload hierarchy"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RiRefreshLine className={loading ? 'spinning' : ''} /> Refresh
            </button>

            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={handleSaveHierarchy}
                disabled={loading || saving || !selectedDeptId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px', fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
                }}
              >
                <RiSaveLine /> {saving ? 'Saving Changes...' : 'Save Hierarchy & Mapping'}
              </button>
            )}
          </div>
        </div>

        {/* ── Filter / Scope Switcher Card ── */}
        <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* Company Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiBuilding2Line style={{ color: 'var(--accent)', fontSize: '1.1rem' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Company:</span>
                <select
                  className="form-control"
                  value={selectedCompanyId}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  style={{
                    minWidth: 210,
                    height: 42,
                    padding: '0 14px',
                    lineHeight: '42px',
                    fontSize: '0.88rem',
                    background: 'rgba(10, 15, 30, 0.85)',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    borderRadius: 10,
                    color: '#f8fafc'
                  }}
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Department Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiBuildingLine style={{ color: '#10b981', fontSize: '1.1rem' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department:</span>
                <select
                  className="form-control"
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  disabled={departments.length === 0}
                  style={{
                    minWidth: 230,
                    height: 42,
                    padding: '0 14px',
                    lineHeight: '42px',
                    fontSize: '0.88rem',
                    background: 'rgba(10, 15, 30, 0.85)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 10,
                    color: '#f8fafc'
                  }}
                >
                  {departments.length === 0 && <option value="">No departments in company</option>}
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Search */}
              <div className="input-wrapper" style={{ minWidth: 240 }}>
                <RiSearchLine className="input-icon" />
                <input
                  className="form-control"
                  placeholder="Search member in hierarchy..."
                  value={searchMember}
                  onChange={e => setSearchMember(e.target.value)}
                  style={{
                    height: 42,
                    paddingLeft: 42,
                    fontSize: '0.88rem',
                    background: 'rgba(10, 15, 30, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 10
                  }}
                />
              </div>
            </div>

            {/* Quick Department Link */}
            {department && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link
                  to={`/team-monitor`}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RiTeamLine /> Open Team Monitor
                </Link>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {department && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20, marginTop: 14,
              paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>🏛️ Hierarchy Layers:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{layers.length}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>👥 Assigned Members:</span>
                <strong style={{ color: '#10b981' }}>{totalAssignedUsers}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>👑 Primary HOD:</span>
                <strong style={{ color: '#f59e0b' }}>
                  {layers[0]?.userIds?.[0] ? (userMap.get(layers[0].userIds[0])?.name || 'Selected') : 'None (Unassigned)'}
                </strong>
              </div>
              {multiHeadCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>🌟 Multi-Dept Heads:</span>
                  <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>{multiHeadCount}</span>
                </div>
              )}
              {unassignedMembers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#ef4444' }}>⚠️ Unassigned in Layers:</span>
                  <strong style={{ color: '#ef4444' }}>{unassignedMembers.length}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Main View Selector Tabs ── */}
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
          <button
            className={`btn ${activeTab === 'layers' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveTab('layers')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontWeight: 600 }}
          >
            <RiOrganizationChart /> 1. Dynamic Layer Builder ({layers.length})
          </button>
          <button
            className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveTab('matrix')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontWeight: 600 }}
          >
            <RiShieldUserLine /> 2. Reporting Matrix (Manager-Reportee)
          </button>
          <button
            className={`btn ${activeTab === 'tree' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setActiveTab('tree')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontWeight: 600 }}
          >
            <RiNodeTree /> 3. Interactive Org Flow Tree
          </button>
        </div>

        {/* ── Content View ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ color: 'var(--text-secondary)' }}>Loading hierarchy studio data...</div>
          </div>
        ) : !selectedDeptId ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏛️</div>
            <h3>Please select a Department</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
              Select a company and department from the header above to build or review its multi-tier authority hierarchy.
            </p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════
                TAB 1: DYNAMIC LAYER BUILDER
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'layers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Information banner */}
                <div style={{
                  padding: '12px 18px', background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.22)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                    <RiInformationLine style={{ color: 'var(--accent)', fontSize: '1.2rem', flexShrink: 0 }} />
                    <span>
                      <strong>Layer Rules:</strong> <strong>Layer 1 (HOD)</strong> has primary supervisory control over daily attendance, leave approvals, and lead allocations. Higher layers automatically oversee members in subordinate tiers.
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleAddLayer}
                      style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                    >
                      <RiAddLine /> + Add Hierarchy Layer
                    </button>
                  )}
                </div>

                {/* Layers List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {layers.map((layer, idx) => {
                    const isTopLayer = idx === 0;
                    const assignedUsers = (layer.userIds || []).map(id => userMap.get(id)).filter(Boolean);
                    const filteredAssignedUsers = assignedUsers.filter(matchesSearch);
                    const availableCompanyUsers = companyUsers.filter(u => !(layer.userIds || []).includes(u.id));

                    return (
                      <div
                        key={layer.id || idx}
                        style={{
                          background: isTopLayer
                            ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.14) 0%, rgba(124, 58, 237, 0.08) 45%, rgba(13, 19, 38, 0.9) 100%)'
                            : idx === 1
                            ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.1) 0%, rgba(13, 19, 38, 0.9) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(13, 19, 38, 0.9) 100%)',
                          border: `1px solid ${
                            isTopLayer
                              ? 'rgba(129, 140, 248, 0.38)'
                              : idx === 1
                              ? 'rgba(56, 189, 248, 0.28)'
                              : 'rgba(255, 255, 255, 0.08)'
                          }`,
                          borderRadius: 16,
                          padding: '22px 24px',
                          boxShadow: isTopLayer
                            ? '0 10px 30px -10px rgba(79, 70, 229, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                            : '0 4px 20px -5px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        {/* Layer Header Row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                            {/* Tier Badge */}
                            <span
                              style={{
                                background: isTopLayer
                                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                                  : idx === 1
                                  ? 'linear-gradient(135deg, #0284c7, #2563eb)'
                                  : 'linear-gradient(135deg, #334155, #1e293b)',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                letterSpacing: '0.02em',
                                padding: '6px 14px',
                                borderRadius: 9999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: isTopLayer
                                  ? '0 2px 12px rgba(99, 102, 241, 0.45)'
                                  : idx === 1
                                  ? '0 2px 10px rgba(2, 132, 199, 0.35)'
                                  : 'none'
                              }}
                            >
                              {isTopLayer ? '👑 Layer 1 (HOD)' : idx === 1 ? '⭐ Layer 2 (Team Leads)' : `Layer ${idx + 1}`}
                            </span>

                            {/* Editable Layer Name */}
                            <input
                              type="text"
                              className="form-control"
                              value={layer.name}
                              onChange={e => handleLayerNameChange(idx, e.target.value)}
                              placeholder="e.g. Technical Leads, Supervisors, Associates..."
                              style={{
                                height: 40,
                                maxWidth: 360,
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                background: 'rgba(0, 0, 0, 0.35)',
                                borderColor: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: 10,
                                padding: '0 14px'
                              }}
                              disabled={!isAdmin}
                            />

                            {/* Assigned Count Badge */}
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: assignedUsers.length > 0 ? '#10b981' : 'var(--text-muted)',
                              background: assignedUsers.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${assignedUsers.length > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                              padding: '5px 12px',
                              borderRadius: 20
                            }}>
                              {assignedUsers.length === 1 ? '1 member assigned' : `${assignedUsers.length} members assigned`}
                            </span>
                          </div>

                          {/* Reordering & Delete Controls */}
                          {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleMoveLayer(idx, 'up')}
                                disabled={idx === 0}
                                title="Move layer up"
                                style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: idx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-primary)',
                                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '1rem', transition: 'all 0.2s'
                                }}
                              >
                                <RiArrowUpLine />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveLayer(idx, 'down')}
                                disabled={idx === layers.length - 1}
                                title="Move layer down"
                                style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: idx === layers.length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-primary)',
                                  cursor: idx === layers.length - 1 ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '1rem', transition: 'all 0.2s'
                                }}
                              >
                                <RiArrowDownLine />
                              </button>
                              {!isTopLayer && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLayer(idx)}
                                  title="Remove this layer"
                                  style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#ef4444', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1rem', transition: 'all 0.2s', marginLeft: 4
                                  }}
                                >
                                  <RiDeleteBinLine />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Assigned Members Section */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <RiTeamLine style={{ color: 'var(--accent)' }} /> Layer Members ({filteredAssignedUsers.length}):
                          </div>

                          {filteredAssignedUsers.length === 0 ? (
                            <div style={{
                              padding: '16px 20px',
                              borderRadius: 12,
                              background: 'rgba(0, 0, 0, 0.2)',
                              border: '1px dashed rgba(255, 255, 255, 0.12)',
                              display: 'flex', alignItems: 'center', gap: 10,
                              color: 'var(--text-muted)', fontSize: '0.85rem'
                            }}>
                              <RiUserLine style={{ fontSize: '1.2rem', color: 'var(--accent)', opacity: 0.7 }} />
                              <span>No users assigned to this layer yet. Select an employee from the dropdown below to assign.</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                              {filteredAssignedUsers.map((u, uIdx) => {
                                const isPrimaryHOD = isTopLayer && uIdx === 0;
                                const isMultiHead = u.headedDepartments && u.headedDepartments.length > 1;

                                return (
                                  <div
                                    key={u.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      background: isPrimaryHOD ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.18))' : 'rgba(255, 255, 255, 0.06)',
                                      border: `1px solid ${isPrimaryHOD ? 'rgba(129, 140, 248, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                                      borderRadius: 9999,
                                      padding: '6px 14px',
                                      fontSize: '0.84rem',
                                      color: 'var(--text-primary)',
                                      boxShadow: isPrimaryHOD ? '0 4px 14px rgba(99, 102, 241, 0.2)' : 'none',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <div style={{
                                      width: 26, height: 26, borderRadius: '50%',
                                      background: isPrimaryHOD ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#3b82f6',
                                      color: '#fff', fontSize: '0.72rem', fontWeight: 800,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                      {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>

                                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                      ({u.role?.name || 'Member'})
                                    </span>

                                    {isPrimaryHOD && (
                                      <span style={{
                                        fontSize: '0.68rem', fontWeight: 800, color: '#fbbf24',
                                        background: 'rgba(245, 158, 11, 0.18)', border: '1px solid rgba(245, 158, 11, 0.35)',
                                        borderRadius: 6, padding: '2px 6px'
                                      }}>
                                        👑 Head
                                      </span>
                                    )}

                                    {isMultiHead && (
                                      <span
                                        style={{
                                          fontSize: '0.68rem', fontWeight: 700, color: '#f472b6',
                                          background: 'rgba(236, 72, 153, 0.18)', border: '1px solid rgba(236, 72, 153, 0.35)',
                                          borderRadius: 6, padding: '2px 6px'
                                        }}
                                        title={`Heads ${u.headedDepartments.map(d => d.name).join(', ')}`}
                                      >
                                        Multi-Head ({u.headedDepartments.length})
                                      </span>
                                    )}

                                    {u.reporteeCount > 0 && (
                                      <span style={{
                                        fontSize: '0.7rem', color: '#10b981', fontWeight: 700,
                                        background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: 6, padding: '2px 6px'
                                      }}>
                                        👤 {u.reporteeCount} rep.
                                      </span>
                                    )}

                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveUserFromLayer(idx, u.id)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: 'var(--text-muted)',
                                          padding: 2,
                                          display: 'flex',
                                          alignItems: 'center',
                                          fontSize: '1rem',
                                          marginLeft: 2,
                                          borderRadius: '50%',
                                          transition: 'color 0.2s'
                                        }}
                                        title="Remove from this layer"
                                      >
                                        <RiCloseLine />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Add Member Dropdown Row */}
                        {isAdmin && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            paddingTop: 14,
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                          }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 10,
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.1rem', flexShrink: 0
                            }}>
                              <RiUserAddLine />
                            </div>

                            <select
                              className="form-control"
                              value=""
                              onChange={e => handleAddUserToLayer(idx, e.target.value)}
                              disabled={availableCompanyUsers.length === 0}
                              style={{
                                height: 42,
                                padding: '0 16px',
                                lineHeight: '42px',
                                fontSize: '0.88rem',
                                fontWeight: 500,
                                maxWidth: 520,
                                background: 'rgba(10, 15, 30, 0.95)',
                                border: '1px solid rgba(129, 140, 248, 0.3)',
                                borderRadius: 10,
                                color: '#f8fafc',
                                cursor: availableCompanyUsers.length === 0 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <option value="">
                                {availableCompanyUsers.length === 0
                                  ? '✓ All eligible company members assigned to layers'
                                  : `+ Add team member to ${layer.name}...`}
                              </option>
                              {availableCompanyUsers.map(u => {
                                const headedInfo = u.headedDepartments?.map(d => d.name).join(', ');
                                const currentDept = u.departmentId === department?.id ? '' : ' [Diff Dept]';
                                return (
                                  <option key={u.id} value={u.id}>
                                    👤 {u.name} · {u.role?.name || 'No Role'} ({u.email}){headedInfo ? ` [👑 Head of: ${headedInfo}]` : ''}{currentDept}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Add Layer Bar */}
                {isAdmin && (
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <button
                      className="btn btn-outline"
                      onClick={handleAddLayer}
                      style={{
                        padding: '12px 28px',
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        borderRadius: 12,
                        background: 'rgba(99, 102, 241, 0.08)',
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        color: '#a5b4fc',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <RiAddLine style={{ fontSize: '1.2rem' }} /> + Add Another Hierarchy Layer
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 2: REPORTING MATRIX (MANAGER-REPORTEE MAPPING)
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'matrix' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Information banner & Quick Auto-Assign tools */}
                <div style={{
                  padding: '14px 18px', background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      📊 Direct Manager & Reporting Line Matrix
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Map who reports to whom. When employees apply for leaves or attendance corrections, their mapped manager receives it for direct approval.
                    </div>
                  </div>

                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={handleAutoAssignToHOD}
                        style={{ fontSize: '0.78rem' }}
                        title="Set Layer 1 HOD as manager for all lower layers"
                      >
                        👑 Auto-Assign to Layer 1 HOD
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={handleAutoCascade}
                        style={{ fontSize: '0.78rem' }}
                        title="Cascade reporting from Layer N to Layer N-1"
                      >
                        ⚡ Auto-Cascade by Layers
                      </button>
                    </div>
                  )}
                </div>

                {/* Table of Members & Manager Assignments */}
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Hierarchy Layer</th>
                        <th>Role & Access</th>
                        <th>Direct Manager (Approver)</th>
                        <th>Direct Reportees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No users assigned to this department yet.
                          </td>
                        </tr>
                      ) : (
                        departmentUsers.filter(matchesSearch).map(emp => {
                          // Find layer name for this user
                          const memberLayer = layers.find(l => (l.userIds || []).includes(emp.id));
                          const assignedManagerId = reportingMap[emp.id] || '';
                          const assignedManager = userMap.get(assignedManagerId);

                          // Eligible managers list: exclude themselves
                          const eligibleManagers = companyUsers.filter(u => u.id !== emp.id);

                          return (
                            <tr key={emp.id}>
                              {/* Employee Details */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
                                    color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                  }}>
                                    {emp.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Layer Tag */}
                              <td>
                                {memberLayer ? (
                                  <span
                                    className="badge"
                                    style={{
                                      background: memberLayer.level === 1 ? '#4f46e5' : '#334155',
                                      color: '#fff',
                                      fontSize: '0.74rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    {memberLayer.name}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    ⚠️ Unassigned in Layers
                                  </span>
                                )}
                              </td>

                              {/* Role */}
                              <td>
                                <span className="badge badge-accent" style={{ fontSize: '0.74rem' }}>
                                  {emp.role?.name || 'User'}
                                </span>
                              </td>

                              {/* Direct Manager Selector */}
                              <td style={{ minWidth: 260 }}>
                                {isAdmin ? (
                                  <select
                                    className="form-control"
                                    value={assignedManagerId}
                                    onChange={e => handleManagerChange(emp.id, e.target.value)}
                                    style={{
                                      height: 40,
                                      padding: '0 14px',
                                      lineHeight: '40px',
                                      fontSize: '0.86rem',
                                      background: 'rgba(10, 15, 30, 0.95)',
                                      borderRadius: 8,
                                      border: `1px solid ${assignedManagerId ? 'rgba(99, 102, 241, 0.45)' : 'rgba(255, 255, 255, 0.12)'}`,
                                      color: '#f8fafc'
                                    }}
                                  >
                                    <option value="">Direct / None (No Manager)</option>
                                    {/* Group: Layer 1 HODs */}
                                    <optgroup label="👑 Layer 1 Leaders (HOD)">
                                      {layers[0]?.userIds?.map(uid => {
                                        const leader = userMap.get(uid);
                                        if (!leader || leader.id === emp.id) return null;
                                        return (
                                          <option key={leader.id} value={leader.id}>
                                            👑 {leader.name} ({leader.role?.name || 'HOD'})
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                    {/* Group: Other eligible managers in company */}
                                    <optgroup label="👥 Other Leads & Managers">
                                      {eligibleManagers
                                        .filter(m => !(layers[0]?.userIds || []).includes(m.id))
                                        .map(m => (
                                          <option key={m.id} value={m.id}>
                                            👤 {m.name} · {m.role?.name || 'Staff'} ({m.email})
                                          </option>
                                        ))}
                                    </optgroup>
                                  </select>
                                ) : (
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    {assignedManager ? `👤 ${assignedManager.name}` : <span style={{ color: 'var(--text-muted)' }}>None / Direct</span>}
                                  </div>
                                )}
                              </td>

                              {/* Reportees Count */}
                              <td>
                                {emp.reporteeCount > 0 ? (
                                  <span style={{
                                    fontSize: '0.76rem', fontWeight: 700, color: '#10b981',
                                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: 6, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4
                                  }}>
                                    👤 {emp.reporteeCount} reportees
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                TAB 3: INTERACTIVE ORG FLOW TREE
            ══════════════════════════════════════════════════════════ */}
            {activeTab === 'tree' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Department Node Header */}
                <div style={{
                  textAlign: 'center', margin: '10px auto 20px',
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.15), rgba(168,85,247,0.15))',
                  border: '1px solid rgba(99,102,241,0.4)',
                  borderRadius: 16, padding: '16px 28px', maxWidth: 480,
                  boxShadow: '0 8px 32px rgba(99,102,241,0.15)'
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🏛️</div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                    {department?.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {department?.company?.name} · {department?.organization?.name}
                  </div>
                </div>

                {/* Tree Levels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32, alignItems: 'center' }}>
                  {layers.map((layer, idx) => {
                    const assignedUsers = (layer.userIds || []).map(id => userMap.get(id)).filter(Boolean);
                    const isTopLayer = idx === 0;

                    return (
                      <div key={layer.id || idx} style={{ width: '100%', maxWidth: 1100, textAlign: 'center' }}>
                        
                        {/* Connecting Line from previous layer */}
                        {idx > 0 && (
                          <div style={{
                            width: 2, height: 28, background: 'linear-gradient(to bottom, #6366f1, #a855f7)',
                            margin: '-20px auto 12px'
                          }} />
                        )}

                        {/* Layer Title Label */}
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          background: isTopLayer ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isTopLayer ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: 20, padding: '4px 16px', marginBottom: 16
                        }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: isTopLayer ? '#a855f7' : 'var(--text-secondary)' }}>
                            {isTopLayer ? '👑' : 'Tier'} {layer.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ({assignedUsers.length} members)
                          </span>
                        </div>

                        {/* Cards in this Layer */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: 16,
                          justifyContent: 'center'
                        }}>
                          {assignedUsers.length === 0 ? (
                            <div style={{
                              gridColumn: '1 / -1', padding: '16px', borderRadius: 10,
                              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                              color: 'var(--text-muted)', fontSize: '0.82rem'
                            }}>
                              No members assigned to {layer.name} yet.
                            </div>
                          ) : (
                            assignedUsers.map((u, uIdx) => {
                              const isPrimaryHOD = isTopLayer && uIdx === 0;
                              const manager = userMap.get(reportingMap[u.id]);

                              return (
                                <div
                                  key={u.id}
                                  style={{
                                    background: isPrimaryHOD ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))' : 'var(--bg-card)',
                                    border: `1px solid ${isPrimaryHOD ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.09)'}`,
                                    borderRadius: 12, padding: '16px',
                                    textAlign: 'left',
                                    boxShadow: isPrimaryHOD ? '0 6px 20px rgba(99,102,241,0.12)' : 'none',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                      <div style={{
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: isPrimaryHOD ? 'linear-gradient(135deg, #4f46e5, #a855f7)' : '#334155',
                                        color: '#fff', fontSize: '0.8rem', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                      }}>
                                        {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>

                                      {isPrimaryHOD && (
                                        <span style={{
                                          fontSize: '0.68rem', fontWeight: 800, color: '#f59e0b',
                                          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                                          padding: '2px 8px', borderRadius: 6
                                        }}>
                                          👑 Head of Dept
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                      {u.name}
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                                      {u.email}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                                        {u.role?.name || 'Member'}
                                      </span>
                                      {u.headedDepartments && u.headedDepartments.length > 1 && (
                                        <span style={{
                                          fontSize: '0.66rem', fontWeight: 700, color: '#ec4899',
                                          background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)',
                                          borderRadius: 4, padding: '1px 5px'
                                        }}>
                                          Multi-Head ({u.headedDepartments.length})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reporting footer */}
                                  <div style={{
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    paddingTop: 8, marginTop: 8, fontSize: '0.74rem',
                                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                  }}>
                                    <span>
                                      Reports to: <strong>{manager ? manager.name : (isPrimaryHOD ? 'Executive Board' : 'Direct')}</strong>
                                    </span>
                                    {u.reporteeCount > 0 && (
                                      <span style={{ color: '#10b981', fontWeight: 700 }}>
                                        👤 {u.reporteeCount} team
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default HierarchyPage;
