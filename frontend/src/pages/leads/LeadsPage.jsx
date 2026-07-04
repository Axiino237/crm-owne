import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RiUserAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine,
  RiRefreshLine, RiCloseLine, RiSaveLine, RiPhoneLine,
  RiMailLine, RiMoneyDollarBoxLine, RiFilterLine,
  RiUpload2Line, RiDownloadLine, RiCheckboxLine, RiCheckboxBlankLine,
  RiDeleteBin5Line, RiFileExcelLine, RiCheckboxMultipleLine, RiEyeLine, RiDraftLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Status config
const STATUS_CONFIG = {
  new:       { label: 'New',       cls: 'badge-info',    dot: '#06b6d4' },
  contacted: { label: 'Contacted', cls: 'badge-warning', dot: '#f59e0b' },
  qualified: { label: 'Qualified', cls: 'badge-accent',  dot: '#818cf8' },
  lost:      { label: 'Lost',      cls: 'badge-danger',  dot: '#ef4444' },
  converted: { label: 'Converted', cls: 'badge-success', dot: '#10b981' },
};

const SOURCE_LABELS = {
  website: 'Website', referral: 'Referral', social_media: 'Social Media',
  cold_call: 'Cold Call', email: 'Email', other: 'Other'
};

const EMPTY_FORM = {
  name: '', companyName: '', email: '', phone: '',
  status: 'new', source: 'other', value: '', notes: '', assignedTo: '',
  designation: '', sourceType: '', sourceName: '', address: '',
  sourceMode: '', lastContactedDate: '', nextFollowUp: '', alternatePhone: ''
};

