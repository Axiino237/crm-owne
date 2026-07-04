import { useState, useEffect, useCallback } from 'react';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiKey2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';



/* ---- Role Modal ---- */
const RoleModal = ({ role, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: role?.name || '',
    code: role?.code || '',
    description: role?.description || '',
    level: role?.level || 'user',
    isActive: role?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (role) {
        await api.put(`/roles/${role.id}`, form);
        toast.success('Role updated!');
      } else {
        await api.post('/roles', form);
        toast.success('Role created!');
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
          <h3 className="modal-title">{role ? 'Edit Role' : 'Create New Role'}</h3>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Role Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Sales Manager" id="role-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." id="role-desc" />
            </div>
            {/* Removed Level and Status selection fields as requested */}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="role-save-btn">
              {loading ? <div className="spinner spinner-sm" /> : null}
              {role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---- Roles List Page ---- */
const RolesPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = hasPermission('roles', 'roles-list', 'canCreate');
  const canEdit = hasPermission('roles', 'roles-list', 'canEdit');
  const canDelete = hasPermission('roles', 'roles-list', 'canDelete');
  const canViewPerms = hasPermission('permissions', 'permissions-list', 'canView');

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data.roles);
    } catch { toast.error('Failed to load roles'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleDelete = (role) => {
    if (role.isSystem) { toast.error('System roles cannot be deleted'); return; }
    setDeleteRole(role);
  };

  const executeDelete = async () => {
    if (!deleteRole) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/roles/${deleteRole.id}`);
      toast.success('Role deleted');
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading(false);
      setDeleteRole(null);
    }
  };

  return (
    <AppLayout title="Role Management">
      <div className="page-header">
        <div>
          <h1 className="page-title">Roles</h1>
          <p className="page-subtitle">Define roles and assign them to users</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setEditRole(null); setShowModal(true); }} id="add-role-btn">
            <RiAddLine /> Create Role
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : roles.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
            <h3>No roles found</h3>
            <p>Create your first role to get started</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{r.description}</div>}
                    </td>
                    <td><code style={{ color: 'var(--accent)', fontSize: '0.8125rem' }}>{r.code}</code></td>
                    <td>
                      {r.isSystem
                        ? <span className="badge badge-warning">System</span>
                        : <span className="badge badge-info">Custom</span>}
                    </td>
                    <td><span className={`badge ${r.isActive ? 'badge-success' : 'badge-danger'}`}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        {canViewPerms && (
                          <button className="btn btn-icon btn-sm" onClick={() => navigate(`/uam/permissions/${r.id}`)} title="Manage Permissions" id={`perms-${r.id}`}>
                            <RiKey2Line />
                          </button>
                        )}
                        {canEdit && !r.isSystem && (
                          <button className="btn btn-icon btn-sm" onClick={() => { setEditRole(r); setShowModal(true); }} title="Edit" id={`edit-role-${r.id}`}>
                            <RiPencilLine />
                          </button>
                        )}
                        {canDelete && !r.isSystem && (
                          <button className="btn btn-icon btn-sm" onClick={() => handleDelete(r)} title="Delete" style={{ color: 'var(--danger)' }} id={`delete-role-${r.id}`}>
                            <RiDeleteBinLine />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <RoleModal
          role={editRole}
          onClose={() => { setShowModal(false); setEditRole(null); }}
          onSaved={() => { setShowModal(false); setEditRole(null); fetchRoles(); }}
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteRole}
        title="Delete Role"
        message={`Are you sure you want to delete role "${deleteRole?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteRole(null)}
        loading={deleteLoading}
      />
    </AppLayout>
  );
};

export default RolesPage;
