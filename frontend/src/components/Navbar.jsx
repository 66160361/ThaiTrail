import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import thaiTrailLogo from '../../images/thai_trail.png';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSearchClick = (e) => {
    e.preventDefault();
    alert('🔍 ระบบค้นหาจะพร้อมใช้งานเร็วๆ นี้ (กำลังรวมระบบกับเพื่อน)');
  };

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      try {
        await logout();
        navigate('/login');
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left-container" style={{ display: 'flex', alignItems: 'center' }}>
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img
            src={thaiTrailLogo}
            alt="ThaiTrail"
            style={{ height: '52px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </NavLink>
      </div>

      <div className="navbar-links" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          end
        >
          หน้าแรก
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          ค้นหา
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          โปรไฟล์
        </NavLink>
      </div>

      <div className="navbar-right">
        {user && (() => {
          const userKey = user?.email || user?.id;
          const currentName = (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null) || user.name || user.email;
          const currentAvatar = (userKey ? localStorage.getItem(`thaitrail_user_avatar_${userKey}`) : null) || user.avatar_url || user.picture;

          return (
            <NavLink to="/profile" className="user-chip" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={currentName}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div className="user-avatar" style={{
                  background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)',
                  color: '#0369A1',
                  fontWeight: '700',
                  fontSize: '12px',
                }}>
                  {currentName ? currentName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="user-name-text" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentName}
              </span>
            </NavLink>
          );
        })()}
      </div>
    </nav>
  );
}

export default Navbar;
