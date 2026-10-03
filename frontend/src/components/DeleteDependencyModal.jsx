import { useEffect, useState } from 'react';
import {
  RiAlertLine, RiCloseLine, RiBuildingLine, RiBuilding2Line,
  RiGroupLine, RiUserLine, RiDeleteBinLine, RiCheckboxCircleLine,
  RiInformationLine
} from 'react-icons/ri';
import api from '../api/axios';
import toast from 'react-hot-toast';

const DeleteDependencyModal = ({
  isOpen,
  entityType = 'Organization',
  entityId,
  entityName,
  dependencyEndpoint,
  deleteEndpoint,
  onClose,
  onDeleted
}) => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [depData, setDepData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !entityId) {
      setDepData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const checkEndpoint = dependencyEndpoint || `/${entityType.toLowerCase()}s/${entityId}/dependencies`;

    api.get(checkEndpoint)
      .then(res => {
        if (isMounted) {
          setDepData(res.data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to verify dependencies');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, entityId, dependencyEndpoint, entityType]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const endpoint = deleteEndpoint || `/${entityType.toLowerCase()}s/${entityId}`;
      const res = await api.delete(endpoint);
      toast.success(res.data?.message || `${entityType} deleted successfully`);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      toast.error(msg);
      // If error returned mapped details, show them
      if (err.response?.data?.blockReasons) {
        setDepData(prev => ({
          ...prev,
          canDelete: false,
          blockReasons: err.response.data.blockReasons
        }));
      }
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = depData ? depData.canDelete : true;
  const mapped = depData?.mappedItems || {};
  const blockReasons = depData?.blockReasons || [];

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal" style={{ maxWidth: 540, width: '92%' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: canDelete ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: canDelete ? 'var(--danger)' : '#f59e0b',
              fontSize: '1.25rem'
            }}>
              {canDelete ? <RiDeleteBinLine /> : <RiAlertLine />}
            </div>
            <div>
              <h3 className="modal-title" style={{
                fontSize: '1.15rem',
                margin: 0,
                color: canDelete ? 'var(--danger)' : '#f59e0b'
              }}>
                {canDelete ? `Delete ${entityType}` : `Cannot Delete ${entityType}`}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {entityName}
              </p>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} disabled={deleting}>
            <RiCloseLine fontSize="1.25rem" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '18px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Checking dependencies and active mappings...
              </div>
            </div>
          ) : error ? (
            <div style={{
              padding: 14,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          ) : !canDelete ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Warning Notice */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                <RiAlertLine style={{ color: '#f59e0b', fontSize: '1.25rem', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.9rem', marginBottom: 2 }}>
                    This {entityType} is already mapped in the system!
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.45 }}>
                    Before you can delete <strong>"{entityName}"</strong>, you must first delete or reassign the following mapped records:
                  </div>
                </div>
              </div>

              {/* Mapped Dependencies Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto' }}>
                {/* Companies mapped */}
                {mapped.companies && mapped.companies.length > 0 && (
                  <div style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        <RiBuilding2Line style={{ color: 'var(--accent)' }} />
                        <span>Mapped Companies ({mapped.companies.length})</span>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Action Required</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {mapped.companies.map(c => (
                        <span key={c.id} style={{
                          background: 'rgba(129, 140, 248, 0.12)',
                          color: 'var(--text-primary)',
                          border: '1px solid rgba(129, 140, 248, 0.25)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.775rem'
                        }}>
                          🏢 {c.name} {c.code && <code style={{ color: 'var(--accent)', marginLeft: 4 }}>({c.code})</code>}
                        </span>
                      ))}
                    </div>
                    <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>
                      👉 Please delete or reassign these Companies first from the Companies page.
                    </div>
                  </div>
                )}

                {/* Users mapped */}
                {mapped.users && mapped.users.length > 0 && (
                  <div style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        <RiUserLine style={{ color: '#10b981' }} />
                        <span>Mapped Users ({mapped.users.length})</span>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Action Required</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {mapped.users.map(u => (
                        <span key={u.id} style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--text-primary)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.775rem'
                        }}>
                          👤 {u.name} {u.email && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>&lt;{u.email}&gt;</span>}
                        </span>
                      ))}
                    </div>
                    <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>
                      👉 Please delete or reassign these Users first from UAM / Users page.
                    </div>
                  </div>
                )}

                {/* Departments mapped */}
                {mapped.departments && mapped.departments.length > 0 && (
                  <div style={{
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        <RiGroupLine style={{ color: '#818cf8' }} />
                        <span>Mapped Departments ({mapped.departments.length})</span>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Action Required</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {mapped.departments.map(d => (
                        <span key={d.id} style={{
                          background: 'rgba(129, 140, 248, 0.12)',
                          color: 'var(--text-primary)',
                          border: '1px solid rgba(129, 140, 248, 0.25)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.775rem'
                        }}>
                          📁 {d.name} {d.code && <code style={{ color: 'var(--accent)', marginLeft: 4 }}>({d.code})</code>}
                        </span>
                      ))}
                    </div>
                    <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 500 }}>
                      👉 Please delete or reassign these Departments first from Departments page.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.925rem', marginBottom: 16 }}>
                Are you sure you want to delete <strong>"{entityName}"</strong>? This action cannot be undone.
              </p>
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.825rem',
                color: 'var(--success)'
              }}>
                <RiCheckboxCircleLine fontSize="1.1rem" style={{ flexShrink: 0 }} />
                <span>Ready to delete: No active companies or users are mapped to this {entityType}.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={deleting}
          >
            {!canDelete ? 'Close' : 'Cancel'}
          </button>

          {canDelete ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, var(--danger), #b91c1c)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
              }}
              onClick={handleDelete}
              disabled={deleting || loading}
              id="confirm-delete-btn"
            >
              {deleting ? (
                <div className="spinner spinner-sm" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              ) : (
                `Delete ${entityType}`
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={true}
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              title="Delete disabled until dependencies are cleared"
            >
              Delete Blocked (Mapped)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteDependencyModal;
