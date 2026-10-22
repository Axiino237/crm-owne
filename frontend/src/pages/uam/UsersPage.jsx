import { useState, useEffect, useCallback } from 'react';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiSearchLine, RiRefreshLine, RiUserLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';



/* ---- User Form Modal ---- */
const UserModal = ({ user, onClose, onSaved }) => {
  const { refreshAuth } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    roleId: user?.role?.id || '',
    organizationId: user?.organization?.id || '',
    companyId: user?.company?.id || '',
    departmentId: user?.department?.id || '',
    isActive: user?.isActive ?? true,
    paidLeaves: user?.paidLeaves ?? 12,
    casualLeaves: user?.casualLeaves ?? 10,
    sickLeaves: user?.sickLeaves ?? 8,
    baseSalary: user?.baseSalary !== undefined && user?.baseSalary !== null ? user.baseSalary : '',
    monthlyLeaveQuota: user?.monthlyLeaveQuota !== undefined && user?.monthlyLeaveQuota !== null ? user.monthlyLeaveQuota : 1,
    managerId: user?.manager?.id || user?.managerId || '',
  });
  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/roles/all'),
      api.get('/organizations/all'),
    ]).then(([r, o]) => {
      setRoles(r.data.roles || []);
      setOrgs(o.data.organizations || []);
    }).catch(() => {});
  }, []);

  // Fetch managers strictly scoped to selected organization
  useEffect(() => {
    const orgParam = form.organizationId ? `?organizationId=${form.organizationId}` : '';
    api.get(`/uam/managers${orgParam}`)
      .then(r => setManagers(r.data.managers || []))
      .catch(() => setManagers([]));
  }, [form.organizationId]);

  useEffect(() => {
    if (form.organizationId) {
      api.get(`/companies/all?organizationId=${form.organizationId}`)
        .then(r => setCompanies(r.data.companies || []));
    } else {
      setCompanies([]);
    }
  }, [form.organizationId]);

  useEffect(() => {
    if (form.companyId) {
      api.get(`/departments/all?companyId=${form.companyId}`)
        .then(r => setDepartments(r.data.departments || []));
    } else {
      setDepartments([]);
    }
  }, [form.companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (user) {
        await api.put(`/uam/users/${user.id}`, form);
        toast.success('User updated!');
      } else {
        await api.post('/uam/users', form);
        toast.success('User created!');
      }
      await refreshAuth();
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ padding: '16px', overflowY: 'auto' }}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h3 className="modal-title">{user ? 'Edit User' : 'Create New User'}</h3>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '20px 24px' }}>
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="John Doe" id="user-name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-control" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="john@company.com" id="user-email" />
              </div>
            </div>

            {!user && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-control" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required placeholder="Min 6 characters" id="user-password" />
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9999999999" id="user-phone" />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-control" value={form.roleId} onChange={e => setForm(p => ({ ...p, roleId: e.target.value }))} required id="user-role">
                  <option value="">Select Role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Organization</label>
                <select className="form-control" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value, companyId: '', departmentId: '' }))} id="user-org">
                  <option value="">None</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <select className="form-control" value={form.companyId} onChange={e => setForm(p => ({ ...p, companyId: e.target.value, departmentId: '' }))} id="user-company" disabled={!form.organizationId}>
                  <option value="">None</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-control" value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} id="user-dept" disabled={!form.companyId}>
                  <option value="">None</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              {user && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))} id="user-status">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            {/* Leave Allocation / Annual Quota Section */}
            <div style={{ marginTop: 8, padding: '14px 16px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                📅 Annual Leave Quota Allocation (Days)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Paid Leave (PL)</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    className="form-control"
                    value={form.paidLeaves}
                    onChange={e => setForm(p => ({ ...p, paidLeaves: e.target.value }))}
                    placeholder="12"
                    id="user-paid-leaves"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Casual Leave (CL)</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    className="form-control"
                    value={form.casualLeaves}
                    onChange={e => setForm(p => ({ ...p, casualLeaves: e.target.value }))}
                    placeholder="10"
                    id="user-casual-leaves"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Sick Leave (SL)</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    className="form-control"
                    value={form.sickLeaves}
                    onChange={e => setForm(p => ({ ...p, sickLeaves: e.target.value }))}
                    placeholder="8"
                    id="user-sick-leaves"
                  />
                </div>
              </div>
            </div>

            {/* Salary & Attendance Policy Configuration */}
            <div style={{ marginTop: 12, padding: '14px 16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                💵 Salary & Leave Policy Configuration
              </div>
              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className="form-control"
                    value={form.baseSalary}
                    onChange={e => setForm(p => ({ ...p, baseSalary: e.target.value }))}
                    placeholder="e.g. 25000"
                    id="user-base-salary"
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Used for daily wage & absent deduction calculations.
                  </small>
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Monthly Paid Leave Limit (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    className="form-control"
                    value={form.monthlyLeaveQuota}
                    onChange={e => setForm(p => ({ ...p, monthlyLeaveQuota: e.target.value }))}
                    placeholder="1"
                    id="user-monthly-quota"
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Leaves exceeding this quota in a month become Loss of Pay (LOP).
                  </small>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Reporting Manager / Approver (Same Organization)</label>
                <select
                  className="form-control"
                  value={form.managerId}
                  onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}
                  id="user-manager"
                >
                  <option value="">No Direct Manager (Super Admin / Direct Org Admin)</option>
                  {managers.filter(m => !user || m.id !== user.id).map(m => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} ({m.role?.name || 'User'})
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  Leave and Attendance correction requests will be routed to this manager.
                </small>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="user-save-btn">
              {loading ? <div className="spinner spinner-sm" /> : null}
              {user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---- Users List Page ---- */
const UsersPage = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const LIMIT = 10;

  const canCreate = hasPermission('uam', 'users-list', 'canCreate');
  const canEdit = hasPermission('uam', 'users-list', 'canEdit');
  const canDelete = hasPermission('uam', 'users-list', 'canDelete');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/uam/users?page=${page}&limit=${LIMIT}&search=${search}`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = (user) => {
    setDeleteUser(user);
  };

  const executeDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/uam/users/${deleteUser.id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
      setDeleteUser(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppLayout title="User Management">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage system users and their access</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowModal(true); }} id="add-user-btn">
            <RiAddLine /> Add User
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-bar" style={{ minWidth: 200, maxWidth: 360, flex: '1 1 auto' }}>
            <div className="input-wrapper" style={{ width: '100%' }}>
              <RiSearchLine className="input-icon" />
              <input
                className="form-control"
                placeholder="Search users..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: '100%' }}
                id="user-search"
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total: {total}</span>
            <button className="btn btn-icon" onClick={fetchUsers} title="Refresh">
              <RiRefreshLine />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>👥</div>
            <h3>No users found</h3>
            <p>Create your first user to get started</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table table-sticky-actions">
              <thead>
                <tr>
                  <th style={{ minWidth: 190 }}>User</th>
                  <th style={{ minWidth: 105 }}>Role</th>
                  <th style={{ minWidth: 110 }}>Organization</th>
                  <th style={{ minWidth: 105 }}>Department</th>
                  <th style={{ minWidth: 135 }}>Reporting Manager</th>
                  <th style={{ minWidth: 125 }}>Salary & Policy</th>
                  <th style={{ minWidth: 165 }}>Leave Quota</th>
                  <th style={{ minWidth: 95 }}>Status</th>
                  {(canEdit || canDelete) && <th style={{ minWidth: 90, textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm">
                          {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {u.name}
                            {u.isSuperAdmin && <span style={{ marginLeft: 6, color: 'var(--accent)', fontSize: '0.75rem' }}>⭐ Super</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-accent">
                        {u.role?.name || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.organization?.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      <div>{u.department?.name || '—'}</div>
                      {u.headedDepartments && u.headedDepartments.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {u.headedDepartments.map(hd => (
                            <span
                              key={hd.id}
                              title={`Head of Department: ${hd.name}`}
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#d97706',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.28)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}
                            >
                              👑 Head: {hd.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {u.manager ? (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', background: 'rgba(99, 102, 241, 0.08)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                          👤 {u.manager.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Direct / None</span>
                      )}
                    </td>
                    <td>
                      {u.baseSalary ? (
                        <div>
                          <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>₹{Number(u.baseSalary).toLocaleString()}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.monthlyLeaveQuota ?? 1} free lv/mo</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Not set</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 6, padding: '2px 6px', fontSize: '0.72rem', fontWeight: 700 }} title="Paid Leave Quota">
                          PL: {u.paidLeaves ?? 12}
                        </span>
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '2px 6px', fontSize: '0.72rem', fontWeight: 700 }} title="Casual Leave Quota">
                          CL: {u.casualLeaves ?? 10}
                        </span>
                        <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '2px 6px', fontSize: '0.72rem', fontWeight: 700 }} title="Sick Leave Quota">
                          SL: {u.sickLeaves ?? 8}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                          {canEdit && !u.isSuperAdmin && (
                            <button className="btn btn-icon btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }} title="Edit" id={`edit-user-${u.id}`}>
                              <RiPencilLine />
                            </button>
                          )}
                          {canDelete && !u.isSuperAdmin && (
                            <button className="btn btn-icon btn-sm" onClick={() => handleDelete(u)} title="Delete" style={{ color: 'var(--danger)' }} id={`delete-user-${u.id}`}>
                              <RiDeleteBinLine />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
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
        <UserModal
          user={editUser}
          onClose={() => { setShowModal(false); setEditUser(null); }}
          onSaved={() => { setShowModal(false); setEditUser(null); fetchUsers(); }}
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteUser?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteUser(null)}
        loading={deleteLoading}
      />
    </AppLayout>
  );
};

export default UsersPage;
