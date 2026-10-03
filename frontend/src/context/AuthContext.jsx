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
    try {
      const permRes = await api.get('/uam/my-permissions');
      setPermissions(permRes.data.permissions || []);
    } catch {
      setPermissions([]);
    }
    return res.data;
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
   * Super admin bypasses only core administration modules to prevent lockout
   */
  const hasPermission = useCallback((module, screen, action = 'canView') => {
    if (!user) return false;

    // Safety guard: only prevent locking out the permissions configuration screens themselves
    const isPermManager = module === 'permissions' && ['permissions-list', 'permission-edit'].includes(screen);
    if (user.isSuperAdmin && isPermManager) return true;

    const perm = permissions.find(p => p.module === module && p.screen === screen);
    if (perm) {
      return !!perm[action];
    }

    // Default to true for Super Admin (if no database record exists), and false for others
    return user.isSuperAdmin ? true : false;
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission, fetchPermissions, updateUser, refreshAuth }}>
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
