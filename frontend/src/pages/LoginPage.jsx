import { useCallback, useEffect, useState } from 'react';
import GoogleLoginButton from '../components/GoogleLoginButton';
import thaiTrailLogo from '../../images/thai_trail.png';
import thaiTrailPicture from '../../images/picture.png';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function LoginPage({ onLogin }) {
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return 280;
    }

    return Math.max(210, Math.min(300, window.innerWidth - 116));
  });

  useEffect(() => {
    const updateButtonWidth = () => {
      setButtonWidth(Math.max(210, Math.min(300, window.innerWidth - 116)));
    };

    updateButtonWidth();
    window.addEventListener('resize', updateButtonWidth);
    return () => window.removeEventListener('resize', updateButtonWidth);
  }, []);

  const handleLoginSuccess = useCallback(async (credential) => {
    setAuthError('');
    setIsAuthenticating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.user) {
        throw new Error(data?.message || 'Google login failed');
      }

      onLogin?.(data.user);
    } catch (error) {
      setAuthError(error.message || 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setIsAuthenticating(false);
    }
  }, [onLogin]);

  const handleLoginError = useCallback((message) => {
    setAuthError(message || 'ไม่สามารถเริ่ม Google Sign-In ได้');
  }, []);

  return (
    <main className="landing-bg">
      <section className="landing-panel">
        <div className="brand-stack">
          <img src={thaiTrailLogo} alt="Thai Trail" className="brand-logo" />
          <p className="brand-subtitle">ทุกเทรลทั่วไทย ไปกับไทยเทรล</p>
        </div>

        <div className="hero-illustration">
          <img src={thaiTrailPicture} alt="" className="hero-image" />
        </div>

        <section className="login-zone">
          <GoogleLoginButton
            clientId={GOOGLE_CLIENT_ID}
            onCredential={handleLoginSuccess}
            onError={handleLoginError}
            width={buttonWidth}
          />

          {isAuthenticating ? <p className="auth-hint">กำลังตรวจสอบบัญชี Google...</p> : null}
          {authError ? <p className="auth-error">{authError}</p> : null}
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
