import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute - wraps routes that require auth + optional permission check
 * @param {string} module - e.g. 'uam'
 * @param {string} screen - e.g. 'users-list'
 * @param {string} action - e.g. 'canView'
 */
const ProtectedRoute = ({ children, module, screen, action = 'canView', superAdminOnly = false }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0a0f1e', color: '#818cf8'
      }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (superAdminOnly && !user.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (module && screen && !hasPermission(module, screen, action)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
