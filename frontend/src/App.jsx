import { useCallback, useState } from 'react';
import CategoryPage from './pages/CategoryPage';
import GoogleLoginButton from './components/GoogleLoginButton';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const USER_STORAGE_KEY = 'thaitrail_user';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [user, setUser] = useState(() => getStoredUser());
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const categories = [
    { id: '', name: 'ทั้งหมด' },
    { id: '1', name: 'ศาสนาและความเชื่อ' },
    { id: '2', name: 'ธรรมชาติและผจญภัย' },
    { id: '3', name: 'ทะเลและเกาะ' },
    { id: '4', name: 'สวนสัตว์' },
    { id: '5', name: 'ถ่ายภาพ' },
    { id: '6', name: 'ประวัติศาสตร์และวัฒนธรรม' },
    { id: '7', name: 'อาหารคาเฟ่และไลฟ์สไตล์' },
    { id: '8', name: 'ประเพณีและเทศกาล' }
  ];

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

      setUser(data.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
    } catch (error) {
      setAuthError(error.message || 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const handleLoginError = useCallback((message) => {
    setAuthError(message || 'ไม่สามารถเริ่ม Google Sign-In ได้');
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setAuthError('');
    setSelectedCategory('');
  }, []);

  if (user) {
    return (
      <main className="explorer-bg">
        <section className="explorer-panel">
          <header className="explorer-header">
            <div className="explorer-user">
              {user.picture ? <img src={user.picture} alt={user.name || user.email} className="auth-avatar" /> : null}
              <div>
                <p className="explorer-user-name">{user.name || user.email}</p>
                <p className="explorer-user-email">{user.email}</p>
              </div>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </header>

          <section className="explorer-zone">
            <h2 className="explorer-title">เลือกหมวดหมู่สถานที่</h2>
            <div className="category-pills">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`category-pill ${selectedCategory === category.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <CategoryPage categories={categories} categoryId={selectedCategory} />
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="landing-bg">
      <section className="landing-panel">
        <div className="brand-stack">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-mark-main">T</span>
            <span className="brand-mark-streak brand-mark-streak-1" />
            <span className="brand-mark-streak brand-mark-streak-2" />
            <span className="brand-mark-streak brand-mark-streak-3" />
          </div>
          <h1 className="brand-title">
            <span className="brand-title-dark">Thai</span>
            <span className="brand-title-light">Trail</span>
          </h1>
          <p className="brand-subtitle">ทุกเทรลทั่วไทย ไปกับไทยเทรล</p>
        </div>

        <div className="hero-illustration" aria-hidden="true">
          <div className="cityline" />
          <div className="mountain-ridge mountain-ridge-back" />
          <div className="mountain-ridge mountain-ridge-front" />
          <div className="train-track" />
          <div className="train-body" />
          <div className="train-window" />
        </div>

        <section className="login-zone">
          <GoogleLoginButton
            clientId={GOOGLE_CLIENT_ID}
            onCredential={handleLoginSuccess}
            onError={handleLoginError}
          />

          {isAuthenticating ? <p className="auth-hint">กำลังตรวจสอบบัญชี Google...</p> : null}
          {authError ? <p className="auth-error">{authError}</p> : null}
        </section>
      </section>
    </main>
  );
}

export default App;
