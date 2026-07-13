import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a route that requires authentication.
 * - If loading session: show spinner
 * - If not logged in: redirect to /login
 * - If logged in but not yet onboarded (and requireOnboarding=true): redirect to /onboarding
 */
function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboarding && !user.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export default ProtectedRoute;
