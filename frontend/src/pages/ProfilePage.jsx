import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  RiUserLine, RiMailLine, RiBuildingLine, RiShieldLine, RiLockPasswordLine, RiUploadCloud2Line, RiDeleteBin6Line, RiSave2Line 
} from 'react-icons/ri';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Initial initials for fallback avatar
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SA';

  // Handle avatar file selection & convert to Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        avatar,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword ? newPassword : undefined
      };

      const res = await api.put('/auth/profile', payload);
      
      // Update global context & local storage
      updateUser(res.data.user);
      
      toast.success('Profile updated successfully!');
      
      // Clear password inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update profile';
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Profile Settings">
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '10px 0 40px 0',
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 30
      }}>
        <form onSubmit={handleSubmit}>
          {/* Header Action Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Manage Personal Profile
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Update your custom display picture, account details, and security configurations.
              </p>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '10px 24px',
                borderRadius: 8,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(129, 140, 248, 0.2)'
              }}
            >
              <RiSave2Line /> {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: 30
          }}>
            {/* Left Card - DP & Basic Meta */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: 'fit-content'
            }}>
              {/* Profile Image Preview */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'relative',
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: '3px solid var(--accent)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-secondary)',
                  overflow: 'hidden',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: 800, 
                    color: 'var(--accent)',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {initials}
                  </div>
                )}
                
                {/* Upload Overlay on Hover */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(13, 19, 38, 0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '50%'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                onMouseOut={(e) => e.currentTarget.style.opacity = 0}
                >
                  <RiUploadCloud2Line style={{ fontSize: '1.5rem', marginBottom: 4 }} />
                  Change DP
                </div>
              </div>

              {/* Upload Inputs and Actions */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*"
                style={{ display: 'none' }} 
              />
              
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <RiUploadCloud2Line /> Upload
                </button>
                {avatar && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleRemoveAvatar}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      borderRadius: 6,
                      color: 'var(--danger)',
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <RiDeleteBin6Line /> Clear
                  </button>
                )}
              </div>

              <div style={{
                width: '100%',
                borderTop: '1px solid var(--border)',
                marginTop: 24,
                paddingTop: 16,
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiBuildingLine style={{ color: 'var(--accent)', fontSize: '0.95rem' }} />
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Organization</span>
                    <strong>{user?.organization?.name || 'Unassigned'}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiShieldLine style={{ color: 'var(--accent)', fontSize: '0.95rem' }} />
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Role Permission</span>
                    <strong>{user?.isSuperAdmin ? 'Super Admin' : user?.role?.name || 'User'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card - Profile Form & Security Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Account Details */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20 }}>
                  Account Information
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                      <RiUserLine style={{ color: 'var(--accent)' }} /> Full Name
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                      <RiMailLine style={{ color: 'var(--accent)' }} /> Registered Email
                    </label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={user?.email || ''} 
                      disabled 
                      style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>

              {/* Password Management */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20 }}>
                  Security & Password change
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                      <RiLockPasswordLine style={{ color: 'var(--accent)' }} /> Current Password
                    </label>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={currentPassword} 
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Required only if changing password"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        <RiLockPasswordLine style={{ color: 'var(--accent)' }} /> New Password
                      </label>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        <RiLockPasswordLine style={{ color: 'var(--accent)' }} /> Confirm New Password
                      </label>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
