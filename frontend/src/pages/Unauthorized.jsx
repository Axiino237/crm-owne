import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const { user, getFirstAuthorizedPath } = useAuth();
  const returnPath = user ? getFirstAuthorizedPath() : '/login';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', color: 'var(--text-primary)',
      textAlign: 'center', padding: '20px'
    }}>
      <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🔒</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '12px', color: 'var(--danger)' }}>
        Access Denied
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '32px', maxWidth: 450 }}>
        You don't have permission to view this specific page.
      </p>
      <Link to={returnPath} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
        ← Go to Accessible Page
      </Link>
    </div>
  );
};

export default Unauthorized;
