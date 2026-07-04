import { useState, useEffect, useCallback } from 'react';
import {
  RiCheckboxCircleLine, RiSearchLine, RiRefreshLine, RiEyeLine,
  RiUserHeartLine, RiCalendarLine, RiMoneyDollarBoxLine, RiCloseLine,
  RiEditLine, RiSaveLine, RiWallet3Line, RiCopperCoinLine, RiUserReceivedLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

const ClosedSalesPage = () => {
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // View & Edit Modal states
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [editForm, setEditForm] = useState({ value: '', paidAmount: '', vendorPaidAmount: '', notes: '', designStatus: 'pending' });
  const [saving, setSaving] = useState(false);

  const canEdit = hasPermission('closed_sales', 'closed-sales-list', 'canEdit');

  const fetchClosedSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/closed-sales?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
      if (res.data.success) {
        setLeads(res.data.leads || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      toast.error('Failed to load closed sales data');
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchClosedSales();
  }, [fetchClosedSales]);

  // Aggregate values
  const totalValue = leads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0);
  const totalPaid = leads.reduce((sum, l) => sum + (parseFloat(l.paidAmount) || 0), 0);
  const totalVendor = leads.reduce((sum, l) => sum + (parseFloat(l.vendorPaidAmount) || 0), 0);
  const totalBalance = totalValue - totalPaid;

  const totalPages = Math.ceil(total / limit) || 1;

  const handleEditClick = (lead) => {
    setEditLead(lead);
    setEditForm({
      value: lead.value || '',
      paidAmount: lead.paidAmount || '',
      vendorPaidAmount: lead.vendorPaidAmount || '',
      notes: lead.notes || '',
      designStatus: lead.designStatus || 'pending'
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/leads/${editLead.id}`, {
        value: parseFloat(editForm.value) || 0,
        paidAmount: parseFloat(editForm.paidAmount) || 0,
        vendorPaidAmount: parseFloat(editForm.vendorPaidAmount) || 0,
        notes: editForm.notes,
        designStatus: editForm.designStatus
      });
      if (res.data.success) {
        toast.success('Sales financial details updated successfully!');
        setEditLead(null);
        fetchClosedSales();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update details');
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiCheckboxCircleLine style={{ color: 'var(--success)' }} /> Closed Sales
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Monitor and record won deal payments, outstanding balances, and vendor payouts.
          </p>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
            <RiMoneyDollarBoxLine />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Deal Value</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(totalValue)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
            <RiWallet3Line />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Amount Paid</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>{formatCurrency(totalPaid)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
            <RiCopperCoinLine />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Balance</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>{formatCurrency(totalBalance)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'rgb(245,158,11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
            <RiUserReceivedLine />
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Paid to Vendor</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'rgb(245,158,11)', marginTop: 2 }}>{formatCurrency(totalVendor)}</div>
          </div>
        </div>

      </div>

      {/* Filter and Search */}
      <div className="card" style={{ padding: '12px 16px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <RiSearchLine style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }} />
        <input
          type="text"
          placeholder="Search by caller, company name, remarks..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            width: '100%',
            fontSize: '0.875rem'
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
            <RiCloseLine />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-secondary)' }}>Loading closed sales...</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              No closed sales found.
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Deal Details</th>
                      <th>Company Name</th>
                      <th style={{ textAlign: 'right' }}>Value</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ textAlign: 'right' }}>Vendor Payout</th>
                      <th>Caller</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => {
                      const val = parseFloat(lead.value) || 0;
                      const paid = parseFloat(lead.paidAmount) || 0;
                      const bal = val - paid;
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                {lead.name ? lead.name.charAt(0).toUpperCase() : lead.companyName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name || 'N/A'}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lead.phone || 'No Phone'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.companyName}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(lead.value)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                            {formatCurrency(lead.paidAmount)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: bal > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {formatCurrency(bal)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'rgb(245,158,11)' }}>
                            {formatCurrency(lead.vendorPaidAmount)}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                              {lead.assignee?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setViewLead(lead)}
                                style={{ padding: '4px 8px' }}
                              >
                                <RiEyeLine />
                              </button>
                              {canEdit && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => handleEditClick(lead)}
                                  style={{ padding: '4px 8px', color: 'var(--accent)' }}
                                >
                                  <RiEditLine />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} deals
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Details View Modal */}
      {viewLead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative' }}>
            <button
              onClick={() => setViewLead(null)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem'
              }}
            >
              <RiCloseLine />
            </button>

            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiUserHeartLine style={{ color: 'var(--success)' }} /> Deal Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Lead Name</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{viewLead.name || 'N/A'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Company Name</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{viewLead.companyName}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{viewLead.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{viewLead.email || '—'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Deal Value</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(viewLead.value)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Amount Paid</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(viewLead.paidAmount)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Balance</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency((parseFloat(viewLead.value) || 0) - (parseFloat(viewLead.paidAmount) || 0))}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Vendor Payout</div>
                  <div style={{ fontSize: '0.875rem', color: 'rgb(245,158,11)', fontWeight: 700 }}>{formatCurrency(viewLead.vendorPaidAmount)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Design Status</div>
                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: viewLead.designStatus === 'completed' ? 'var(--success)' : viewLead.designStatus === 'change' ? 'var(--danger)' : 'var(--warning)',
                    marginTop: 2,
                    textTransform: 'capitalize'
                  }}>
                    {viewLead.designStatus || 'Pending'} Design
                  </div>
                </div>
              </div>

              {viewLead.notes && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sales Remarks</div>
                  <div style={{
                    background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8,
                    fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid var(--border)',
                    marginTop: 4, whiteSpace: 'pre-wrap'
                  }}>
                    {viewLead.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Financial Details Modal */}
      {editLead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 24, position: 'relative' }}>
            <button
              type="button"
              onClick={() => setEditLead(null)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem'
              }}
            >
              <RiCloseLine />
            </button>

            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiEditLine style={{ color: 'var(--accent)' }} /> Edit Deal Financials
            </h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Deal Value (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={editForm.value}
                    onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))}
                    required
                    placeholder="Total deal value"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Paid Amount (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={editForm.paidAmount}
                    onChange={e => setEditForm(p => ({ ...p, paidAmount: e.target.value }))}
                    placeholder="Amount paid by client"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Paid to Vendor (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={editForm.vendorPaidAmount}
                    onChange={e => setEditForm(p => ({ ...p, vendorPaidAmount: e.target.value }))}
                    placeholder="Amount paid to vendor/partner"
                  />
                </div>


                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Remarks / Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Update sales notes..."
                    style={{ resize: 'none' }}
                  />
                </div>

              </div>

              <div className="modal-footer" style={{ padding: 0, border: 'none', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditLead(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ClosedSalesPage;
