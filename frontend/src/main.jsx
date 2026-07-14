import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoginPage from './pages/LoginPage';
import './index.css';

function Root() {
  const [user, setUser] = React.useState(null);
  const [pathname, setPathname] = React.useState(() => window.location.pathname || '/');

  const navigate = React.useCallback((path, replace = false) => {
    if (window.location.pathname === path) {
      setPathname(path);
      return;
    }

    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }

    setPathname(path);
  }, []);

  React.useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = React.useCallback((loggedInUser) => {
    setUser(loggedInUser);
  }, []);

  const handleLogout = React.useCallback(() => {
    setUser(null);
  }, []);

  React.useEffect(() => {
    if (!user && pathname !== '/login') {
      navigate('/login', true);
      return;
    }

    if (user && pathname === '/login') {
      navigate('/', true);
      return;
    }

    if (pathname !== '/' && pathname !== '/login') {
      navigate(user ? '/' : '/login', true);
    }
  }, [navigate, pathname, user]);

  return user ? <App user={user} onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
