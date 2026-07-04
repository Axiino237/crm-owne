import { useState, useEffect, useCallback } from 'react';
import { 
  RiSearchLine, RiRefreshLine, RiFileList2Line, RiLoginBoxLine, 
  RiShieldUserLine, RiFolderSettingsLine, RiCloseLine, RiEyeLine 
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../../components/AppLayout';
import api from '../../api/axios';

const MODULES_LIST = [
  { value: '', label: 'All Modules' },
  { value: 'auth', label: 'Authentication' },
  { value: 'uam', label: 'UAM (User Access)' },
  { value: 'roles', label: 'Roles' },
  { value: 'permissions', label: 'Permissions' },
  { value: 'leads', label: 'Leads' },
  { value: 'closed_sales', label: 'Closed Sales' },
  { value: 'design', label: 'Design Orders' }
];

const ACTIONS_LIST = [
  { value: '', label: 'All Actions' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' }
];

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  
  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const response = await api.get('/audit-logs', {
        params: {
          page: pageNum,
          limit,
          search,
          module: selectedModule,
          action: selectedAction
        }
      });
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setTotal(response.data.total || 0);
        setPage(pageNum);
      }
    } catch (err) {
      toast.error('Failed to fetch audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedModule, selectedAction, limit]);

  useEffect(() => {
    fetchLogs(1);
  }, [selectedModule, selectedAction, fetchLogs]);

  // Statistics calculations
  const totalCount = total;
  const loginCount = logs.filter(l => l.action === 'LOGIN').length;
  const updatesCount = logs.filter(l => l.action === 'UPDATE').length;
  const deletionsCount = logs.filter(l => l.action === 'DELETE').length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderDetails = (details) => {
    if (!details) return 'N/A';
    try {
      const parsed = typeof details === 'string' ? JSON.parse(details) : details;
      return (
        <pre style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-light)',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          overflowX: 'auto',
          maxHeight: '240px',
          lineHeight: '1.5'
        }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: '1.5'
        }}>
          {details}
        </div>
      );
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN':
        return <span className="badge badge-info">Login</span>;
      case 'CREATE':
        return <span className="badge badge-success">Create</span>;
      case 'UPDATE':
        return <span className="badge badge-warning">Update</span>;
      case 'DELETE':
        return <span className="badge badge-danger">Delete</span>;
      default:
        return <span className="badge badge-accent">{action}</span>;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <AppLayout title="Audit Logs">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Audit & Service Logs</h1>
          <p className="page-subtitle">Track and monitor all operations, configurations, and logins across the CRM platform</p>
        </div>
        <button 
          onClick={() => fetchLogs(page)}
          className="btn btn-outline"
          id="refresh-logs-btn"
        >
          <RiRefreshLine className={loading ? 'spin-anim' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh Logs
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card accent">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}><RiFileList2Line /></div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Total Actions</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon" style={{ color: 'var(--info)' }}><RiLoginBoxLine /></div>
          <div className="stat-value">{loginCount}</div>
          <div className="stat-label">Page Logins</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon" style={{ color: 'var(--warning)' }}><RiFolderSettingsLine /></div>
          <div className="stat-value">{updatesCount}</div>
          <div className="stat-label">Updates Logs</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon" style={{ color: 'var(--success)' }}><RiShieldUserLine /></div>
          <div className="stat-value">{deletionsCount}</div>
          <div className="stat-label">Deletions</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <RiSearchLine className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by username, email, description..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
            className="search-input"
            id="audit-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="form-control"
            style={{ width: '160px', padding: '8px 12px' }}
            id="audit-module-select"
          >
            {MODULES_LIST.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="form-control"
            style={{ width: '160px', padding: '8px 12px' }}
            id="audit-action-select"
          >
            {ACTIONS_LIST.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>

          <button 
            onClick={() => fetchLogs(1)}
            className="btn btn-primary"
            style={{ padding: '8px 20px' }}
            id="apply-filter-btn"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Timestamp</th>
              <th style={{ width: '220px' }}>User</th>
              <th style={{ width: '100px' }}>Action</th>
              <th style={{ width: '120px' }}>Module</th>
              <th>Resource Target</th>
              <th style={{ width: '110px' }}>IP Address</th>
              <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div className="spinner spinner-sm" />
                    Fetching logs...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
                  No logs found. Try adjusting your filter parameters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.userName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.userEmail}</div>
                  </td>
                  <td>
                    {getActionBadge(log.action)}
                  </td>
                  <td style={{ color: 'var(--accent)', fontWeight: 500 }}>
                    {log.module}
                  </td>
                  <td>
                    {log.targetName ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{log.targetName}</span>
                        {log.targetId && (
                          <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {log.targetId}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {log.ipAddress || 'unknown'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="btn-icon"
                      style={{ borderRadius: '6px', padding: '6px' }}
                      title="View Log Details"
                      id={`view-log-${log.id}`}
                    >
                      <RiEyeLine size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{Math.min((page - 1) * limit + 1, total)}</strong> to{' '}
          <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> logs
        </div>
        
        <div className="pagination" style={{ marginTop: 0 }}>
          <button 
            className="page-btn" 
            disabled={page <= 1 || loading}
            onClick={() => fetchLogs(page - 1)}
            id="prev-page-btn"
          >
            &lt;
          </button>
          <span style={{ fontSize: '0.8125rem', padding: '0 8px', color: 'var(--text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <button 
            className="page-btn" 
            disabled={page >= totalPages || loading}
            onClick={() => fetchLogs(page + 1)}
            id="next-page-btn"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Log Event Details</h3>
                <p style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="logout-btn"
                style={{ fontSize: '1.25rem', padding: '4px' }}
                id="close-modal-btn"
              >
                <RiCloseLine />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2">
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                    Timestamp
                  </span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatDate(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                    IP Address
                  </span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedLog.ipAddress || 'unknown'}</span>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                    Executed By
                  </span>
                  <div>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>{selectedLog.userName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedLog.userEmail}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                    Action Event
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {getActionBadge(selectedLog.action)}
                    <span style={{ color: 'var(--accent)', fontWeight: 500 }}>/{selectedLog.module}</span>
                  </div>
                </div>
              </div>

              {selectedLog.targetName && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Target Details
                  </span>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name:</span>{' '}
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedLog.targetName}</span>
                    </div>
                    {selectedLog.targetId && (
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resource ID:</span>{' '}
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {selectedLog.targetId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Execution / Changes Metadata
                </span>
                {renderDetails(selectedLog.details)}
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-outline"
                id="close-modal-footer-btn"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AuditLogsPage;
