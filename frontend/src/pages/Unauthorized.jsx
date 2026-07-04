import { Link } from 'react-router-dom';

const Unauthorized = () => (
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
    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '32px', maxWidth: 400 }}>
      You don't have permission to view this page. Contact your administrator to get access.
    </p>
    <Link to="/dashboard" className="btn btn-primary">
      ← Go to Dashboard
    </Link>
  </div>
);

export default Unauthorized;
