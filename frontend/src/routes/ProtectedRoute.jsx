import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../utils/format';
import { LogoMark } from '../components/ui/Logo';

export function SplashScreen() {
  // Free-tier hosting sleeps when idle; explain a slow first response instead of looking frozen.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <LogoMark className="size-10 animate-pulse" />
        <p className="text-[13px] text-muted">Securing your session…</p>
        {slow && (
          <p className="text-xs leading-5 text-subtle">
            The demo server is waking up after a period of inactivity. This can take up to a minute on the first visit.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Client-side routing guard for user experience only. Every API call is independently
 * authorised by the backend; hiding a route here is never the security boundary.
 */
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SplashScreen />;
  if (!user) {
    const loginPath = roles.includes('PATIENT') ? '/login' : '/pro/login';
    return <Navigate to={loginPath} replace state={{ from: location.pathname + location.search }} />;
  }
  if (!roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}
