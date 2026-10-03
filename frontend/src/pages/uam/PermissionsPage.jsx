import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiSaveLine, RiCheckboxLine, RiCheckboxBlankLine,
  RiShieldUserLine, RiKey2Line, RiSearchLine, RiFilterLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const MODULE_ICONS = {
  dashboard: '🏠', uam: '👥', roles: '🛡️',
  permissions: '🔑', organizations: '🏢', companies: '🏭',
  departments: '🗂️', leads: '🎯', quotations: '📄',
  attendance: '📅', chat: '💬', performance: '📊',
  closed_sales: '✅', design: '🎨'
};

const ACTIONS = [
  { key: 'canView', label: 'View', color: 'var(--info)' },
  { key: 'canCreate', label: 'Create', color: 'var(--success)' },
  { key: 'canEdit', label: 'Edit', color: 'var(--warning)' },
  { key: 'canDelete', label: 'Delete', color: 'var(--danger)' },
];

const SCREEN_LABELS = {
  'closed-sales-list': 'Closed Sales Access',
  'closed-sales-value': 'Deal Value (Column & Input)',
  'closed-sales-paid': 'Paid Amount (Column & Input)',
  'closed-sales-balance': 'Outstanding Balance (Column & View)',
  'closed-sales-vendor-payout': 'Vendor Payout (Column & Input)',
  'total-profit-card': 'Total Sales Card',
  'monthly-profit-card': 'Average Monthly Sales Card',
  'profit-trend-chart': 'Monthly Sales Trend Chart'
};

