import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import thaiTrailLogo from '../../images/thai_trail.png';

const PASTEL_PALETTES = [
  { bg: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)', color: '#0369A1' }, // Soft Blue
  { bg: 'linear-gradient(135deg, #FFEDD5, #FED7AA)', color: '#C2410C' }, // Soft Peach
  { bg: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', color: '#15803D' }, // Soft Mint
  { bg: 'linear-gradient(135deg, #F3E8FF, #DDD6FE)', color: '#6D28D9' }, // Soft Lavender
  { bg: 'linear-gradient(135deg, #FFE4E6, #FECDD3)', color: '#BE123C' }, // Soft Rose
  { bg: 'linear-gradient(135deg, #FEF9C3, #FEF08A)', color: '#A16207' }, // Soft Yellow
];

function getPastelStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_PALETTES[Math.abs(hash) % PASTEL_PALETTES.length];
}

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-left-container" style={{ display: 'flex', alignItems: 'center' }}>
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img
            src={thaiTrailLogo}
            alt="ThaiTrail"
            style={{ height: '68px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </NavLink>
      </div>

      {/* Spacer to push everything to the right */}
      <div style={{ flex: 1 }} />

      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          end
          style={{ textDecoration: 'none' }}
        >
          หน้าแรก
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" style={{ display: 'inline-block', flexShrink: 0 }}>
            <path d="M0 0h24v24H0z" fill="none" />
            <path fill="currentColor" d="M9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l5.6 5.6q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14" />
          </svg>
          <span>ค้นหา</span>
        </NavLink>

        {user ? (() => {
          const userKey = user?.email || user?.id;
          // localStorage (รูปที่ user อัปโหลดเอง) มีความสำคัญกว่า user.avatar_url จาก backend
          const currentAvatar = (userKey ? localStorage.getItem(`thaitrail_user_avatar_${userKey}`) : null)
            || localStorage.getItem('thaitrail_user_avatar')
            || user?.avatar_url
            || user?.picture;
          const currentName = (userKey ? localStorage.getItem(`thaitrail_user_name_${userKey}`) : null)
            || localStorage.getItem('thaitrail_user_name')
            || user?.name
            || 'นักเดินทาง';

          const pastel = getPastelStyle(currentName);

          return (
            <NavLink to="/profile" className="user-chip" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={currentName}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div className="user-avatar" style={{
                  background: pastel.bg,
                  color: pastel.color,
                  fontWeight: '700',
                  fontSize: '16px',
                }}>
                  {currentName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="user-name-text" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentName}
              </span>
            </NavLink>
          );
        })() : (
          <NavLink
            to="/login"
            style={{
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #1C2B6E, #2A3F9D)',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: 'Prompt, sans-serif',
              boxShadow: '0 4px 14px rgba(28, 43, 110, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔑</span>
            <span>เข้าสู่ระบบ</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

