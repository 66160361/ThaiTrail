import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide BottomNav on login & onboarding
  if (location.pathname === '/login' || location.pathname === '/onboarding') {
    return null;
  }

  return (
    <nav className="tt-bottom-nav">
      {/* 1. Home */}
      <NavLink
        to="/"
        end
        className={({ isActive }) => `tt-bottom-nav-item${isActive ? ' is-active' : ''}`}
        title="หน้าแรก"
      >
        <div className="tt-bottom-nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        <span className="tt-bottom-nav-label">หน้าแรก</span>
      </NavLink>

      {/* 2. Search (Explore) */}
      <NavLink
        to="/search"
        className={({ isActive }) => `tt-bottom-nav-item${isActive ? ' is-active' : ''}`}
        title="ค้นหา"
      >
        <div className="tt-bottom-nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <span className="tt-bottom-nav-label">ค้นหา</span>
      </NavLink>

      {/* 3. Profile / Likes */}
      <NavLink
        to="/profile"
        className={({ isActive }) => `tt-bottom-nav-item${isActive ? ' is-active' : ''}`}
        title="โปรไฟล์"
      >
        <div className="tt-bottom-nav-icon">
          {user ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          )}
        </div>
        <span className="tt-bottom-nav-label">{user ? 'โปรไฟล์' : 'เข้าสู่ระบบ'}</span>
      </NavLink>
    </nav>
  );
}

export default BottomNav;
