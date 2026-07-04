import React from 'react';

/**
 * A beautiful, custom confirmation modal styled according to CRM Pro's design system.
 */
const ConfirmModal = ({ isOpen, title, message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, onCancel, loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header" style={{ paddingBottom: 12 }}>
          <h3 className="modal-title" style={{ fontSize: '1.25rem', color: 'var(--danger)' }}>
            ⚠️ {title}
          </h3>
          <button className="btn btn-icon" onClick={onCancel} disabled={loading}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '8px 24px 20px 24px' }}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.925rem' }}>
            {message}
          </p>
        </div>
        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            onClick={onCancel} 
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ 
              background: 'linear-gradient(135deg, var(--danger), #b91c1c)', 
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' 
            }} 
            onClick={onConfirm} 
            disabled={loading}
            id="confirm-modal-ok-btn"
          >
            {loading ? <div className="spinner spinner-sm" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
