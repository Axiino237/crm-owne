import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await api.get('/uam/my-permissions');
      setPermissions(res.data.permissions || []);
    } catch {
      setPermissions([]);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('crm_user', JSON.stringify(res.data.user));
      }
      await fetchPermissions();
    } catch (e) {
      console.error('Auth refresh failed:', e);
    }
  }, [fetchPermissions]);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('crm_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('crm_user', JSON.stringify(res.data.user));
            await fetchPermissions();
          } else {
            localStorage.removeItem('crm_token');
            localStorage.removeItem('crm_user');
            setUser(null);
            setPermissions([]);
          }
        } catch (e) {
          console.error('Auth initialization failed:', e);
          if (e.response && e.response.status === 401) {
            localStorage.removeItem('crm_token');
            localStorage.removeItem('crm_user');
            setUser(null);
            setPermissions([]);
          } else {
            const savedUser = localStorage.getItem('crm_user');
            if (savedUser) {
              try {
                setUser(JSON.parse(savedUser));
                await fetchPermissions();
              } catch {
                localStorage.removeItem('crm_token');
                localStorage.removeItem('crm_user');
                setUser(null);
                setPermissions([]);
              }
            }
          }
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, [fetchPermissions]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(userData));
    setUser(userData);
    // Fetch permissions after login
    let loadedPerms = [];
    try {
      const permRes = await api.get('/uam/my-permissions');
      loadedPerms = permRes.data.permissions || [];
      setPermissions(loadedPerms);
    } catch {
      setPermissions([]);
    }
    return { ...res.data, permissions: loadedPerms };
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    setPermissions([]);
  };

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('crm_user', JSON.stringify(userData));
  }, []);

  /**
   * Check if user has permission for module/screen/action
   * Respects configured permissions; safeguards permissions screen for super admin to prevent lockout
   */
  const hasPermission = useCallback((module, screen, action = 'canView') => {
    if (!user) return false;

    // Safety guard: only prevent locking out the permissions configuration screens themselves
    const isPermManager = module === 'permissions' && ['permissions-list', 'permission-edit'].includes(screen);
    if (user.isSuperAdmin && isPermManager) return true;

    // Support array of screens (OR condition: true if any screen permitted)
    if (Array.isArray(screen)) {
      return screen.some(s => hasPermission(module, s, action));
    }

    const perm = permissions.find(p => p.module === module && p.screen === screen);
    if (perm) {
      return !!perm[action];
    }

    // Default to true for Super Admin if no permission record exists yet, false for others
    return user.isSuperAdmin ? true : false;
  }, [user, permissions]);

  /**
   * Find the first screen/route the user is authorized to access
   * Used for smart routing on login, root redirect, and permission fallback
   */
  const getFirstAuthorizedPath = useCallback((customUser = user, customPerms = permissions) => {
    const targetUser = customUser || user;
    if (!targetUser) return '/login';

    const checkPerm = (module, screen, action = 'canView') => {
      // Safety guard for permissions management
      if (targetUser.isSuperAdmin && module === 'permissions') return true;

      if (Array.isArray(screen)) {
        return screen.some(s => checkPerm(module, s, action));
      }
      const permList = customPerms || permissions;
      const p = permList.find(x => x.module === module && x.screen === screen);
      if (p) return !!p[action];
      return targetUser.isSuperAdmin ? true : false;
    };

    const routes = [
      { path: '/dashboard', module: 'dashboard', screen: 'dashboard-home' },
      { path: '/leads', module: 'leads', screen: 'leads-list' },
      { path: '/quotation', module: 'quotations', screen: 'quotations-list' },
      { path: '/closed-sales', module: 'closed_sales', screen: ['closed-sales-list', 'closed-sales-all'] },
      { path: '/performance', module: 'performance', screen: 'performance-view' },
      { path: '/design', module: 'design', screen: 'design-list' },
      { path: '/my-projects', module: 'design', screen: 'my-projects-list' },
      { path: '/completed-models', module: 'design', screen: 'completed-models-list' },
      { path: '/attendance', module: 'attendance', screen: ['attendance-list', 'attendance-team', 'attendance-all-departments'] },
      { path: '/leaves', module: 'attendance', screen: ['attendance-list', 'attendance-team', 'attendance-all-departments'] },
      { path: '/staff-summary', module: 'uam', screen: ['staff-summary', 'staff-summary-dept', 'staff-summary-all', 'users-list'] },
      { path: '/chat', module: 'chat', screen: 'chat-room' },
      { path: '/uam/users', module: 'uam', screen: 'users-list' },
      { path: '/uam/roles', module: 'roles', screen: 'roles-list' },
      { path: '/uam/permissions', module: 'permissions', screen: 'permissions-list' },
      { path: '/companies', module: 'companies', screen: 'companies-list' },
      { path: '/departments', module: 'departments', screen: 'departments-list' },
      { path: '/hierarchy', module: 'departments', screen: 'departments-list' },
      { path: '/team-monitor', module: 'departments', screen: 'departments-list' },
      { path: '/org-overview', module: 'dashboard', screen: 'org-overview' },
      { path: '/profile', always: true }
    ];

    for (const r of routes) {
      if (r.always) return r.path;
      if (checkPerm(r.module, r.screen, 'canView')) {
        return r.path;
      }
    }
    return '/profile';
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{
      user, permissions, loading, login, logout,
      hasPermission, getFirstAuthorizedPath, fetchPermissions, updateUser, refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
