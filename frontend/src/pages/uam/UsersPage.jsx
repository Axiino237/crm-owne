import { useState, useEffect, useCallback } from 'react';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiSearchLine, RiRefreshLine, RiUserLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';



/* ---- User Form Modal ---- */
const UserModal = ({ user, onClose, onSaved }) => {
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
  });
  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
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
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{user ? 'Edit User' : 'Create New User'}</h3>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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
          <div className="search-bar">
            <div className="input-wrapper">
              <RiSearchLine className="input-icon" />
              <input
                className="form-control"
                placeholder="Search users..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 260 }}
                id="user-search"
              />
            </div>
          </div>
          <button className="btn btn-icon" onClick={fetchUsers} title="Refresh">
            <RiRefreshLine />
          </button>
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
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Organization</th>
                  <th>Company</th>
                  <th>Department</th>
                  <th>Status</th>
                  {(canEdit || canDelete) && <th>Actions</th>}
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
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.company?.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.department?.name || '—'}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div className="flex gap-2">
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
