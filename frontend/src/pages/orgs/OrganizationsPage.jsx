import { useState, useEffect, useCallback } from 'react';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiBuildingLine, RiSearchLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

const OrgModal = ({ org, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: org?.name || '', code: org?.code || '',
    description: org?.description || '', address: org?.address || '',
    phone: org?.phone || '', email: org?.email || '',
    website: org?.website || '', isActive: org?.isActive ?? true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (org) { await api.put(`/organizations/${org.id}`, form); toast.success('Organization updated!'); }
      else { await api.post('/organizations', form); toast.success('Organization created!'); }
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    setLoading(false);
  };

  const f = (field) => e => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3 className="modal-title">{org ? 'Edit Organization' : 'Create Organization'}</h3>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Organization Name *</label>
              <input className="form-control" value={form.name} onChange={f('name')} required placeholder="Acme Corp" id="org-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={f('description')} placeholder="Brief description..." id="org-desc" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={f('phone')} placeholder="+91 9999999999" id="org-phone" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={f('email')} placeholder="info@company.com" id="org-email" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={form.address} onChange={f('address')} placeholder="123 Main St..." id="org-address" />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" value={form.website} onChange={f('website')} placeholder="https://..." id="org-website" />
              </div>
            </div>
            {org && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))} id="org-status">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="org-save-btn">
              {loading ? <div className="spinner spinner-sm" /> : null}
              {org ? 'Update' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OrganizationsPage = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [deleteOrg, setDeleteOrg] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const LIMIT = 10;

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/organizations?page=${page}&limit=${LIMIT}&search=${search}`);
      setOrgs(res.data.organizations);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load organizations'); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleDelete = (org) => {
    setDeleteOrg(org);
  };

  const executeDelete = async () => {
    if (!deleteOrg) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/organizations/${deleteOrg.id}`);
      toast.success('Organization deleted');
      fetchOrgs();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Delete failed'); 
    } finally {
      setDeleteLoading(false);
      setDeleteOrg(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppLayout title="Organizations">
      <div className="page-header">
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage your group of companies (Super Admin only)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditOrg(null); setShowModal(true); }} id="add-org-btn">
          <RiAddLine /> Create Organization
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="input-wrapper">
            <RiSearchLine className="input-icon" />
            <input className="form-control" placeholder="Search organizations..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260 }} id="org-search" />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : orgs.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏢</div>
            <h3>No organizations yet</h3>
            <p>Create your first organization to get started</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr key={org.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🏢</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{org.name}</div>
                          {org.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{org.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td><code style={{ color: 'var(--accent)' }}>{org.code}</code></td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {org.email && <div>{org.email}</div>}
                        {org.phone && <div>{org.phone}</div>}
                      </div>
                    </td>
                    <td><span className={`badge ${org.isActive ? 'badge-success' : 'badge-danger'}`}>{org.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{new Date(org.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-icon btn-sm" onClick={() => { setEditOrg(org); setShowModal(true); }} title="Edit" id={`edit-org-${org.id}`}><RiPencilLine /></button>
                        <button className="btn btn-icon btn-sm" onClick={() => handleDelete(org)} title="Delete" style={{ color: 'var(--danger)' }} id={`delete-org-${org.id}`}><RiDeleteBinLine /></button>
                      </div>
                    </td>
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
        <OrgModal org={editOrg} onClose={() => { setShowModal(false); setEditOrg(null); }} onSaved={() => { setShowModal(false); setEditOrg(null); fetchOrgs(); }} />
      )}

      <ConfirmModal 
        isOpen={!!deleteOrg}
        title="Delete Organization"
        message={`Are you sure you want to delete organization "${deleteOrg?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteOrg(null)}
        loading={deleteLoading}
      />
    </AppLayout>
  );
};

export default OrganizationsPage;
