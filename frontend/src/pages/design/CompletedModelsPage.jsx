import { useState, useEffect, useCallback } from 'react';
import {
  RiCheckDoubleLine, RiRefreshLine, RiEyeLine, RiBuilding2Line,
  RiCalendarLine, RiFileImageLine, RiCloseLine, RiDownloadLine,
  RiTimeLine, RiPaletteLine, RiUser3Line, RiPhoneLine, RiMailLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// ── Detail Drawer ─────────────────────────────────────────────────────────────
const ModelDetailDrawer = ({ order, onClose }) => {
  if (!order) return null;
  const modelUrl = order.completedModelUrl
    ? `http://localhost:5000${order.completedModelUrl}`
    : null;
  const isImage = modelUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(order.completedModelUrl);

  const Field = ({ label, value, icon }) =>
    value ? (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
          {icon} {label}
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
      </div>
    ) : null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }} />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520,
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-24px 0 64px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.2rem' }}>
                <RiCheckDoubleLine />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{order.companyName}</h2>
                <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, marginTop: 2 }}>
                  ✅ Completed
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', marginTop: 4 }}>
            <RiCloseLine />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
          {/* Completed Model Preview */}
          {modelUrl && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                🎨 Final Design Model
              </div>
              {isImage ? (
                <img src={modelUrl} alt="Design Model"
                  style={{ width: '100%', borderRadius: 12, border: '1.5px solid rgba(16,185,129,0.3)', objectFit: 'contain', maxHeight: 300 }} />
              ) : (
                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <RiFileImageLine style={{ fontSize: '2rem', color: '#10b981', display: 'block', margin: '0 auto 8px' }} />
                  <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 4, fontSize: '0.875rem' }}>Design File Available</div>
                </div>
              )}
              <a href={modelUrl} download target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, padding: '9px 16px', background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', textDecoration: 'none', fontWeight: 700, fontSize: '0.83rem' }}>
                <RiDownloadLine /> Download Model File
              </a>
            </div>
          )}

          {/* Timestamps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, padding: 16, background: 'rgba(129,140,248,0.05)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <RiCalendarLine /> Submitted
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {new Date(order.createdAt).toLocaleDateString('en-IN')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <RiCheckDoubleLine /> Completed
              </div>
              <div style={{ fontSize: '0.83rem', color: '#10b981', fontWeight: 600 }}>
                {order.completedAt ? new Date(order.completedAt).toLocaleDateString('en-IN') : '—'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {order.completedAt ? new Date(order.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
              </div>
            </div>
          </div>

          {/* Stall Details */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Stall Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Exhibition" value={order.exhibitionName} icon={<RiCalendarLine />} />
              <Field label="Stall No." value={order.stallNo} icon={<RiPaletteLine />} />
              <Field label="Hall No." value={order.hallNo} icon={<RiBuilding2Line />} />
              <Field label="Stall Size" value={order.stallSize} icon={<RiBuilding2Line />} />
              <Field label="Sides Open" value={order.sidesOpen} />
              <Field label="Flooring Type" value={order.flooringType} />
              <Field label="Color Scheme" value={order.colorScheme} />
              <Field label="Budget (Lacs)" value={order.approxBudget ? `₹${order.approxBudget} L` : null} />
            </div>
          </div>

          {/* Furniture Details */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Stall Furniture & Fixtures</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <Field label="Reception Counter" value={order.receptionCounter} />
              <Field label="Round Table + Bar Stool" value={order.roundTableBarStool} />
              <Field label="Closed Meeting Room" value={order.closedMeetingRoom} />
              <Field label="Product Display Podiums" value={order.productDisplayPodiums} />
              <Field label="Plasma TV" value={order.plasmaTV} />
              <Field label="Posters Required" value={order.postersRequired} />
              <Field label="Brochure Stand" value={order.brochureStand} />
              <Field label="Pantry / Storage Area" value={order.pantryStorageArea} />
            </div>
          </div>

          {/* Lead / Client Info */}
          {order.lead && (
            <div style={{ padding: 16, background: 'rgba(129,140,248,0.06)', borderRadius: 12, border: '1px solid rgba(129,140,248,0.2)', marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Client / Lead Info</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                <Field label="Lead Name" value={order.lead.name || order.lead.companyName} icon={<RiUser3Line />} />
                <Field label="Phone" value={order.lead.phone} icon={<RiPhoneLine />} />
                <Field label="Email" value={order.lead.email} icon={<RiMailLine />} />
              </div>
            </div>
          )}

          {/* Designer Info */}
          {order.designer && (
            <div style={{ padding: 16, background: 'rgba(16,185,129,0.04)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Designer</div>
              <Field label="Name" value={order.designer.name} icon={<RiUser3Line />} />
              <Field label="Email" value={order.designer.email} icon={<RiMailLine />} />
            </div>
          )}

          {order.otherInfo && (
            <div style={{ marginTop: 16 }}>
              <Field label="Other Information" value={order.otherInfo} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const CompletedModelsPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/designs/completed-models');
      setOrders(res.data.orders || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load completed designs');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o =>
    !search ||
    o.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    o.exhibitionName?.toLowerCase().includes(search.toLowerCase()) ||
    o.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.lead?.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'rgba(16,185,129,0.15)', padding: '6px 10px', borderRadius: 10, color: '#10b981' }}>✅</span>
            Completed Design Models
          </h1>
          <p className="page-subtitle">View all completed stall designs with model files</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={fetchOrders} disabled={loading} title="Refresh">
            <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#10b981' }}>
            <RiCheckDoubleLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{orders.length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Completed</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#818cf8' }}>
            <RiFileImageLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{orders.filter(o => o.completedModelUrl).length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>With Model File</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#f59e0b' }}>
            <RiTimeLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {orders.filter(o => {
                if (!o.completedAt) return false;
                const now = new Date();
                const d = new Date(o.completedAt);
                return (now - d) < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>This Week</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by company, exhibition or client name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 420, padding: '10px 16px',
            background: 'var(--bg-input, rgba(255,255,255,0.04))',
            border: '1.5px solid var(--border)', borderRadius: 10,
            color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Grid of completed model cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-secondary)' }}>Loading completed designs...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search ? 'No results found' : 'No completed designs yet'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {search ? 'Try a different search term.' : 'Designs marked as completed will appear here.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {filtered.map(order => {
            const modelUrl = order.completedModelUrl ? `http://localhost:5000${order.completedModelUrl}` : null;
            const isImage = modelUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(order.completedModelUrl);

            return (
              <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onClick={() => setSelectedOrder(order)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
                {/* Model Thumbnail */}
                <div style={{ height: 180, background: 'rgba(16,185,129,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                  {isImage ? (
                    <img src={modelUrl} alt="Design" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : modelUrl ? (
                    <div style={{ textAlign: 'center' }}>
                      <RiFileImageLine style={{ fontSize: '3rem', color: '#10b981', display: 'block', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Design File</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <RiPaletteLine style={{ fontSize: '3rem', color: 'var(--text-muted)', display: 'block', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No model file</div>
                    </div>
                  )}
                  {/* Completed badge */}
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(16,185,129,0.9)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>
                    ✅ Done
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: 4 }}>
                    {order.companyName}
                  </div>
                  {order.exhibitionName && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <RiCalendarLine /> {order.exhibitionName}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {order.stallSize && (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(129,140,248,0.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                        📐 {order.stallSize}
                      </span>
                    )}
                    {order.sidesOpen && (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
                        🚪 {order.sidesOpen} sides
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Completed</div>
                      <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                        {order.completedAt ? new Date(order.completedAt).toLocaleDateString('en-IN') : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Designer</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {order.designer?.name || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.015)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {order.lead ? (order.lead.name || order.lead.companyName) : 'No lead linked'}
                  </span>
                  <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); setSelectedOrder(order); }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <RiEyeLine /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOrder && (
        <ModelDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </AppLayout>
  );
};

export default CompletedModelsPage;