// ── Move to Design Form ───────────────────────────────────────────────────────
const MoveToDesignModal = ({ lead, onClose, onDone }) => {
  const [form, setForm] = useState({
    companyName: lead?.companyName || lead?.name || '',
    website: '',
    exhibitionName: '',
    stallNo: '',
    hallNo: '',
    stallSize: '',
    sidesOpen: '',
    receptionCounter: '',
    roundTableBarStool: '',
    closedMeetingRoom: '',
    productDisplayPodiums: '',
    productNature: '',
    productsCount: '',
    postersRequired: '',
    brochureStand: '',
    pantryStorageArea: '',
    plasmaTV: '',
    flooringType: '',
    otherInfo: '',
    colorScheme: '',
    approxBudget: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return toast.error('Company Name is required');
    setSaving(true);
    try {
      const fd = new FormData();
      if (lead?.id) fd.append('leadId', lead.id);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (imageFile) fd.append('referenceImage', imageFile);
      await api.post('/designs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Moved to Design team successfully!');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit design order');
    }
    setSaving(false);
  };

  const inputStyle = { width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' };

  const Row = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>{children}</div>;
  const Field = ({ label, k, type = 'text', placeholder }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} placeholder={placeholder || ''} value={form[k]} onChange={e => set(k, e.target.value)} style={inputStyle} />
    </div>
  );
  const SelectField = ({ label, k, options }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={form[k]} onChange={e => set(k, e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              🎨 Move to Design Team
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Fill in the stall design requirements. Auto-filled from lead data where available.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Section 1: Client Info */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Client Information</div>
          <Row>
            <Field label="Company Name *" k="companyName" placeholder="Required" />
            <Field label="Website" k="website" placeholder="https://..." />
          </Row>
          <Row>
            <Field label="Exhibition Name" k="exhibitionName" placeholder="e.g. MEDICALL 2026" />
            <div />
          </Row>

          {/* Section 2: Stall Info */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 8 }}>Requirements for Stall Design</div>
          <Row>
            <Field label="Stall No." k="stallNo" />
            <Field label="Hall No." k="hallNo" />
          </Row>
          <Row>
            <Field label="Stall Size" k="stallSize" placeholder="e.g. 6m x 3m" />
            <Field label="No. of Sides Open" k="sidesOpen" placeholder="e.g. 3 sides open" />
          </Row>
          <Row>
            <SelectField label="Reception Counter (y/n)" k="receptionCounter" options={['y', 'n']} />
            <Field label="Round Table + Bar Stool (y/n + count)" k="roundTableBarStool" placeholder="e.g. y, 2" />
          </Row>
          <Row>
            <Field label="Closed Meeting Room (y/n + count)" k="closedMeetingRoom" placeholder="e.g. n" />
            <SelectField label="Product Display Podiums (y/n)" k="productDisplayPodiums" options={['y', 'n', 'L-shaped podium', 'Other']} />
          </Row>

          {/* Products */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Nature / Specifications of Products to be Displayed</label>
            <textarea value={form.productNature} onChange={e => set('productNature', e.target.value)} rows={2} placeholder="Describe products..." style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
          </div>
          <Row>
            <Field label="No. of Products / Dimensions" k="productsCount" placeholder="e.g. 10 items, 30x40cm each" />
            <SelectField label="Posters Required" k="postersRequired" options={['Flex', 'Backlit', 'Sunboard', 'None']} />
          </Row>
          <Row>
            <SelectField label="Brochure Stand (y/n)" k="brochureStand" options={['y', 'n']} />
            <SelectField label="Pantry / Storage Area (y/n)" k="pantryStorageArea" options={['y', 'n']} />
          </Row>
          <Row>
            <SelectField label="Plasma TV (y/n)" k="plasmaTV" options={['y', 'n']} />
            <SelectField label="Flooring Type" k="flooringType" options={['Carpet', 'Wooden Finish', 'Raised Platform', 'Other']} />
          </Row>
          <Row>
            <Field label="Color Scheme" k="colorScheme" placeholder="e.g. Logo colors" />
            <Field label="Approx. Budget (Rs. Lacs)" k="approxBudget" type="number" placeholder="e.g. 2.5" />
          </Row>

          {/* Other info */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Any Other Information</label>
            <textarea value={form.otherInfo} onChange={e => set('otherInfo', e.target.value)} rows={2} placeholder="Any additional requirements..." style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
          </div>

          {/* Reference Image */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Reference Image (optional)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-secondary)', border: `2px dashed ${imageFile ? 'var(--success)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0] || null)} />
              <RiDraftLine style={{ fontSize: '1.4rem', color: imageFile ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: imageFile ? 'var(--success)' : 'var(--text-secondary)' }}>
                {imageFile ? `📎 ${imageFile.name}` : 'Click to upload reference image or PDF (max 10MB)'}
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160 }}>
              {saving ? <><div className="spinner spinner-sm" /> Submitting...</> : <><RiDraftLine /> Send to Design Team</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const formatCurrency = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

// ── Lead Modal ──────────────────────────────────────────────────────────────
const LeadModal = ({ lead, users, onClose, onSaved }) => {
  const [form, setForm] = useState(lead ? {
    name: lead.name || '', companyName: lead.companyName || '', email: lead.email || '',
    phone: lead.phone || '', status: lead.status || 'new', source: lead.source || 'other',
    value: lead.value || '', notes: lead.notes || '', assignedTo: lead.assignedTo || '',
    designation: lead.designation || '', sourceType: lead.sourceType || '', sourceName: lead.sourceName || '',
    address: lead.address || '', sourceMode: lead.sourceMode || '',
    lastContactedDate: lead.lastContactedDate || '', nextFollowUp: lead.nextFollowUp || '',
    alternatePhone: lead.alternatePhone || ''
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() && !form.companyName.trim()) return toast.error('Either Contact Person or Company Name is required');
    setSaving(true);
    try {
      const payload = { ...form, value: parseFloat(form.value) || 0, assignedTo: form.assignedTo || null };
      if (lead) {
        await api.put(`/leads/${lead.id}`, payload);
        toast.success('Lead updated!');
      } else {
        await api.post('/leads', payload);
        toast.success('Lead created!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lead');
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
            {lead ? '✏️ Edit Lead' : '➕ New Lead'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Contact Person *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" required /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Company Name</label>
              <input style={inputStyle} value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Company name" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Phone Number</label>
              <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Alternate Phone</label>
              <input style={inputStyle} value={form.alternatePhone} onChange={e => set('alternatePhone', e.target.value)} placeholder="Alternate number" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Designation</label>
              <input style={inputStyle} value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Director, Manager" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Status</label>
              <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Source Type</label>
              <input style={inputStyle} value={form.sourceType} onChange={e => set('sourceType', e.target.value)} placeholder="e.g. Social Media, Cold Call" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Source Name</label>
              <input style={inputStyle} value={form.sourceName} onChange={e => set('sourceName', e.target.value)} placeholder="e.g. Google Ads, Referral" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Source Mode</label>
              <input style={inputStyle} value={form.sourceMode} onChange={e => set('sourceMode', e.target.value)} placeholder="e.g. Online, Offline" /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Last Contacted Date</label>
              <input style={inputStyle} type="date" value={form.lastContactedDate} onChange={e => set('lastContactedDate', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Next Follow Up</label>
              <input style={inputStyle} type="date" value={form.nextFollowUp} onChange={e => set('nextFollowUp', e.target.value)} /></div>
            <div><label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Assign To</label>
              <select style={inputStyle} value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                <option value="">— Unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}</select></div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Address</label>
              <textarea style={{ ...inputStyle, minHeight: 44, resize: 'vertical' }} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full Address" />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any remarks or notes..." />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
              {saving ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── View Lead Modal ─────────────────────────────────────────────────────────
const ViewLeadModal = ({ lead, onClose }) => {
  if (!lead) return null;
  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>🎯 Lead Profile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}><RiCloseLine /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.875rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Contact Person</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{lead.name}</div>
          </div>
          {lead.designation && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Designation</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.designation}</div>
            </div>
          )}
          {lead.companyName && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Company Name</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.companyName}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Email</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Phone</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.phone || '—'}</div>
            </div>
          </div>
          {lead.alternatePhone && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Alternate Phone</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.alternatePhone}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Source Type</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.sourceType || SOURCE_LABELS[lead.source] || lead.source || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Source Name / Mode</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.sourceName ? `${lead.sourceName} ${lead.sourceMode ? `(${lead.sourceMode})` : ''}` : '—'}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Last Contacted</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.lastContactedDate || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Next Follow Up</div>
              <div style={{ color: 'var(--warning)', fontWeight: 700 }}>{lead.nextFollowUp || '—'}</div>
            </div>
          </div>
          {lead.address && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Address</div>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{lead.address}</div>
            </div>
          )}
          {lead.notes && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Remarks / Notes</div>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{lead.notes}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 6 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Status</div>
              <span className={`badge ${st.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                {st.label}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Assigned To</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.assignee?.name || 'Unassigned'}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Bulk Upload Modal ───────────────────────────────────────────────────────
const BulkUploadModal = ({ onClose, onDone }) => {
  const fileInputRef = useRef();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { toast.error('Only CSV or Excel files are allowed'); return; }
    setFile(f);
    setResult(null);
  };

  const downloadTemplate = () => {
    window.open('/api/leads/csv-template', '_blank');
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a CSV or Excel file');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/leads/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.results);
      toast.success(res.data.message);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RiUpload2Line style={{ color: 'var(--accent)' }} /> Bulk Upload Leads
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Download template */}
          <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2 }}>CSV Template</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>name, companyName, email, phone, status, source, value, notes</div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={downloadTemplate}>
              <RiDownloadLine /> Download
            </button>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
              borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(129,140,248,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'transparent',
              transition: 'all 0.2s', marginBottom: 20
            }}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <RiFileExcelLine style={{ fontSize: '2.5rem', color: 'var(--success)', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
              </>
            ) : (
              <>
                <RiUpload2Line style={{ fontSize: '2.5rem', color: 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Drop CSV or Excel file here</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or click to browse · Max 5MB</div>
              </>
            )}
          </div>

          {/* Upload result */}
          {result && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{result.created}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>✅ Created</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{result.skipped}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>❌ Skipped</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 12, maxHeight: 140, overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>Errors:</div>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                      Row {e.row}{e.name ? ` (${e.name})` : ''}: {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
            {!result && (
              <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <><div className="spinner spinner-sm" /> Uploading...</> : <><RiUpload2Line /> Upload File</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const LeadsPage = () => {
  const { hasPermission } = useAuth();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selection state for bulk delete
  const [selected, setSelected] = useState(new Set());

  const [modalLead, setModalLead] = useState(null);
  const [viewLead, setViewLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, lead: null, bulk: false });
  const [designLead, setDesignLead] = useState(null); // lead being moved to design

  const canCreate = hasPermission('leads', 'leads-list', 'canCreate');
  const canEdit   = hasPermission('leads', 'leads-list', 'canEdit');
  const canDelete = hasPermission('leads', 'leads-list', 'canDelete');
  const canDesign = hasPermission('design', 'design-list', 'canCreate');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setSelected(new Set()); // clear selection on reload
    try {
      const params = new URLSearchParams({ page, limit, search });
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      const res = await api.get(`/leads?${params}`);
      setLeads(res.data.leads || []);
      setTotal(res.data.total || 0);
      setStatusCounts(res.data.statusCounts || {});
    } catch { toast.error('Failed to load leads'); }
    setLoading(false);
  }, [page, search, statusFilter, sourceFilter]);

  const fetchUsers = useCallback(async () => {
    try { const res = await api.get('/uam/users?limit=100'); setUsers(res.data.users || []); } catch {}
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => { setModalLead(null); setShowModal(true); };
  const openEdit = (lead) => { setModalLead(lead); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setModalLead(null); };
  const afterSave = () => { closeModal(); fetchLeads(); };

  // Row selection
  const isAllSelected = leads.length > 0 && leads.every(l => selected.has(l.id));
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  // Single delete
  const handleDelete = async () => {
    try {
      await api.delete(`/leads/${confirm.lead.id}`);
      toast.success('Lead deleted');
      setConfirm({ open: false, lead: null, bulk: false });
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    try {
      const res = await api.delete('/leads/bulk-delete', { data: { ids: [...selected] } });
      toast.success(res.data.message);
      setConfirm({ open: false, lead: null, bulk: false });
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Bulk delete failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            🎯 Leads
          </h1>
          <p className="page-subtitle">Manage business leads and sales pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={fetchLeads} disabled={loading} title="Refresh">
            <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          {canCreate && (
            <button className="btn btn-outline" onClick={() => setShowUpload(true)} id="bulk-upload-btn" title="Bulk Upload CSV">
              <RiUpload2Line /> Bulk Upload
            </button>
          )}
          {canCreate && (
            <button className="btn btn-primary" onClick={openAdd} id="add-lead-btn">
              <RiUserAddLine /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Bulk selection toolbar */}
      {selected.size > 0 && canDelete && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          animation: 'fadeIn 0.2s ease'
        }}>
          <RiCheckboxMultipleLine style={{ color: 'var(--danger)', fontSize: '1.1rem' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {selected.size} lead{selected.size !== 1 && 's'} selected
          </span>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setConfirm({ open: true, lead: null, bulk: true })}
            id="bulk-delete-btn"
          >
            <RiDeleteBin5Line /> Delete Selected
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setSelected(new Set())}
            style={{ marginLeft: 'auto' }}
          >
            <RiCloseLine /> Deselect All
          </button>
        </div>
      )}

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          // Use server-side count (across all pages) not just current page rows
          const count = statusCounts[key] || 0;
          return (
            <button key={key} onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1); }} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 600,
              border: `1px solid ${cfg.dot}40`, cursor: 'pointer',
              background: statusFilter === key ? `${cfg.dot}20` : 'transparent',
              color: cfg.dot, transition: 'all 0.15s'
            }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: cfg.dot, marginRight: 6, verticalAlign: 'middle' }} />
              {cfg.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} style={{ padding: '6px 10px', borderRadius: 20, fontSize: '0.75rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RiCloseLine style={{ verticalAlign: 'middle' }} /> Clear
          </button>
        )}
      </div>

      {/* Search + Filter bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
          <RiSearchLine className="search-icon" />
          <input className="search-input" type="text" placeholder="Search leads by name, company, email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RiFilterLine style={{ color: 'var(--text-muted)' }} />
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {total} lead{total !== 1 && 's'} found
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-secondary)' }}>Loading leads...</div>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No leads found</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              {search || statusFilter || sourceFilter ? 'Try changing your filters' : 'Start by adding your first lead'}
            </div>
            {canCreate && !search && !statusFilter && !sourceFilter && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setShowUpload(true)}><RiUpload2Line /> Bulk Upload</button>
                <button className="btn btn-primary" onClick={openAdd}><RiUserAddLine /> Add Lead</button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  {canDelete && (
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAllSelected ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                        {isAllSelected ? <RiCheckboxLine /> : <RiCheckboxBlankLine />}
                      </button>
                    </th>
                  )}
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Follow Up</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  const isChecked = selected.has(lead.id);
                  return (
                    <tr key={lead.id} style={{ background: isChecked ? 'rgba(239,68,68,0.04)' : undefined }}>
                      {canDelete && (
                        <td style={{ textAlign: 'center' }}>
                          <button onClick={() => toggleOne(lead.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isChecked ? 'var(--danger)' : 'var(--text-muted)', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                            {isChecked ? <RiCheckboxLine style={{ color: 'var(--danger)' }} /> : <RiCheckboxBlankLine />}
                          </button>
                        </td>
                      )}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${st.dot}20`, border: `1.5px solid ${st.dot}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: st.dot }}>
                            {(lead.name || lead.companyName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {lead.name || lead.companyName || 'Unnamed Lead'}
                            </div>
                            {lead.name && lead.companyName && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {lead.designation ? `${lead.designation} @ ` : ''}{lead.companyName}
                              </div>
                            )}
                            {(!lead.name || !lead.companyName) && lead.designation && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lead.designation}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>
                          {lead.email && <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><RiMailLine />{lead.email}</div>}
                          {lead.phone && <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><RiPhoneLine />{lead.phone}</div>}
                          {lead.alternatePhone && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>Alt: {lead.alternatePhone}</div>}
                          {!lead.email && !lead.phone && !lead.alternatePhone && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{lead.sourceType || SOURCE_LABELS[lead.source] || lead.source}</div>
                          {lead.sourceName && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lead.sourceName}</div>}
                          {lead.sourceMode && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({lead.sourceMode})</div>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem' }}>
                          {lead.lastContactedDate && <div style={{ color: 'var(--text-secondary)' }}>Last: {lead.lastContactedDate}</div>}
                          {lead.nextFollowUp && <div style={{ color: 'var(--warning)', fontWeight: 600 }}>Next: {lead.nextFollowUp}</div>}
                          {!lead.lastContactedDate && !lead.nextFollowUp && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${st.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td>
                        {lead.assignee
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{lead.assignee.name?.charAt(0)}</div>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{lead.assignee.name}</span>
                            </div>
                          : <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Unassigned</span>
                        }
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setViewLead(lead)} title="View Profile" id={`view-lead-${lead.id}`}><RiEyeLine /></button>
                          {canEdit && <button className="btn btn-sm btn-outline" onClick={() => openEdit(lead)} title="Edit" id={`edit-lead-${lead.id}`}><RiEditLine /></button>}
                          {canDesign && (
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--accent)', border: '1px solid rgba(129,140,248,0.35)' }}
                              onClick={() => setDesignLead(lead)}
                              title="Move to Design"
                              id={`design-lead-${lead.id}`}
                            >
                              <RiDraftLine />
                            </button>
                          )}
                          {canDelete && <button className="btn btn-sm btn-danger" onClick={() => setConfirm({ open: true, lead, bulk: false })} title="Delete" id={`delete-lead-${lead.id}`}><RiDeleteBinLine /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages} · {total} total</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && <LeadModal lead={modalLead} users={users} onClose={closeModal} onSaved={afterSave} />}
      {showUpload && <BulkUploadModal onClose={() => setShowUpload(false)} onDone={fetchLeads} />}
      {viewLead && <ViewLeadModal lead={viewLead} onClose={() => setViewLead(null)} />}
      {designLead && <MoveToDesignModal lead={designLead} onClose={() => setDesignLead(null)} onDone={fetchLeads} />}

      {/* Confirm Delete (single or bulk) */}
      <ConfirmModal
        isOpen={confirm.open}
        title={confirm.bulk ? `Delete ${selected.size} Leads` : 'Delete Lead'}
        message={confirm.bulk
          ? `Are you sure you want to delete ${selected.size} selected lead${selected.size !== 1 ? 's' : ''}? This action cannot be undone.`
          : `Are you sure you want to delete "${confirm.lead?.name}"? This action cannot be undone.`
        }
        onConfirm={confirm.bulk ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirm({ open: false, lead: null, bulk: false })}
        confirmText={confirm.bulk ? `Delete ${selected.size} Leads` : 'Delete'}
        type="danger"
      />
    </AppLayout>
  );
};

export default LeadsPage;
