import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RiAddLine, RiPencilLine, RiDeleteBinLine, RiSearchLine,
  RiTeamLine, RiCloseLine, RiShieldUserLine, RiUserLine,
  RiBuildingLine, RiArrowRightSLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import DeleteDependencyModal from '../../components/DeleteDependencyModal';

/* ── Department Hierarchy Modal ── */
const DeptModal = ({ dept, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: dept?.name || '',
    code: dept?.code || '',
    organizationId: dept?.organization?.id || '',
    companyId: dept?.company?.id || '',
    description: dept?.description || '',
    isActive: dept?.isActive ?? true
  });

  // Dynamic hierarchy layers: Layer 1 (HOD), Layer 2 (Team Leads), Layer 3, etc.
  const [layers, setLayers] = useState(() => {
    if (dept?.hierarchyLayers && dept.hierarchyLayers.length > 0) {
      return dept.hierarchyLayers.map((l, idx) => ({
        id: l.id || `layer-${idx + 1}`,
        level: idx + 1,
        name: l.name || (idx === 0 ? 'Head of Department (HOD)' : `Layer ${idx + 1} Lead`),
        userIds: Array.isArray(l.userIds)
          ? l.userIds
          : (l.users ? l.users.map(u => u.id) : (l.userId ? [l.userId] : []))
      }));
    }
    return [
      {
        id: 'layer-1',
        level: 1,
        name: 'Head of Department (HOD)',
        userIds: dept?.head?.id ? [dept.head.id] : []
      }
    ];
  });

  const [orgs, setOrgs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/organizations/all').then(r => setOrgs(r.data.organizations || []));
  }, []);

  useEffect(() => {
    if (form.organizationId) {
      api.get(`/companies/all?organizationId=${form.organizationId}`).then(r => setCompanies(r.data.companies || []));
    }
  }, [form.organizationId]);

  useEffect(() => {
    if (!form.companyId) { setUsers([]); return; }
    setUsersLoading(true);
    api.get(`/uam/users?limit=200&companyId=${form.companyId}`)
      .then(r => setUsers(r.data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [form.companyId]);

  /* Hierarchy Layer Handlers */
  const handleAddLayer = () => {
    const nextLevel = layers.length + 1;
    const defaultName = nextLevel === 2
      ? 'Team Leads / Managers'
      : nextLevel === 3
        ? 'Supervisors / Senior Staff'
        : `Level ${nextLevel} Leads`;

    setLayers(prev => [
      ...prev,
      {
        id: `layer-${Date.now()}`,
        level: nextLevel,
        name: defaultName,
        userIds: []
      }
    ]);
  };

  const handleRemoveLayer = (idxToRemove) => {
    setLayers(prev =>
      prev
        .filter((_, idx) => idx !== idxToRemove)
        .map((l, idx) => ({ ...l, level: idx + 1 }))
    );
  };

  const handleLayerNameChange = (idx, newName) => {
    setLayers(prev => prev.map((l, i) => i === idx ? { ...l, name: newName } : l));
  };

  const handleAddUserToLayer = (layerIdx, userId) => {
    if (!userId) return;
    setLayers(prev => prev.map((l, i) => {
      if (i !== layerIdx) return l;
      if (l.userIds.includes(userId)) return l;
      return { ...l, userIds: [...l.userIds, userId] };
    }));
  };

  const handleRemoveUserFromLayer = (layerIdx, userId) => {
    setLayers(prev => prev.map((l, i) => {
      if (i !== layerIdx) return l;
      return { ...l, userIds: l.userIds.filter(id => id !== userId) };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Prepare payload with hierarchyLayers and backward-compatible headId
    const primaryHeadId = layers[0]?.userIds?.[0] || null;
    const payload = {
      ...form,
      hierarchyLayers: layers,
      headId: primaryHeadId
    };

    try {
      if (dept) {
        await api.put(`/departments/${dept.id}`, payload);
        toast.success('Department & Hierarchy updated!');
      } else {
        await api.post('/departments', payload);
        toast.success('Department created with Hierarchy!');
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
    setLoading(false);
  };

  const f = (field) => e => setForm(p => ({ ...p, [field]: e.target.value }));

  // Helper map for quick user lookup
  const userMap = new Map(users.map(u => [u.id, u]));

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal" style={{ maxWidth: 720, width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              {dept ? 'Edit Department & Hierarchy' : 'Create Department & Hierarchy'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Configure department info and dynamic multi-level authority layers
            </p>
          </div>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {error && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Organization *</label>
              <select className="form-control" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value, companyId: '' }))} required disabled={!!dept} id="dept-org">
                <option value="">Select Organization</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Company *</label>
              <select className="form-control" value={form.companyId} onChange={e => setForm(p => ({ ...p, companyId: e.target.value }))} required disabled={!!dept || !form.organizationId} id="dept-company">
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Department Name *</label>
              <input className="form-control" value={form.name} onChange={f('name')} required placeholder="e.g. Sales & Marketing" id="dept-name" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Code (Optional)</label>
              <input className="form-control" value={form.code} onChange={f('code')} placeholder="e.g. SALES" id="dept-code" />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Description</label>
            <input className="form-control" value={form.description} onChange={f('description')} placeholder="Brief description of department scope..." id="dept-desc" />
          </div>

          {/* ── Dynamic Hierarchy Layers Section ── */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem' }}>
                  <span>🏛️ Department Hierarchy Layers</span>
                  <span className="badge badge-accent" style={{ fontSize: '0.75rem' }}>
                    {layers.length} {layers.length === 1 ? 'Layer' : 'Layers'} Defined
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Higher layers (HOD, Team Leads) monitor daily work, attendance, and leads of lower tiers.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAddLayer}
                style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}
                id="add-layer-btn"
              >
                <RiAddLine /> + Add Hierarchy Layer
              </button>
            </div>

            {/* Warning if no company selected yet */}
            {!form.companyId && (
              <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--warning, #f59e0b)', marginBottom: 14 }}>
                ⚠️ Please select an Organization & Company first to assign members to layers.
              </div>
            )}

            {/* Layers List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {layers.map((layer, idx) => {
                const isTopLayer = idx === 0;
                const assignedUsers = layer.userIds.map(id => userMap.get(id)).filter(Boolean);
                const availableUsers = users.filter(u => !layer.userIds.includes(u.id));

                return (
                  <div
                    key={layer.id || idx}
                    style={{
                      background: isTopLayer ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isTopLayer ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.09)'}`,
                      borderRadius: 10,
                      padding: '14px 16px'
                    }}
                  >
                    {/* Layer Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <span
                          className="badge"
                          style={{
                            background: isTopLayer ? '#4f46e5' : '#334155',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            letterSpacing: '0.03em',
                            padding: '4px 8px'
                          }}
                        >
                          {isTopLayer ? '👑 Layer 1 (HOD)' : `Layer ${idx + 1}`}
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          value={layer.name}
                          onChange={e => handleLayerNameChange(idx, e.target.value)}
                          placeholder="e.g. Technical Leads, Supervisors..."
                          style={{
                            height: 32,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            maxWidth: 320,
                            background: 'rgba(0,0,0,0.2)'
                          }}
                          required
                        />
                      </div>
                      {!isTopLayer && (
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          onClick={() => handleRemoveLayer(idx)}
                          style={{ color: 'var(--danger)', height: 30, width: 30 }}
                          title="Remove this layer"
                        >
                          <RiDeleteBinLine />
                        </button>
                      )}
                    </div>

                    {/* Assigned Users Chips */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                        Assigned Members ({layer.userIds.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28 }}>
                        {assignedUsers.length === 0 ? (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No users assigned yet — pick from dropdown below
                          </span>
                        ) : (
                          assignedUsers.map(u => (
                            <span
                              key={u.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: isTopLayer ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                                border: `1px solid ${isTopLayer ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.14)'}`,
                                borderRadius: 16,
                                padding: '3px 10px',
                                fontSize: '0.78rem',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <span style={{ fontWeight: 600 }}>{u.name}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                ({u.role?.name || 'User'})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveUserFromLayer(idx, u.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  fontSize: '0.85rem'
                                }}
                                title="Remove user"
                              >
                                <RiCloseLine />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add User Select Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select
                        className="form-control"
                        value=""
                        onChange={e => {
                          handleAddUserToLayer(idx, e.target.value);
                        }}
                        disabled={!form.companyId || usersLoading || availableUsers.length === 0}
                        style={{ height: 34, fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)' }}
                      >
                        <option value="">
                          {!form.companyId
                            ? '— Select Company above first —'
                            : usersLoading
                              ? 'Loading company users...'
                              : availableUsers.length === 0
                                ? 'All company users added'
                                : `+ Add user to ${layer.name || `Layer ${idx + 1}`}...`}
                        </option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            👤 {u.name} · {u.role?.name || 'No Role'} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Layer Link */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                type="button"
                onClick={handleAddLayer}
                style={{
                  background: 'transparent',
                  border: '1px dashed rgba(99,102,241,0.5)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  color: '#818cf8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <RiAddLine /> + Add Layer {layers.length + 1} (e.g. Supervisor, Executive, Support)
              </button>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="dept-save-btn">
              {loading ? <div className="spinner spinner-sm" /> : null}
              {dept ? 'Update Department & Hierarchy' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Main Departments Page ── */
const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deleteDept, setDeleteDept] = useState(null);
  const LIMIT = 10;

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/departments?page=${page}&limit=${LIMIT}&search=${search}`);
      setDepartments(res.data.departments || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load departments');
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleDelete = (dept) => {
    setDeleteDept(dept);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppLayout title="Departments">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments & Hierarchy</h1>
          <p className="page-subtitle">Manage departments, dynamic authority layers, and monitor team performance</p>
        </div>
        <div className="flex gap-2">
          <Link to="/team-monitor" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RiTeamLine /> Team Monitor
          </Link>
          <button className="btn btn-primary" onClick={() => { setEditDept(null); setShowModal(true); }} id="add-dept-btn">
            <RiAddLine /> Add Department
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="input-wrapper">
            <RiSearchLine className="input-icon" />
            <input
              className="form-control"
              placeholder="Search departments..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: 280 }}
              id="dept-search"
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : departments.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗂️</div>
            <h3>No departments yet</h3>
            <p>Create departments with multi-level hierarchy layers under your companies</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Company</th>
                  <th>Organization</th>
                  <th>Hierarchy & Authority Layers</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => {
                  const layers = d.hierarchyLayers || [];
                  const layer1 = layers[0];
                  const layer1Users = layer1?.users || (d.head ? [d.head] : []);
                  const otherLayers = layers.slice(1);

                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        {d.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{d.description}</div>}
                      </td>
                      <td><code style={{ color: 'var(--info)' }}>{d.code}</code></td>
                      <td><span className="badge badge-success">{d.company?.name}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{d.organization?.name}</td>
                      <td>
                        {/* Hierarchy visual display */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {/* Layer 1 HOD */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                              👑 {layer1?.name || 'HOD'}
                            </span>
                            {layer1Users.length > 0 ? (
                              layer1Users.map(u => (
                                <span key={u.id} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {u.name}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unassigned</span>
                            )}
                          </div>

                          {/* Extra layers if any */}
                          {otherLayers.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                              {otherLayers.map((ol, idx) => (
                                <span
                                  key={ol.id || idx}
                                  className="badge"
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '0.68rem',
                                    color: 'var(--text-secondary)',
                                    padding: '1px 6px'
                                  }}
                                  title={`${ol.name}: ${ol.users?.map(u => u.name).join(', ') || 'No members'}`}
                                >
                                  L{idx + 2}: {ol.name} ({ol.userIds?.length || 0})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td><span className={`badge ${d.isActive ? 'badge-success' : 'badge-danger'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="flex gap-2 items-center">
                          {/* Direct Team Monitor Link */}
                          <Link
                            to={`/team-monitor?departmentId=${d.id}`}
                            className="btn btn-sm btn-outline"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.78rem', color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)' }}
                            title="Monitor team attendance & workload"
                          >
                            <RiTeamLine /> Monitor
                          </Link>
                          <button
                            className="btn btn-icon btn-sm"
                            onClick={() => { setEditDept(d); setShowModal(true); }}
                            id={`edit-dept-${d.id}`}
                            title="Edit Department"
                          >
                            <RiPencilLine />
                          </button>
                          <button
                            className="btn btn-icon btn-sm"
                            onClick={() => handleDelete(d)}
                            style={{ color: 'var(--danger)' }}
                            id={`delete-dept-${d.id}`}
                            title="Delete Department"
                          >
                            <RiDeleteBinLine />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>

      {showModal && (
        <DeptModal
          dept={editDept}
          onClose={() => { setShowModal(false); setEditDept(null); }}
          onSaved={() => { setShowModal(false); setEditDept(null); fetchDepts(); }}
        />
      )}

      <DeleteDependencyModal
        isOpen={!!deleteDept}
        entityType="Department"
        entityId={deleteDept?.id}
        entityName={deleteDept?.name}
        onClose={() => setDeleteDept(null)}
        onDeleted={() => { setDeleteDept(null); fetchDepts(); }}
      />
    </AppLayout>
  );
};

export default DepartmentsPage;
