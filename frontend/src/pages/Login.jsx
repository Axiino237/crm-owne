import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiEyeLine, RiEyeOffLine, RiLockLine, RiMailLine, RiArrowLeftLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Login.css';

/* ============================================================
   LOGIN PAGE — with Forgot Password multi-step flow
   Steps: login → forgot (email) → otp → reset password → done
   ============================================================ */

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'otp' | 'reset' | 'done'

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot Password state
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  /* ----- Login ----- */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/dashboard');
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  /* ----- Forgot Password: Send OTP ----- */
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setFpLoading(true);
    setFpError('');
    try {
      await api.post('/auth/forgot-password', { email: fpEmail });
      setView('otp');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setFpLoading(false);
    }
  };

  /* ----- OTP Input handling ----- */
  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOTP = [...otpValues];
    newOTP[index] = value.slice(-1);
    setOtpValues(newOTP);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOTPPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpValues(pasted.split(''));
      document.getElementById('otp-5')?.focus();
    }
    e.preventDefault();
  };

  /* ----- Verify OTP ----- */
  const handleVerifyOTP = async () => {
    const otp = otpValues.join('');
    if (otp.length < 6) { setFpError('Please enter all 6 digits'); return; }
    setFpLoading(true);
    setFpError('');
    try {
      const res = await api.post('/auth/verify-otp', { email: fpEmail, otp });
      setResetToken(res.data.resetToken);
      setView('reset');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setFpLoading(false);
    }
  };

  /* ----- Reset Password ----- */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setFpError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setFpError('Password must be at least 6 characters'); return; }
    setFpLoading(true);
    setFpError('');
    try {
      await api.post('/auth/reset-password', { email: fpEmail, resetToken, newPassword });
      setView('done');
    } catch (err) {
      setFpError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setFpLoading(false);
    }
  };

  const resetFP = () => {
    setView('login');
    setFpEmail('');
    setOtpValues(['', '', '', '', '', '']);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setFpError('');
  };

  const StepIndicator = ({ currentStep }) => (
    <div className="step-indicator">
      {[0, 1, 2].map(i => (
        <div key={i} className={`step-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}`} />
      ))}
    </div>
  );

  /* ========== RENDER ========== */
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">

          {/* ---- LOGO ---- */}
          <div className="login-logo">
            <div className="login-logo-icon">⚡</div>
            <div className="login-title">CRM Pro</div>
            <div className="login-subtitle">
              {view === 'login' && 'Sign in to your workspace'}
              {view === 'forgot' && 'Forgot Password'}
              {view === 'otp' && 'Verify OTP'}
              {view === 'reset' && 'Set New Password'}
              {view === 'done' && 'Password Reset!'}
            </div>
          </div>

          {/* ---- LOGIN VIEW ---- */}
          {view === 'login' && (
            <form onSubmit={handleLogin}>
              {loginError && (
                <div className="login-error">
                  <RiErrorWarningLine /> {loginError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <RiMailLine className="input-icon" />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="your@email.com"
                    value={loginForm.email}
                    onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    required
                    autoFocus
                    id="login-email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <RiLockLine className="input-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    required
                    id="login-password"
                  />
                  <button type="button" className="input-action" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="forgot-link" onClick={() => setView('forgot')}>
                  Forgot Password?
                </span>
              </div>

              <button type="submit" className="login-btn" disabled={loginLoading} id="login-submit">
                {loginLoading ? <div className="spinner spinner-sm" /> : '🔐'}
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ---- FORGOT: ENTER EMAIL ---- */}
          {view === 'forgot' && (
            <form onSubmit={handleSendOTP}>
              <StepIndicator currentStep={0} />
              <button type="button" className="back-link" onClick={resetFP}>
                <RiArrowLeftLine /> Back to Login
              </button>
              {fpError && <div className="login-error"><RiErrorWarningLine /> {fpError}</div>}
              <div className="form-group">
                <label className="form-label">Enter your email</label>
                <div className="input-wrapper">
                  <RiMailLine className="input-icon" />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="your@email.com"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    required
                    autoFocus
                    id="forgot-email"
                  />
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={fpLoading} id="send-otp-btn">
                {fpLoading ? <div className="spinner spinner-sm" /> : '📧'}
                {fpLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* ---- OTP VERIFICATION ---- */}
          {view === 'otp' && (
            <div>
              <StepIndicator currentStep={1} />
              <button type="button" className="back-link" onClick={() => setView('forgot')}>
                <RiArrowLeftLine /> Change Email
              </button>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>
                OTP sent to <strong style={{ color: 'var(--accent)' }}>{fpEmail}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Valid for 10 minutes</p>
              {fpError && <div className="login-error" style={{ marginTop: '16px' }}><RiErrorWarningLine /> {fpError}</div>}
              <div className="otp-inputs" onPaste={handleOTPPaste}>
                {otpValues.map((val, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    className="otp-input"
                    value={val}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(i, e)}
                    maxLength={1}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button className="login-btn" onClick={handleVerifyOTP} disabled={fpLoading} id="verify-otp-btn">
                {fpLoading ? <div className="spinner spinner-sm" /> : '✅'}
                {fpLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <span className="forgot-link" onClick={handleSendOTP}>Resend OTP</span>
              </div>
            </div>
          )}

          {/* ---- RESET PASSWORD ---- */}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <StepIndicator currentStep={2} />
              {fpError && <div className="login-error"><RiErrorWarningLine /> {fpError}</div>}
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrapper">
                  <RiLockLine className="input-icon" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    id="new-password"
                  />
                  <button type="button" className="input-action" onClick={() => setShowNewPass(!showNewPass)}>
                    {showNewPass ? <RiEyeOffLine /> : <RiEyeLine />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <RiLockLine className="input-icon" />
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    id="confirm-password"
                  />
                </div>
              </div>
              <button type="submit" className="login-btn" disabled={fpLoading} id="reset-password-btn">
                {fpLoading ? <div className="spinner spinner-sm" /> : '🔒'}
                {fpLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* ---- SUCCESS ---- */}
          {view === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div className="success-icon">✅</div>
              <h3 style={{ color: 'var(--success)', marginBottom: '12px' }}>Password Reset Successful!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
                Your password has been updated. You can now login with your new password.
              </p>
              <button className="login-btn" onClick={resetFP} id="back-to-login-btn">
                🔐 Back to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
