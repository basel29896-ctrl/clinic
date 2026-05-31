import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate routes by auth + role.
 * @param {('admin'|'patient')} [role] Required role. Omit to allow any authed user.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, role: userRole, loading, signOut } = useAuth();
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

  // Authenticated but the profile row hasn't loaded (missing row, RLS, or
  // schema not migrated). Don't redirect — that loops to a blank page.
  // Surface the real problem instead.
  if (!userRole) {
    return (
      <div className="grid h-screen place-items-center bg-gray-100 p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-800">Account not provisioned</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your login works, but no profile/role was found. Run the database
            migration and set your role:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-100 p-3 text-start text-xs text-gray-700">
{`update public.profiles
set role='admin'
where email='${user.email}';`}
          </pre>
          <button
            onClick={signOut}
            className="mt-4 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  // Wrong role for this area: send patient to portal, admin to dashboard.
  // Both targets render under a matching ProtectedRoute, so no loop.
  if (role && userRole !== role) {
    return <Navigate to={userRole === 'patient' ? '/patient' : '/'} replace />;
  }

  return children;
}