const PermissionsPage = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const { refreshAuth, hasPermission } = useAuth();

  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(roleId || '');
  const [role, setRole] = useState(null);
  const [moduleScreens, setModuleScreens] = useState({});
  const [permsMatrix, setPermsMatrix] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchModule, setSearchModule] = useState('');

  const canEditPerms = hasPermission('permissions', 'permission-edit', 'canEdit');

  // 1. Fetch all roles for the selector bar
  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await api.get('/roles');
        const rolesList = res.data.roles || [];
        if (isMounted) {
          setRoles(rolesList);
          if (roleId) {
            setSelectedRoleId(roleId);
          } else if (rolesList.length > 0) {
            setSelectedRoleId(rolesList[0].id);
          }
        }
      } catch (err) {
        toast.error('Failed to load roles');
      } finally {
        if (isMounted) setLoadingRoles(false);
      }
    };
    fetchRoles();
    return () => { isMounted = false; };
  }, [roleId]);

  // 2. Fetch permissions matrix when selectedRoleId changes
  useEffect(() => {
    if (!selectedRoleId) return;
    let isMounted = true;
    const loadMatrix = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/permissions/role/${selectedRoleId}`);
        if (isMounted) {
          setRole(res.data.role);
          setModuleScreens(res.data.moduleScreens || {});
          setPermsMatrix(res.data.matrix || {});
        }
      } catch (err) {
        toast.error('Failed to load role permissions');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadMatrix();
    return () => { isMounted = false; };
  }, [selectedRoleId]);

  const handleRoleSelect = (id) => {
    setSelectedRoleId(id);
    navigate(`/uam/permissions/${id}`, { replace: true });
  };

  const toggle = (module, screen, action) => {
    if (!canEditPerms) return;
    setPermsMatrix(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [screen]: {
          ...prev[module][screen],
          [action]: !prev[module][screen][action]
        }
      }
    }));
  };

  const toggleAllModule = (module, action, value) => {
    if (!canEditPerms) return;
    setPermsMatrix(prev => {
      const updated = { ...prev, [module]: { ...prev[module] } };
      Object.keys(updated[module] || {}).forEach(screen => {
        updated[module][screen] = { ...updated[module][screen], [action]: value };
      });
      return updated;
    });
  };

  // Master toggle: enable/disable ALL screens & actions in a module
  const toggleWholeModule = (module, turnOn) => {
    if (!canEditPerms) return;
    setPermsMatrix(prev => {
      const updated = { ...prev, [module]: { ...prev[module] } };
      Object.keys(updated[module] || {}).forEach(screen => {
        updated[module][screen] = Object.fromEntries(ACTIONS.map(a => [a.key, turnOn]));
      });
      return updated;
    });
  };

  const toggleAllScreen = (module, screen) => {
    if (!canEditPerms) return;
    const currentPerm = permsMatrix[module]?.[screen] || {};
    const allOn = ACTIONS.every(a => currentPerm[a.key]);
    setPermsMatrix(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [screen]: Object.fromEntries(ACTIONS.map(a => [a.key, !allOn]))
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedRoleId || !canEditPerms) return;
    setSaving(true);
    const permissions = [];
    for (const [module, screens] of Object.entries(permsMatrix)) {
      for (const [screen, perms] of Object.entries(screens)) {
        permissions.push({ module, screen, ...perms });
      }
    }
    try {
      await api.put(`/permissions/role/${selectedRoleId}`, { permissions });
      toast.success(`Permissions updated successfully for "${role?.name}"!`);
      refreshAuth();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Filter modules by search term
  const filteredModules = Object.entries(moduleScreens).filter(([module]) => {
    if (!searchModule) return true;
    return module.toLowerCase().includes(searchModule.toLowerCase());
  });

  return (
    <AppLayout title="Permissions Management">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiKey2Line style={{ color: 'var(--accent)' }} /> Role Permissions
          </h1>
          <p className="page-subtitle">
            Configure screen access rights and CRUD permissions across all system modules
          </p>
        </div>

        {canEditPerms && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
            id="save-perms-btn"
          >
            {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        )}
      </div>

      {/* Role Selection Tabs */}
      <div style={{
        marginBottom: 20,
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(129, 140, 248, 0.12)',
        borderRadius: 12
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Select Role to Edit Permissions:
        </div>

        {loadingRoles ? (
          <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading roles...</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {roles.map(r => {
              const isActive = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive ? 'rgba(129, 140, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  id={`role-tab-${r.id}`}
                >
                  <RiShieldUserLine style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span>{r.name}</span>
                  <span style={{
                    fontSize: '0.6875rem',
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: r.isSystem ? 'rgba(245, 158, 11, 0.15)' : 'rgba(129, 140, 248, 0.12)',
                    color: r.isSystem ? '#f59e0b' : 'var(--accent)'
                  }}>
                    {r.isSystem ? 'System' : 'Custom'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Editor Card */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading permissions matrix...</div>
        </div>
      ) : (
        <>
          {/* Active Role Meta & Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>Configuring:</span>
                <span style={{ color: 'var(--accent)' }}>{role?.name}</span>
                {role?.code && <code style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({role?.code})</code>}
              </div>
              <span className={`badge ${role?.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                {role?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Module search */}
            <div className="input-wrapper" style={{ minWidth: 220 }}>
              <RiSearchLine className="input-icon" />
              <input
                className="form-control"
                placeholder="Filter modules..."
                value={searchModule}
                onChange={e => setSearchModule(e.target.value)}
                style={{ fontSize: '0.8125rem', padding: '6px 12px 6px 36px' }}
              />
            </div>
          </div>

          {/* Actions Legend */}
          <div className="flex gap-4 mb-4" style={{ marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action Keys:</span>
            {ACTIONS.map(a => (
              <div key={a.key} className="flex items-center gap-2" style={{ fontSize: '0.8125rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
              </div>
            ))}
          </div>

          {/* Matrix by Module */}
          {filteredModules.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No modules found matching "{searchModule}"</p>
            </div>
          ) : (
            filteredModules.map(([module, screens]) => {
              const modulePerm = permsMatrix[module] || {};
              const allScreensAllActions = screens.every(s => ACTIONS.every(a => modulePerm[s]?.[a.key]));
              const anyOn = screens.some(s => ACTIONS.some(a => modulePerm[s]?.[a.key]));

              return (
                <div className="card" key={module} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                  {/* Module Header */}
                  <div style={{
                    padding: '12px 20px',
                    background: 'rgba(129, 140, 248, 0.06)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>{MODULE_ICONS[module] || '📋'}</span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      textTransform: 'capitalize',
                      color: 'var(--text-primary)'
                    }}>
                      {module.replace(/_/g, ' ')}
                    </span>

                    {/* Master Switch for Whole Module */}
                    <label
                      className="toggle"
                      title={allScreensAllActions ? 'Disable all permissions for this module' : 'Enable all permissions for this module'}
                      style={{ marginLeft: 8, cursor: canEditPerms ? 'pointer' : 'default' }}
                      id={`master-toggle-${module}`}
                    >
                      <input
                        type="checkbox"
                        checked={allScreensAllActions}
                        disabled={!canEditPerms}
                        onChange={() => toggleWholeModule(module, !allScreensAllActions)}
                      />
                      <span className="toggle-slider" style={{
                        '--toggle-on-color': allScreensAllActions ? 'var(--success)' : anyOn ? 'var(--warning)' : undefined
                      }} />
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: -4 }}>Toggle Module</span>

                    {/* Bulk Actions per column */}
                    {canEditPerms && (
                      <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                        {ACTIONS.map(a => (
                          <button
                            key={a.key}
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.6875rem',
                              padding: '4px 8px',
                              background: 'transparent',
                              border: `1px solid ${a.color}40`,
                              color: a.color
                            }}
                            onClick={() => {
                              const allOn = screens.every(s => modulePerm[s]?.[a.key]);
                              toggleAllModule(module, a.key, !allOn);
                            }}
                            id={`module-${module}-${a.key}`}
                          >
                            All {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Screen Rows Table */}
                  <div>
                    {screens.map((screen, idx) => {
                      const screenPerm = modulePerm[screen] || {};
                      const isAllRowOn = ACTIONS.every(a => screenPerm[a.key]);

                      return (
                        <div
                          key={screen}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr repeat(4, 110px)',
                            padding: '12px 20px',
                            borderBottom: idx < screens.length - 1 ? '1px solid rgba(129, 140, 248, 0.05)' : 'none',
                            alignItems: 'center',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Screen Name + Toggle All Row */}
                          <div className="flex items-center gap-2">
                            {canEditPerms && (
                              <button
                                onClick={() => toggleAllScreen(module, screen)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: isAllRowOn ? 'var(--accent)' : 'var(--text-muted)',
                                  fontSize: '1.1rem',
                                  display: 'flex',
                                  padding: 0
                                }}
                                title="Toggle all actions for this screen"
                                id={`all-${module}-${screen}`}
                              >
                                {isAllRowOn ? <RiCheckboxLine /> : <RiCheckboxBlankLine />}
                              </button>
                            )}
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {SCREEN_LABELS[screen] || screen.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </div>

                          {/* Action Toggles */}
                          {ACTIONS.map(a => (
                            <div key={a.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <label className="toggle" id={`toggle-${module}-${screen}-${a.key}`}>
                                <input
                                  type="checkbox"
                                  checked={!!screenPerm[a.key]}
                                  disabled={!canEditPerms}
                                  onChange={() => toggle(module, screen, a.key)}
                                />
                                <span
                                  className="toggle-slider"
                                  style={{ '--toggle-on-color': a.color }}
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Bottom Save Action */}
          {canEditPerms && (
            <div style={{ textAlign: 'right', marginTop: 20, marginBottom: 40 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSave}
                disabled={saving}
                id="save-perms-btn-bottom"
              >
                {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
                {saving ? 'Saving Changes...' : `Save Permissions for ${role?.name || 'Role'}`}
              </button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default PermissionsPage;
