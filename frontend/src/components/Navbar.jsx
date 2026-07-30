import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
        🗺️ ThaiTrail
      </NavLink>

      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          end
        >
          ✨ แนะนำสถานที่
        </NavLink>
        <NavLink
          to="/search"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          🔎 ค้นหาสถานที่
        </NavLink>
      </div>

      <div className="navbar-right">
        {/* TODO: แสดง user chip เมื่อมีระบบ auth */}
        <NavLink to="/login" className="btn btn-primary btn-sm">
          เข้าสู่ระบบ
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
