import { useState, useEffect, useCallback } from 'react';
import {
  RiPaletteLine, RiTimeLine, RiCheckDoubleLine, RiRefreshLine,
  RiEyeLine, RiDeleteBinLine, RiImageLine, RiCloseLine, RiBuilding2Line,
  RiGlobalLine, RiCalendarLine, RiMoneyDollarCircleLine, RiUserLine, RiDownloadLine,
  RiFileTextLine, RiFilePdfLine, RiFileExcelLine, RiFileWordLine, RiUploadCloud2Line,
  RiAlertLine, RiFileCheckLine, RiAttachmentLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getFileUrl, getRequirementDocDownloadUrl } from '../../utils/fileUrl';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_progress: { label: 'In Progress', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  completed:   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

// Helper to determine document type and appropriate icon/color
const getDocTypeInfo = (url = '', name = '') => {
  const target = (name || url || '').toLowerCase();
  if (/\.pdf$/i.test(target)) {
    return { type: 'PDF Document', icon: <RiFilePdfLine style={{ color: '#ef4444' }} />, color: '#ef4444' };
  }
  if (/\.(xlsx|xls|csv)$/i.test(target)) {
    return { type: 'Excel Spreadsheet / CSV', icon: <RiFileExcelLine style={{ color: '#10b981' }} />, color: '#10b981' };
  }
  if (/\.(docx|doc)$/i.test(target)) {
    return { type: 'Word Document', icon: <RiFileWordLine style={{ color: '#3b82f6' }} />, color: '#3b82f6' };
  }
  if (/\.(jpe?g|png|gif|webp)$/i.test(target)) {
    return { type: 'Reference Image', icon: <RiImageLine style={{ color: '#8b5cf6' }} />, color: '#8b5cf6' };
  }
  return { type: 'Requirement Document', icon: <RiFileTextLine style={{ color: 'var(--accent)' }} />, color: 'var(--accent)' };
};

// ── View Detail Modal ────────────────────────────────────────────────────────
const ViewDesignModal = ({ order, onClose, onUploadClick }) => {
  const hasDoc = !!(order.requirementDocUrl || order.referenceImageUrl);
  const docUrl = hasDoc ? getFileUrl(order.requirementDocUrl || order.referenceImageUrl) : null;
  const downloadUrl = hasDoc ? getRequirementDocDownloadUrl(order, false) : null;
  const viewUrl = hasDoc ? getRequirementDocDownloadUrl(order, true) : null;

  const docInfo = getDocTypeInfo(order.requirementDocUrl || order.referenceImageUrl, order.requirementDocName);
  const isImage = /\.(jpe?g|png|gif|webp)$/i.test(docUrl || '');

  const Field = ({ label, value }) =>
    value ? (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{value}</div>
      </div>
    ) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🎨 Design Order Details</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Submitted by {order.submitter?.name || '—'} · {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <div className="form-grid-2" style={{ gap: '0 28px' }}>
            <Field label="Company Name" value={order.companyName} />
            <Field label="Website" value={order.website} />
            <Field label="Exhibition Name" value={order.exhibitionName} />
            <Field label="Stall No." value={order.stallNo} />
            <Field label="Hall No." value={order.hallNo} />
            <Field label="Stall Size" value={order.stallSize} />
            <Field label="No. of Sides Open" value={order.sidesOpen} />
            <Field label="Reception Counter" value={order.receptionCounter} />
            <Field label="Round Table + Bar Stool" value={order.roundTableBarStool} />
            <Field label="Closed Meeting Room" value={order.closedMeetingRoom} />
            <Field label="Product Display Podiums" value={order.productDisplayPodiums} />
            <Field label="Posters Required" value={order.postersRequired} />
            <Field label="Brochure Stand" value={order.brochureStand} />
            <Field label="Pantry / Storage Area" value={order.pantryStorageArea} />
            <Field label="Plasma TV" value={order.plasmaTV} />
            <Field label="Flooring Type" value={order.flooringType} />
            <Field label="Color Scheme" value={order.colorScheme} />
            <Field label="Approx. Budget (Rs. Lacs)" value={order.approxBudget} />
          </div>
          {order.productNature && <Field label="Nature / Specifications of Products" value={order.productNature} />}
          {order.productsCount && <Field label="No. of Products / Dimensions" value={order.productsCount} />}
          {order.otherInfo && <Field label="Any Other Information" value={order.otherInfo} />}

          {/* Requirement Document Section */}
          <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RiFileTextLine style={{ color: 'var(--accent)' }} /> Requirement Document (PDF, Excel, CSV, Doc)
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => { onClose(); onUploadClick(order); }}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RiUploadCloud2Line /> {docUrl ? 'Replace Document' : 'Upload Document'}
              </button>
            </div>

            {docUrl ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: '1.75rem', display: 'flex' }}>
                      {docInfo.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {order.requirementDocName || 'Requirement Document'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: docInfo.color, fontWeight: 600 }}>
                        {docInfo.type}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a
                      href={viewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RiEyeLine /> View
                    </a>
                    <a
                      href={downloadUrl}
                      download={order.requirementDocName || 'requirement-document'}
                      className="btn btn-sm btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RiDownloadLine /> Download
                    </a>
                  </div>
                </div>

                {isImage && (
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <img src={docUrl} alt="Requirement Reference" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                <div style={{ marginBottom: 6, color: '#ef4444', fontWeight: 600 }}>⚠️ No requirement document attached yet.</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Requirment file illama designer assign panna mudiyathu.</div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => { onClose(); onUploadClick(order); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RiUploadCloud2Line /> Upload Requirement Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Dedicated Upload Requirement Modal ──────────────────────────────────────
const UploadRequirementModal = ({ order, onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please choose a requirement file (PDF, Excel, CSV, or Doc)');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('requirementDoc', file);

    try {
      const res = await api.post(`/designs/${order.id}/requirement-doc`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        toast.success('Requirement document uploaded successfully!');
        onUploaded(res.data.order);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', display: 'flex' }}
        >
          <RiCloseLine />
        </button>

        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiUploadCloud2Line style={{ color: 'var(--accent)' }} /> Upload Requirement Document
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
          Upload requirements for <strong>{order.companyName}</strong>. Accepted: PDF, Excel (.xlsx/.xls), CSV, Word (.docx/.doc), or Images.
        </p>

        {order.requirementDocUrl && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.78rem' }}>
            <span style={{ fontWeight: 700, color: '#10b981' }}>Current File:</span> {order.requirementDocName || 'Attachment'}
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 12,
              padding: '28px 16px',
              textAlign: 'center',
              background: 'var(--bg-secondary)',
              cursor: 'pointer',
              marginBottom: 20
            }}
            onClick={() => document.getElementById('requirement-file-input').click()}
          >
            <RiUploadCloud2Line style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: 8 }} />
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {file ? file.name : 'Click to select requirement file'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              PDF, Excel, CSV, Word Doc, or Image (Max 30MB)
            </div>
            {file && (
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 6, fontWeight: 700 }}>
                Selected: {(file.size / 1024).toFixed(1)} KB
              </div>
            )}
            <input
              id="requirement-file-input"
              type="file"
              accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,image/*"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const DesignPage = () => {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState(null);
  const [uploadDocOrder, setUploadDocOrder] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, order: null });

  // Designer Assignment States
  const [designers, setDesigners] = useState([]);
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [selectedDesignerId, setSelectedDesignerId] = useState('');
  const [designerSearch, setDesignerSearch] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignDocFile, setAssignDocFile] = useState(null);
  const [savingAssign, setSavingAssign] = useState(false);

  const canEdit = hasPermission('design', 'design-list', 'canEdit');
  const canDelete = hasPermission('design', 'design-list', 'canDelete');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/designs');
      setOrders(res.data.orders || []);
    } catch {
      toast.error('Failed to load design orders');
    }
    setLoading(false);
  }, []);

  const fetchDesigners = useCallback(async () => {
    try {
      const res = await api.get('/designs/designers');
      setDesigners(res.data.designers || []);
    } catch {
      // Silently ignore if load fails
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDesigners();
  }, [fetchOrders, fetchDesigners]);

  const handleAssignClick = (order) => {
    setAssigningOrder(order);
    setSelectedDesignerId(order.assignedDesignerId || '');
    setDeadline(order.endTime ? new Date(order.endTime).toISOString().slice(0, 16) : '');
    setDesignerSearch('');
    setAssignDocFile(null);
  };

  const handleSaveAssignment = async () => {
    const hasDoc = !!(assigningOrder.requirementDocUrl || assigningOrder.referenceImageUrl || assignDocFile);
    
    // ⛔ Rule: requirment file illama assign panna mudiyathu
    if (selectedDesignerId && !hasDoc) {
      toast.error('Requirment file illama assign panna mudiyathu! Please upload requirement doc (PDF/Excel/CSV/Doc).');
      return;
    }

    setSavingAssign(true);
    try {
      let res;
      if (assignDocFile) {
        const formData = new FormData();
        if (selectedDesignerId) formData.append('designerId', selectedDesignerId);
        if (deadline) formData.append('endTime', deadline);
        formData.append('requirementDoc', assignDocFile);
        res = await api.put(`/designs/${assigningOrder.id}/assign`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.put(`/designs/${assigningOrder.id}/assign`, {
          designerId: selectedDesignerId || null,
          endTime: deadline || null
        });
      }

      if (res.data.success) {
        setOrders(prev => prev.map(o => o.id === assigningOrder.id ? res.data.order : o));
        toast.success('Designer and deadline assigned successfully!');
        setAssigningOrder(null);
        setAssignDocFile(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign designer');
    } finally {
      setSavingAssign(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/designs/${confirm.order.id}`);
      setOrders(prev => prev.filter(o => o.id !== confirm.order.id));
      toast.success('Design order deleted');
    } catch {
      toast.error('Failed to delete');
    }
    setConfirm({ open: false, order: null });
  };

  // Counts
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
              🎨 Design Orders
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Manage stall design requirements from the sales team
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchOrders}><RiRefreshLine /> Refresh</button>
        </div>

        {/* Stat Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Pending', count: pendingCount, icon: <RiTimeLine />, color: '#f59e0b' },
            { label: 'In Progress', count: inProgressCount, icon: <RiPaletteLine />, color: '#818cf8' },
            { label: 'Completed', count: completedCount, icon: <RiCheckDoubleLine />, color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}18`, border: `1.5px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{s.count}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-secondary)' }}>Loading design orders...</div>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🎨</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No design orders yet</div>
              <div style={{ color: 'var(--text-secondary)' }}>Use "Requirement Received" on a lead to create a design order</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Exhibition</th>
                    <th>Stall Info</th>
                    <th>Lead</th>
                    <th>Submitted By</th>
                    <th>Designer</th>
                    <th>Deadline</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const hasDoc = !!(order.requirementDocUrl || order.referenceImageUrl);
                    const docInfo = getDocTypeInfo(order.requirementDocUrl || order.referenceImageUrl, order.requirementDocName);
                    const downloadUrl = hasDoc ? getRequirementDocDownloadUrl(order, false) : null;

                    return (
                      <tr key={order.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(129,140,248,0.15)', border: '1.5px solid rgba(129,140,248,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                              <RiBuilding2Line />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.companyName}</div>
                              {order.website && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><RiGlobalLine />{order.website}</div>}
                              {/* Requirement Doc Status Tag */}
                              {hasDoc ? (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 6px', borderRadius: 6, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                  <RiFileCheckLine /> Req Doc Attached
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 6px', borderRadius: 6, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                  <RiAlertLine /> No Req Doc
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <RiCalendarLine style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            {order.exhibitionName || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {order.stallSize && <div>Size: <strong style={{ color: 'var(--text-primary)' }}>{order.stallSize}</strong></div>}
                            {order.sidesOpen && <div>Sides: {order.sidesOpen}</div>}
                            {order.approxBudget && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <RiMoneyDollarCircleLine style={{ color: 'var(--success)' }} />
                                ₹{order.approxBudget} L
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: order.lead ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {order.lead ? (order.lead.name || order.lead.companyName || 'Lead') : '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {order.submitter?.name || '—'}
                          </span>
                        </td>
                        <td>
                          {canEdit ? (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => handleAssignClick(order)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                border: '1px dashed var(--border)',
                                padding: '4px 8px',
                                fontSize: '0.8rem',
                                color: order.designer ? 'var(--success)' : 'var(--text-secondary)'
                              }}
                            >
                              <RiUserLine /> {order.designer ? order.designer.name : 'Click to Assign'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: order.designer ? 'var(--success)' : 'var(--text-muted)' }}>
                              {order.designer ? order.designer.name : 'Not Taken'}
                            </span>
                          )}
                        </td>
                        <td>
                          {order.endTime ? (
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: new Date(order.endTime) < new Date() && order.status !== 'completed' ? 'var(--danger)' : 'var(--text-primary)'
                            }}>
                              {new Date(order.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* View Details */}
                            <button className="btn btn-sm btn-outline" onClick={() => setViewOrder(order)} title="View Details" id={`view-design-${order.id}`}>
                              <RiEyeLine />
                            </button>

                            {/* Download Requirement Document (if attached) */}
                            {hasDoc && (
                              <a
                                href={downloadUrl}
                                download={order.requirementDocName || 'requirement-document'}
                                className="btn btn-sm btn-outline"
                                title={`Download Requirement Doc (${order.requirementDocName || docInfo.type})`}
                                style={{ display: 'flex', alignItems: 'center', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)' }}
                              >
                                <RiFileTextLine />
                              </a>
                            )}

                            {/* Upload / Replace Requirement Document Button */}
                            {canEdit && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setUploadDocOrder(order)}
                                title={hasDoc ? "Replace Requirement Document" : "Upload Requirement Document (PDF, Excel, CSV, Doc)"}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: hasDoc ? 'var(--text-secondary)' : '#f59e0b',
                                  borderColor: hasDoc ? 'var(--border)' : 'rgba(245,158,11,0.5)',
                                  background: hasDoc ? 'transparent' : 'rgba(245,158,11,0.12)'
                                }}
                              >
                                <RiUploadCloud2Line />
                              </button>
                            )}

                            {canDelete && (
                              <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ open: true, order })} title="Delete" id={`delete-design-${order.id}`}>
                                <RiDeleteBinLine />
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
          )}
        </div>
      </div>

      {viewOrder && (
        <ViewDesignModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onUploadClick={(ord) => setUploadDocOrder(ord)}
        />
      )}

      {uploadDocOrder && (
        <UploadRequirementModal
          order={uploadDocOrder}
          onClose={() => setUploadDocOrder(null)}
          onUploaded={(updated) => {
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
            if (viewOrder && viewOrder.id === updated.id) setViewOrder(updated);
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirm.open}
        title="Delete Design Order"
        message={`Are you sure you want to delete the design order for "${confirm.order?.companyName}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, order: null })}
        confirmText="Delete"
        type="danger"
      />

      {assigningOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 24, position: 'relative' }}>
            <button
              onClick={() => { setAssigningOrder(null); setAssignDocFile(null); }}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', display: 'flex'
              }}
            >
              <RiCloseLine />
            </button>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              👤 Assign Designer & Target Deadline
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Set designer and target completion date for <strong>{assigningOrder.companyName}</strong>.
            </p>

            {/* Requirement Document Section */}
            {(() => {
              const hasExistingDoc = !!(assigningOrder.requirementDocUrl || assigningOrder.referenceImageUrl);
              return (
                <div style={{
                  background: hasExistingDoc ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${hasExistingDoc ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 18
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {hasExistingDoc ? (
                        <RiFileCheckLine style={{ color: '#10b981', fontSize: '1.35rem' }} />
                      ) : (
                        <RiAlertLine style={{ color: '#ef4444', fontSize: '1.35rem' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: hasExistingDoc ? '#10b981' : '#ef4444' }}>
                          {hasExistingDoc ? 'Requirement Document Attached' : 'Requirement Document Required!'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {hasExistingDoc
                            ? (assigningOrder.requirementDocName || 'Requirement Document')
                            : 'Requirment file illama designer assign panna mudiyathu.'
                          }
                        </div>
                      </div>
                    </div>

                    {hasExistingDoc && (
                      <a
                        href={getRequirementDocDownloadUrl(assigningOrder, true)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      >
                        View Doc
                      </a>
                    )}
                  </div>

                  {/* File input (always accessible to upload or replace) */}
                  <div style={{ marginTop: 6 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      {hasExistingDoc ? 'Replace Requirement Doc (Optional):' : 'Upload Requirement Doc (PDF, Excel, CSV, Doc):'}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.txt,image/*"
                      className="form-control"
                      style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                      onChange={e => setAssignDocFile(e.target.files[0])}
                    />
                    {assignDocFile && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
                        ✓ Selected: {assignDocFile.name} ({(assignDocFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Target Deadline */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Target End Time / Deadline</label>
              <input
                type="datetime-local"
                className="form-control"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>

            {/* Designer Selector with Search */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Select Designer</label>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Search designer by name..."
                value={designerSearch}
                onChange={e => setDesignerSearch(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              
              <div style={{
                maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)',
                borderRadius: 8, background: 'var(--bg-secondary)', padding: 4
              }}>
                <div
                  onClick={() => setSelectedDesignerId('')}
                  style={{
                    padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                    background: selectedDesignerId === '' ? 'var(--accent)' : 'transparent',
                    color: selectedDesignerId === '' ? 'white' : 'var(--text-primary)',
                    fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.15s',
                    marginBottom: 2
                  }}
                >
                  Unassigned / None
                </div>
                {designers
                  .filter(d => d.name.toLowerCase().includes(designerSearch.toLowerCase()))
                  .map(d => {
                    const isSelected = selectedDesignerId === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDesignerId(d.id)}
                        style={{
                          padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                          background: isSelected ? 'var(--accent)' : 'transparent',
                          color: isSelected ? 'white' : 'var(--text-primary)',
                          fontSize: '0.85rem', transition: 'all 0.15s',
                          marginBottom: 2, display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{d.name}</span>
                        <span style={{ fontSize: '0.72rem', color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{d.email}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn btn-outline"
                onClick={() => { setAssigningOrder(null); setAssignDocFile(null); }}
                disabled={savingAssign}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAssignment}
                disabled={savingAssign || (selectedDesignerId && !(assigningOrder.requirementDocUrl || assigningOrder.referenceImageUrl || assignDocFile))}
                title={(selectedDesignerId && !(assigningOrder.requirementDocUrl || assigningOrder.referenceImageUrl || assignDocFile)) ? 'Requirment doc upload pannunga' : 'Save Assignment'}
              >
                {savingAssign ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DesignPage;
