import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RiPaletteLine, RiTimeLine, RiCheckDoubleLine, RiRefreshLine,
  RiEyeLine, RiCloseLine, RiBuilding2Line,
  RiGlobalLine, RiCalendarLine, RiMoneyDollarCircleLine,
  RiUploadCloud2Line, RiFileImageLine, RiCheckLine, RiTimerLine,
  RiDownloadLine, RiImageLine, RiFileTextLine, RiDeleteBinLine,
  RiVideoLine, RiFolderZipLine, RiAddLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  getFileUrl,
  getRequirementDocDownloadUrl,
  getCompletedModelDownloadUrl,
  getCompletedFileInfo,
  formatBytes
} from '../../utils/fileUrl';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_progress: { label: 'In Progress', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  completed:   { label: 'Completed',   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

// ── View Detail Modal ────────────────────────────────────────────────────────
const ViewDesignModal = ({ order, onClose }) => {
  const imgUrl = getFileUrl(order.requirementDocUrl || order.referenceImageUrl);
  const reqDocDownloadUrl = getRequirementDocDownloadUrl(order, false);
  const completedFiles = Array.isArray(order.completedFiles) && order.completedFiles.length > 0
    ? order.completedFiles
    : (order.completedModelUrl ? [{ url: order.completedModelUrl, name: 'Completed Model' }] : []);

  const Field = ({ label, value }) =>
    value ? (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{value}</div>
      </div>
    ) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🎨 Design Order Details</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>
              Submitted by {order.submitter?.name || '—'} · {new Date(order.createdAt).toLocaleDateString('en-IN')}
              {order.completedAt && <> · ✅ Completed {new Date(order.completedAt).toLocaleString('en-IN')}</>}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
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

          {/* Requirement Document from Sales */}
          {imgUrl && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Requirement Document / Reference</div>
                <a
                  href={reqDocDownloadUrl}
                  download={order.requirementDocName || 'requirement-doc'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 8, color: 'var(--accent)', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  <RiDownloadLine /> Download
                </a>
              </div>
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(imgUrl) && (
                <img src={imgUrl} alt="Reference" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 10, border: '1px solid var(--border)', objectFit: 'contain' }} />
              )}
            </div>
          )}

          {/* Completed Model Files (Supports Multiple Files: MP4, CDR, ZIP, GLB, etc.) */}
          {completedFiles.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RiCheckDoubleLine /> Completed Design Files ({completedFiles.length})
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completedFiles.map((f, idx) => {
                  const info = getCompletedFileInfo(f.name, f.ext);
                  const fileDlUrl = getCompletedModelDownloadUrl(order, false, idx);
                  const fileViewUrl = getCompletedModelDownloadUrl(order, true, idx);
                  const isImg = info.isImage || /\.(jpe?g|png|webp|gif)$/i.test(f.url || f.name);
                  const isVid = info.isVideo || /\.mp4$/i.test(f.url || f.name);

                  return (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: (isImg || isVid) ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: info.bg, color: info.color, border: `1px solid ${info.color}40`, flexShrink: 0 }}>
                            {info.label}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.name || `Model File #${idx + 1}`}
                            </div>
                            {f.size && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {formatBytes(f.size)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {(isImg || isVid || info.isPdf) && (
                            <a
                              href={fileViewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: 7, color: 'var(--accent)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              <RiEyeLine /> View
                            </a>
                          )}
                          <a
                            href={fileDlUrl}
                            download={f.name || 'model-file'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 7, color: '#10b981', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            <RiDownloadLine /> Download
                          </a>
                        </div>
                      </div>

                      {/* Video Player for MP4 */}
                      {isVid && (
                        <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                          <video
                            controls
                            playsInline
                            preload="metadata"
                            style={{ width: '100%', maxHeight: 260, display: 'block' }}
                            src={getFileUrl(f.url)}
                          />
                        </div>
                      )}

                      {/* Image Preview for PNG / JPG / WEBP */}
                      {isImg && (
                        <div style={{ marginTop: 8 }}>
                          <img
                            src={getFileUrl(f.url)}
                            alt={f.name || 'Preview'}
                            style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Complete with Model Upload Modal ─────────────────────────────────────────
const CompleteModelModal = ({ order, onClose, onCompleted }) => {
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileRef = useRef();

  const handleAddFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    setFiles(prev => {
      const existing = new Set(prev.map(f => `${f.name}_${f.size}`));
      const fresh = incoming.filter(f => !existing.has(`${f.name}_${f.size}`));
      return [...prev, ...fresh];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please select or drop at least one design file first!');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append('models', f);
      });
      if (files[0]) formData.append('model', files[0]);

      const res = await api.post(`/designs/${order.id}/complete-model`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        }
      });
      toast.success(res.data.message || 'Design marked as completed with model uploaded!');
      onCompleted(res.data.order);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  const completedTime = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1.5px solid rgba(16,185,129,0.35)', borderRadius: 20, width: '100%', maxWidth: 580, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.2rem' }}>
                <RiCheckDoubleLine />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Mark as Completed</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Review details & upload final design model</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}><RiCloseLine /></button>
        </div>

        {/* Scrollable Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>

          {/* Company Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px 14px', background: 'rgba(129,140,248,0.07)', borderRadius: 10, border: '1px solid rgba(129,140,248,0.15)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '1.1rem', flexShrink: 0 }}>
              <RiBuilding2Line />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{order.companyName}</div>
              {order.website && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><RiGlobalLine />{order.website}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Submitted</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          {/* Section: Stall Info */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              📐 Stall Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 12px' }}>
              {[
                { label: 'Exhibition', value: order.exhibitionName },
                { label: 'Stall No.', value: order.stallNo },
                { label: 'Hall No.', value: order.hallNo },
                { label: 'Stall Size', value: order.stallSize },
                { label: 'Sides Open', value: order.sidesOpen },
                { label: 'Budget', value: order.approxBudget ? `₹${order.approxBudget} Lacs` : null },
                { label: 'Flooring Type', value: order.flooringType },
                { label: 'Color Scheme', value: order.colorScheme },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Furniture */}
          {(order.receptionCounter || order.roundTableBarStool || order.closedMeetingRoom || order.productDisplayPodiums || order.plasmaTV || order.postersRequired || order.brochureStand || order.pantryStorageArea) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                🪑 Furniture & Fixtures
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 12px' }}>
                {[
                  { label: 'Reception Counter', value: order.receptionCounter },
                  { label: 'Round Table + Bar Stool', value: order.roundTableBarStool },
                  { label: 'Closed Meeting Room', value: order.closedMeetingRoom },
                  { label: 'Product Podiums', value: order.productDisplayPodiums },
                  { label: 'Plasma TV', value: order.plasmaTV },
                  { label: 'Posters Required', value: order.postersRequired },
                  { label: 'Brochure Stand', value: order.brochureStand },
                  { label: 'Pantry / Storage', value: order.pantryStorageArea },
                ].filter(f => f.value).map(({ label, value }) => (
                  <div key={label} style={{ padding: '8px 10px', background: 'rgba(245,158,11,0.04)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Product Details */}
          {(order.productNature || order.productsCount || order.otherInfo) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>📦 Product & Other Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {order.productNature && (
                  <div style={{ padding: '8px 10px', background: 'rgba(16,185,129,0.04)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Nature of Products</div>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)' }}>{order.productNature}</div>
                  </div>
                )}
                {order.productsCount && (
                  <div style={{ padding: '8px 10px', background: 'rgba(16,185,129,0.04)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>No. of Products / Dimensions</div>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)' }}>{order.productsCount}</div>
                  </div>
                )}
                {order.otherInfo && (
                  <div style={{ padding: '8px 10px', background: 'rgba(16,185,129,0.04)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Other Information</div>
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-primary)' }}>{order.otherInfo}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Submitted By + Lead */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {order.submitter && (
              <div style={{ padding: '10px 12px', background: 'rgba(129,140,248,0.05)', borderRadius: 10, border: '1px solid rgba(129,140,248,0.15)' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>👤 Submitted By</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{order.submitter.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{order.submitter.email}</div>
              </div>
            )}
            {order.lead && (
              <div style={{ padding: '10px 12px', background: 'rgba(16,185,129,0.04)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
                <div style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>🔗 Lead / Client</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{order.lead.name || order.lead.companyName}</div>
                {order.lead.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{order.lead.phone}</div>}
                {order.lead.email && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{order.lead.email}</div>}
              </div>
            )}
          </div>

          {/* Completion Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(245,158,11,0.07)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', marginBottom: 14 }}>
            <RiTimerLine style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Completion Time (auto-recorded)</div>
              <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700 }}>{completedTime}</div>
            </div>
          </div>

          {/* Multi-File Upload Area */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Upload Final Design Files <span style={{ color: '#ef4444' }}>* (Multi-file allowed)</span>
              </div>
              {files.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                  {files.length} {files.length === 1 ? 'file' : 'files'} ({formatBytes(totalBytes)})
                </span>
              )}
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#10b981' : files.length > 0 ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
                borderRadius: 14,
                padding: files.length > 0 ? '16px 18px' : '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(16,185,129,0.08)' : files.length > 0 ? 'rgba(16,185,129,0.03)' : 'transparent',
                transition: 'all 0.2s',
                marginBottom: 12
              }}>
              <input
                type="file"
                ref={fileRef}
                style={{ display: 'none' }}
                multiple
                accept=".zip,.rar,.7z,.cdr,.png,.jpg,.jpeg,.webp,.mp4,.pdf,.glb,.gltf,.obj,.fbx,.stl,.dwg"
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <RiUploadCloud2Line style={{ fontSize: '2.2rem', color: files.length > 0 ? '#10b981' : 'var(--text-muted)', display: 'block', margin: '0 auto 8px' }} />
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>
                {files.length > 0 ? 'Click or drop more files to add' : 'Drop design files here or click to browse'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                Max 250MB per file · Upload multiple files together
              </div>

              {/* Supported Format Chips */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { ext: 'ZIP', color: '#eab308' },
                  { ext: 'CDR', color: '#10b981' },
                  { ext: 'PNG', color: '#a855f7' },
                  { ext: 'JPG/JPEG', color: '#a855f7' },
                  { ext: 'MP4', color: '#ef4444' },
                  { ext: 'PDF', color: '#f43f5e' },
                  { ext: 'GLB/GLTF', color: '#3b82f6' }
                ].map(b => (
                  <span
                    key={b.ext}
                    style={{
                      fontSize: '0.66rem',
                      padding: '2px 7px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${b.color}40`,
                      color: b.color,
                      fontWeight: 700
                    }}
                  >
                    {b.ext}
                  </span>
                ))}
              </div>
            </div>

            {/* List of Chosen Files with Delete Action */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', marginBottom: 10, paddingRight: 4 }}>
                {files.map((f, idx) => {
                  const info = getCompletedFileInfo(f.name);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: info.bg,
                            color: info.color,
                            border: `1px solid ${info.color}40`,
                            flexShrink: 0
                          }}
                        >
                          {info.label}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {formatBytes(f.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        title="Remove file"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '1rem',
                          borderRadius: 4
                        }}
                      >
                        <RiDeleteBinLine />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions — sticky footer */}
        <div style={{ padding: '14px 24px 18px', display: 'flex', gap: 10, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-outline" style={{ flex: 1 }} disabled={uploading}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            style={{
              flex: 2, padding: '10px 20px', 
              background: files.length > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border)',
              color: files.length > 0 ? '#fff' : 'var(--text-muted)', 
              border: 'none', borderRadius: 10, fontWeight: 700, 
              cursor: files.length > 0 && !uploading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.9rem',
              boxShadow: files.length > 0 ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
              opacity: uploading ? 0.7 : 1, transition: 'all 0.2s'
            }}>
            {uploading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                {uploadProgress ? `Uploading (${uploadProgress}%)...` : 'Uploading files...'}
              </>
            ) : (
              <>
                <RiCheckDoubleLine /> Mark as Completed ({files.length} {files.length === 1 ? 'file' : 'files'})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const MyProjectsPage = () => {
  const { hasPermission } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState(null);
  const [completeOrder, setCompleteOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const canEdit = hasPermission('design', 'my-projects-list', 'canEdit');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/designs/my');
      setOrders(res.data.orders || []);
    } catch {
      toast.error('Failed to load my projects');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (order, newStatus) => {
    // If selecting "completed", open the upload modal
    if (newStatus === 'completed') {
      setCompleteOrder(order);
      return;
    }
    setStatusUpdating(order.id);
    try {
      await api.put(`/designs/${order.id}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
    setStatusUpdating(null);
  };

  const handleCompleted = (updatedOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
  };

  // Stats summaries
  const pendingCount    = orders.filter(o => o.status === 'pending').length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const completedCount  = orders.filter(o => o.status === 'completed').length;

  return (
    <AppLayout title="My Projects">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            🎨 My Projects
          </h1>
          <p className="page-subtitle">Manage stall design projects accepted by you</p>
        </div>
        <button className="btn btn-outline" onClick={fetchOrders} disabled={loading} title="Refresh">
          <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Stats summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: 'var(--accent)' }}>
            <RiPaletteLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{orders.length}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Assigned</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#f59e0b' }}>
            <RiTimeLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingCount + inProgressCount}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Pending to Finish</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#818cf8' }}>
            <RiTimerLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{inProgressCount}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>In Progress</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: '#10b981' }}>
            <RiCheckDoubleLine />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{completedCount}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Completed</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-secondary)' }}>Loading projects...</div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🎨</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No projects accepted yet</div>
            <div style={{ color: 'var(--text-secondary)' }}>Go to the &quot;Design&quot; tab and click &quot;Get Project&quot; on any design order.</div>
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
                  <th>Date</th>
                  <th>Completed At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
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
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td>
                        {order.completedAt ? (
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700 }}>
                              {new Date(order.completedAt).toLocaleDateString('en-IN')}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(order.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {canEdit ? (
                          <select
                            value={order.status}
                            onChange={e => handleStatusChange(order, e.target.value)}
                            disabled={statusUpdating === order.id}
                            style={{
                              background: st.bg, color: st.color, border: `1.5px solid ${st.color}50`,
                              borderRadius: 8, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700,
                              cursor: 'pointer', outline: 'none', minWidth: 110
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        ) : (
                          <span style={{ background: st.bg, color: st.color, border: `1.5px solid ${st.color}50`, borderRadius: 8, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                            {st.label}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setViewOrder(order)} title="View Details">
                            <RiEyeLine />
                          </button>
                          {(order.requirementDocUrl || order.referenceImageUrl) && (
                            <a
                              href={getRequirementDocDownloadUrl(order, false)}
                              download={order.requirementDocName || 'requirement-document'}
                              title={`Download Requirement Document (${order.requirementDocName || 'Attachment'})`}
                              className="btn btn-sm"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <RiFileTextLine />
                            </a>
                          )}
                          {order.status === 'completed' && order.completedModelUrl && (
                            <a
                              href={getCompletedModelDownloadUrl(order, false)}
                              download
                              title="Download Completed Model"
                              className="btn btn-sm"
                              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <RiFileImageLine />
                            </a>
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

      {viewOrder && <ViewDesignModal order={viewOrder} onClose={() => setViewOrder(null)} />}
      {completeOrder && (
        <CompleteModelModal
          order={completeOrder}
          onClose={() => setCompleteOrder(null)}
          onCompleted={handleCompleted}
        />
      )}
    </AppLayout>
  );
};

export default MyProjectsPage;
