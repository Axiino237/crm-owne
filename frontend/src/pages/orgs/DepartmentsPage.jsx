import { useState, useEffect, useCallback } from 'react';
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiSearchLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

const DeptModal = ({ dept, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: dept?.name || '', code: dept?.code || '',
    organizationId: dept?.organization?.id || '',
    companyId: dept?.company?.id || '',
    description: dept?.description || '',
    headId: dept?.head?.id || '',
    isActive: dept?.isActive ?? true
  });
  const [orgs, setOrgs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
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
    if (form.companyId) {
      api.get(`/uam/users?limit=100`).then(r => setUsers(r.data.users || []));
    }
  }, [form.companyId]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (dept) { await api.put(`/departments/${dept.id}`, form); toast.success('Department updated!'); }
      else { await api.post('/departments', form); toast.success('Department created!'); }
      onSaved();
    } catch (err) { setError(err.response?.data?.message || 'Operation failed'); }
    setLoading(false);
  };

  const f = (field) => e => setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3 className="modal-title">{dept ? 'Edit Department' : 'Create Department'}</h3>
          <button className="btn btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</div>}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Organization *</label>
                <select className="form-control" value={form.organizationId} onChange={e => setForm(p => ({ ...p, organizationId: e.target.value, companyId: '' }))} required disabled={!!dept} id="dept-org">
                  <option value="">Select Organization</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Company *</label>
                <select className="form-control" value={form.companyId} onChange={f('companyId')} required disabled={!!dept || !form.organizationId} id="dept-company">
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Department Name *</label>
              <input className="form-control" value={form.name} onChange={f('name')} required placeholder="e.g. Engineering" id="dept-name" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={form.description} onChange={f('description')} placeholder="Brief description..." id="dept-desc" />
            </div>
            <div className="form-group">
              <label className="form-label">Department Head (optional)</label>
              <select className="form-control" value={form.headId} onChange={f('headId')} id="dept-head">
                <option value="">No Head Assigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="dept-save-btn">
              {loading ? <div className="spinner spinner-sm" /> : null}
              {dept ? 'Update' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deleteDept, setDeleteDept] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const LIMIT = 10;

  const fetchDepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/departments?page=${page}&limit=${LIMIT}&search=${search}`);
      setDepartments(res.data.departments);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load departments'); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleDelete = (dept) => {
    setDeleteDept(dept);
  };

  const executeDelete = async () => {
    if (!deleteDept) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/departments/${deleteDept.id}`);
      toast.success('Department deleted');
      fetchDepts();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Delete failed'); 
    } finally {
      setDeleteLoading(false);
      setDeleteDept(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AppLayout title="Departments">
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage departments within companies</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditDept(null); setShowModal(true); }} id="add-dept-btn">
          <RiAddLine /> Add Department
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="input-wrapper">
            <RiSearchLine className="input-icon" />
            <input className="form-control" placeholder="Search departments..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260 }} id="dept-search" />
          </div>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : departments.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🗂️</div>
            <h3>No departments yet</h3>
            <p>Create departments under your companies</p>
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
                  <th>Head</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      {d.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{d.description}</div>}
                    </td>
                    <td><code style={{ color: 'var(--info)' }}>{d.code}</code></td>
                    <td><span className="badge badge-success">{d.company?.name}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{d.organization?.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {d.head ? (
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm">{d.head.name?.slice(0, 2).toUpperCase()}</div>
                          {d.head.name}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td><span className={`badge ${d.isActive ? 'badge-success' : 'badge-danger'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-icon btn-sm" onClick={() => { setEditDept(d); setShowModal(true); }} id={`edit-dept-${d.id}`}><RiPencilLine /></button>
                        <button className="btn btn-icon btn-sm" onClick={() => handleDelete(d)} style={{ color: 'var(--danger)' }} id={`delete-dept-${d.id}`}><RiDeleteBinLine /></button>
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
        <DeptModal dept={editDept} onClose={() => { setShowModal(false); setEditDept(null); }} onSaved={() => { setShowModal(false); setEditDept(null); fetchDepts(); }} />
      )}

      <ConfirmModal 
        isOpen={!!deleteDept}
        title="Delete Department"
        message={`Are you sure you want to delete department "${deleteDept?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteDept(null)}
        loading={deleteLoading}
      />
    </AppLayout>
  );
};

export default DepartmentsPage;
