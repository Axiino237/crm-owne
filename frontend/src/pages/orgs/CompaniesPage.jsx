import { useState, useEffect, useCallback } from 'react';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiSearchLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

const CompanyModal = ({ company, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: company?.name || '', code: company?.code || '',
    organizationId: company?.organization?.id || '',
    description: company?.description || '', address: company?.address || '',
    phone: company?.phone || '', email: company?.email || '',
    website: company?.website || '', isActive: company?.isActive ?? true
  });
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/organizations/all').then(r => setOrgs(r.data.organizations || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (company) { await api.put(`/companies/${company.id}`, { ...form, organizationId: form.organizationId }); toast.success('Company updated!'); }
      else { await api.post('/companies', form); toast.success('Company created!'); }
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    setLoading(false);
  };

  const f = (field) => e => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3 className="modal-title">{company ? 'Edit Company' : 'Create Company'}</h3>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Organization *</label>
              <select className="form-control" value={form.organizationId} onChange={f('organizationId')} required disabled={!!company} id="company-org">
                <option value="">Select Organization</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input className="form-control" value={form.name} onChange={f('name')} required placeholder="Tech Solutions Ltd" id="company-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={f('description')} placeholder="Brief description..." id="company-desc" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={f('phone')} id="company-phone" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={f('email')} id="company-email" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={form.address} onChange={f('address')} id="company-address" />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" value={form.website} onChange={f('website')} id="company-website" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="company-save-btn">
              {loading ? <div className="spinner spinner-sm" /> : null}
              {company ? 'Update' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [deleteCompany, setDeleteCompany] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const LIMIT = 10;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/companies?page=${page}&limit=${LIMIT}&search=${search}`);
      setCompanies(res.data.companies);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load companies'); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleDelete = (company) => {
    setDeleteCompany(company);
  };

  const executeDelete = async () => {
    if (!deleteCompany) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/companies/${deleteCompany.id}`);
      toast.success('Company deleted');
      fetchCompanies();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Delete failed'); 
    } finally {
      setDeleteLoading(false);
      setDeleteCompany(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppLayout title="Companies">
      <div className="page-header">
        <div>
          <h1 className="page-title">Companies</h1>
          <p className="page-subtitle">Manage companies within your organizations</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditCompany(null); setShowModal(true); }} id="add-company-btn">
          <RiAddLine /> Add Company
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="input-wrapper">
            <RiSearchLine className="input-icon" />
            <input className="form-control" placeholder="Search companies..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260 }} id="company-search" />
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : companies.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🏭</div>
            <h3>No companies yet</h3>
            <p>Add a company under an organization</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Code</th>
                  <th>Organization</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      {c.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.description}</div>}
                    </td>
                    <td><code style={{ color: 'var(--success)' }}>{c.code}</code></td>
                    <td><span className="badge badge-warning">{c.organization?.name}</span></td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {c.email && <div>{c.email}</div>}
                      {c.phone && <div>{c.phone}</div>}
                    </td>
                    <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-icon btn-sm" onClick={() => { setEditCompany(c); setShowModal(true); }} id={`edit-co-${c.id}`}><RiPencilLine /></button>
                        <button className="btn btn-icon btn-sm" onClick={() => handleDelete(c)} style={{ color: 'var(--danger)' }} id={`delete-co-${c.id}`}><RiDeleteBinLine /></button>
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
        <CompanyModal company={editCompany} onClose={() => { setShowModal(false); setEditCompany(null); }} onSaved={() => { setShowModal(false); setEditCompany(null); fetchCompanies(); }} />
      )}

      <ConfirmModal 
        isOpen={!!deleteCompany}
        title="Delete Company"
        message={`Are you sure you want to delete company "${deleteCompany?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteCompany(null)}
        loading={deleteLoading}
      />
    </AppLayout>
  );
};

export default CompaniesPage;
