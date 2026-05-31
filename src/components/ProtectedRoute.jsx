import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate routes by auth + role.
 * @param {('admin'|'patient')} [role] Required role. Omit to allow any authed user.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && userRole !== role) {
    // Wrong role: send patients to portal, admins to dashboard.
    return <Navigate to={userRole === 'patient' ? '/patient' : '/'} replace />;
  }

  return children;
}
