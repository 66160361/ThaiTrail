import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import thaiTrailLogo from '../../images/thai_trail.png';
import thaiTrailPicture from '../../images/picture.png';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function LoginPage() {
  const navigate = useNavigate();
  const { loginWithGoogle, user } = useAuth();
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return 280;
    }

    return Math.max(210, Math.min(300, window.innerWidth - 116));
  });

  // If already logged in (session restored), redirect immediately
  useEffect(() => {
    if (!user) return;
    const isOnboarded = user.onboarded === 1 || user.onboarded === '1';
    if (isOnboarded) {
      navigate('/', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

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
      // Use AuthContext.loginWithGoogle so it goes through Vite proxy → same session cookie domain
      const userData = await loginWithGoogle(credential);

      const isOnboarded =
        (userData?.onboarded === 1 || userData?.onboarded === '1') ||
        (Array.isArray(userData?.interests) && userData.interests.length > 0);

      if (isOnboarded) {
        navigate('/', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (error) {
      setAuthError(error.message || 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setIsAuthenticating(false);
    }
  }, [navigate, loginWithGoogle]);

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
