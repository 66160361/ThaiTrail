import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — ห่อหน้าที่ต้องการ login
 * - loading: แสดง spinner รอ
 * - ไม่มี user: redirect ไป /login
 * - มี user: render ปกติ
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    // รอ AuthContext โหลด cache/session ก่อน ป้องกัน redirect ผิด
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg, #F5F0EB)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(137,81,0,0.15)',
          borderTopColor: '#FF9F1C',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
