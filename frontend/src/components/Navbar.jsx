import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/browse" className="navbar-logo" style={{ textDecoration: 'none' }}>
        🗺️ ThaiTrail
      </NavLink>

      <div className="navbar-links">
        <NavLink
          to="/browse"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          🔍 เรียกดูสถานที่
        </NavLink>

        {/* TODO: เพิ่ม link อื่นๆ เมื่อระบบ auth พร้อม */}
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
