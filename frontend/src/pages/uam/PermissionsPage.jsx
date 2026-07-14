import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiArrowLeftLine, RiSaveLine, RiCheckboxLine, RiCheckboxBlankLine } from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const MODULE_ICONS = {
  dashboard: '🏠', uam: '👥', roles: '🛡️',
  permissions: '🔑', organizations: '🏢', companies: '🏭',
  departments: '🗂️', leads: '🎯', quotations: '📄',
  attendance: '📅', chat: '💬'
};

const ACTIONS = [
  { key: 'canView', label: 'View', color: 'var(--info)' },
  { key: 'canCreate', label: 'Create', color: 'var(--success)' },
  { key: 'canEdit', label: 'Edit', color: 'var(--warning)' },
  { key: 'canDelete', label: 'Delete', color: 'var(--danger)' },
];

const PermissionsPage = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const { fetchPermissions } = useAuth();
  const [role, setRole] = useState(null);
  const [moduleScreens, setModuleScreens] = useState({});
  const [permsMatrix, setPermsMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/permissions/role/${roleId}`);
        setRole(res.data.role);
        setModuleScreens(res.data.moduleScreens);
        setPermsMatrix(res.data.matrix);
      } catch (err) {
        toast.error('Failed to load permissions');
      }
      setLoading(false);
    };
    load();
  }, [roleId]);

  const toggle = (module, screen, action) => {
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
    setPermsMatrix(prev => {
      const updated = { ...prev, [module]: { ...prev[module] } };
      Object.keys(updated[module]).forEach(screen => {
        updated[module][screen] = { ...updated[module][screen], [action]: value };
      });
      return updated;
    });
  };

  // Master on/off: toggle ALL screens + ALL actions in a module
  const toggleWholeModule = (module, turnOn) => {
    setPermsMatrix(prev => {
      const updated = { ...prev, [module]: { ...prev[module] } };
      Object.keys(updated[module]).forEach(screen => {
        updated[module][screen] = Object.fromEntries(ACTIONS.map(a => [a.key, turnOn]));
      });
      return updated;
    });
  };

  const toggleAllScreen = (module, screen) => {
    const currentPerm = permsMatrix[module][screen];
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
    setSaving(true);
    const permissions = [];
    for (const [module, screens] of Object.entries(permsMatrix)) {
      for (const [screen, perms] of Object.entries(screens)) {
        permissions.push({ module, screen, ...perms });
      }
    }
    try {
      await api.put(`/permissions/role/${roleId}`, { permissions });
      toast.success('Permissions saved successfully!');
      fetchPermissions(); // instantly update sidebar & current user session permissions
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  if (loading) return (
    <AppLayout title="Permissions">
      <div style={{ textAlign: 'center', padding: '80px' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout title={`Permissions — ${role?.name}`}>
      <div className="page-header">
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/uam/roles')} style={{ marginBottom: 12 }} id="back-to-roles">
            <RiArrowLeftLine /> Back to Roles
          </button>
          <h1 className="page-title">Role Permissions</h1>
          <p className="page-subtitle">
            Configure module and screen access for <strong style={{ color: 'var(--accent)' }}>{role?.name}</strong>
            <span className="badge badge-accent" style={{ marginLeft: 8 }}>{role?.code}</span>
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="save-perms-btn">
          {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
          {saving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {ACTIONS.map(a => (
          <div key={a.key} className="flex items-center gap-2" style={{ fontSize: '0.8125rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
          </div>
        ))}
      </div>

      {Object.entries(moduleScreens).map(([module, screens]) => {
        const modulePerm = permsMatrix[module] || {};
        return (
          <div className="card" key={module} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            {/* Module Header */}
            <div style={{
              padding: '14px 20px',
              background: 'rgba(129,140,248,0.06)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: '1.25rem' }}>{MODULE_ICONS[module] || '📋'}</span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                {module}
              </span>

              {/* Master ON/OFF toggle for the whole module */}
              {(() => {
                const allScreensAllActions = screens.every(s => ACTIONS.every(a => modulePerm[s]?.[a.key]));
                const anyOn = screens.some(s => ACTIONS.some(a => modulePerm[s]?.[a.key]));
                return (
                  <label
                    className="toggle"
                    title={allScreensAllActions ? 'Disable all permissions for this module' : 'Enable all permissions for this module'}
                    style={{ marginLeft: 8, cursor: 'pointer' }}
                    id={`master-toggle-${module}`}
                  >
                    <input
                      type="checkbox"
                      checked={allScreensAllActions}
                      onChange={() => toggleWholeModule(module, !allScreensAllActions)}
                    />
                    <span className="toggle-slider" style={{ '--toggle-on-color': allScreensAllActions ? 'var(--success)' : anyOn ? 'var(--warning)' : undefined }} />
                  </label>
                );
              })()}

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: -4 }}>All</span>

              {/* Bulk toggles per action */}
              <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                {ACTIONS.map(a => (
                  <button
                    key={a.key}
                    className="btn btn-sm"
                    style={{ fontSize: '0.6875rem', padding: '4px 8px', background: 'transparent', border: `1px solid ${a.color}30`, color: a.color }}
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
            </div>

            {/* Screen rows */}
            <div>
              {screens.map((screen, idx) => {
                const screenPerm = modulePerm[screen] || {};
                return (
                  <div key={screen} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr repeat(4, 120px)',
                    padding: '14px 20px',
                    borderBottom: idx < screens.length - 1 ? '1px solid rgba(129,140,248,0.05)' : 'none',
                    alignItems: 'center',
                    transition: 'background 0.15s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Screen name + select all */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllScreen(module, screen)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', display: 'flex' }}
                        id={`all-${module}-${screen}`}
                      >
                        {ACTIONS.every(a => screenPerm[a.key]) ? <RiCheckboxLine style={{ color: 'var(--accent)' }} /> : <RiCheckboxBlankLine />}
                      </button>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {screen.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </div>

                    {/* Toggles */}
                    {ACTIONS.map(a => (
                      <div key={a.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <label className="toggle" id={`toggle-${module}-${screen}-${a.key}`}>
                          <input
                            type="checkbox"
                            checked={!!screenPerm[a.key]}
                            onChange={() => toggle(module, screen, a.key)}
                          />
                          <span className="toggle-slider" style={{
                            '--toggle-on-color': a.color
                          }} />
                        </label>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving} id="save-perms-btn-bottom">
          {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
          {saving ? 'Saving...' : 'Save All Permissions'}
        </button>
      </div>
    </AppLayout>
  );
};

export default PermissionsPage;
