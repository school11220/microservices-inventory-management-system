import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store';
import type { Role } from '../types/api';

export function ProtectedRoute() {
  const { status, token, user } = useAppSelector((state) => state.auth);
  if (status === 'checking') {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-on-surface">
        <div className="grid justify-items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container p-8 shadow-panel">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
          <p className="text-sm font-semibold text-on-surface-variant">Checking secure session...</p>
        </div>
      </main>
    );
  }
  return token && user ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RoleRoute({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const user = useAppSelector((state) => state.auth.user);
  return user && roles.includes(user.role) ? children : <Navigate to="/products" replace />;
}
