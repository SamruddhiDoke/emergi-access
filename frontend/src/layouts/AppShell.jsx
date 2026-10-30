import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, HeartPulse, QrCode, Users, History, ShieldCheck, Settings, ScanLine, LogOut, Menu, X,
  UserRound, Stethoscope, BadgeCheck, FileClock, KeyRound, ScrollText, ShieldAlert, BarChart3, ChevronsUpDown,
} from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Dropdown } from '../components/ui/Overlay';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE_LABELS, initials } from '../utils/format';

const NAV = {
  PATIENT: [
    { section: 'My record', items: [
      { to: '/patient', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/patient/profile', label: 'Medical profile', icon: HeartPulse },
      { to: '/patient/qr', label: 'Emergency QR card', icon: QrCode },
      { to: '/patient/contacts', label: 'Emergency contacts', icon: Users },
    ] },
    { section: 'Privacy', items: [
      { to: '/patient/authorizations', label: 'Active access', icon: ShieldCheck },
      { to: '/patient/access-history', label: 'Access history', icon: History },
      { to: '/patient/settings', label: 'Account settings', icon: Settings },
    ] },
  ],
  PROFESSIONAL: [
    { section: 'Emergency', items: [
      { to: '/pro', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/pro/scan', label: 'Scan Emergency QR', icon: ScanLine },
      { to: '/pro/history', label: 'Access history', icon: History },
    ] },
  ],
  ADMIN: [
    { section: 'Overview', items: [
      { to: '/admin', label: 'Command centre', icon: LayoutDashboard, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    ] },
    { section: 'Directory', items: [
      { to: '/admin/patients', label: 'Patients', icon: UserRound },
      { to: '/admin/professionals', label: 'Professionals', icon: Stethoscope },
      { to: '/admin/verification', label: 'Verification queue', icon: BadgeCheck },
    ] },
    { section: 'Access control', items: [
      { to: '/admin/requests', label: 'Access requests', icon: FileClock },
      { to: '/admin/authorizations', label: 'Active authorizations', icon: KeyRound },
      { to: '/admin/audit', label: 'Audit logs', icon: ScrollText },
      { to: '/admin/security', label: 'Suspicious activity', icon: ShieldAlert },
    ] },
    { section: 'System', items: [{ to: '/admin/settings', label: 'System settings', icon: Settings }] },
  ],
};

function navFor(role) {
  if (role === 'PATIENT') return NAV.PATIENT;
  if (role === 'ADMIN') return NAV.ADMIN;
  return NAV.PROFESSIONAL;
}

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const sections = navFor(user.role);
  const subtitle = user.professional ? user.professional.organization : user.role === 'ADMIN' ? 'System administration' : 'Personal health record';

  const signOut = async () => {
    await logout();
    toast.success('Signed out', 'Your session has been ended on the server.');
    navigate(user.role === 'PATIENT' ? '/login' : '/pro/login');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo to="/" />
      </div>
      <div className="px-3 pb-2">
        <div className="rounded-lg border border-line bg-canvas/70 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{user.role === 'PATIENT' ? 'Patient portal' : user.role === 'ADMIN' ? 'Admin console' : 'Clinical portal'}</p>
          <p className="truncate text-[13px] font-medium text-ink">{subtitle}</p>
        </div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {sections.map((s) => (
          <div key={s.section}>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">{s.section}</p>
            <ul className="space-y-0.5">
              {s.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-800' : 'text-muted hover:bg-ink/[0.04] hover:text-ink'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand-600" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        <item.icon className={`size-4 ${isActive ? 'text-brand-600' : ''}`} strokeWidth={isActive ? 2.25 : 2} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <Dropdown
          align="up"
          trigger={
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-ink/[0.04]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">{initials(user.fullName)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{user.fullName}</span>
                <span className="block truncate text-xs text-muted">{ROLE_LABELS[user.role]}{user.professional ? ` · ${user.professional.professionalId}` : ''}</span>
              </span>
              <ChevronsUpDown className="size-4 text-subtle" />
            </button>
          }
          items={[
            { header: <p className="truncate text-xs text-muted">{user.email}</p> },
            ...(user.role === 'PATIENT' ? [{ label: 'Account settings', icon: Settings, onClick: () => navigate('/patient/settings') }] : []),
            { divider: true },
            { label: 'Sign out', icon: LogOut, tone: 'danger', onClick: signOut },
          ]}
        />
      </div>
    </div>
  );
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[256px] border-r border-line bg-white lg:block">
        <Sidebar />
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-ink hover:bg-canvas" aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-navy-950/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="relative h-full w-[272px] bg-white shadow-[var(--shadow-pop)]"
            >
              <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-subtle hover:bg-canvas" aria-label="Close navigation">
                <X className="size-4" />
              </button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-[256px]">
        {/* Enter-only transition: an exit phase can strand lazily loaded pages at opacity 0. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9"
        >
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </motion.div>
      </main>
    </div>
  );
}
