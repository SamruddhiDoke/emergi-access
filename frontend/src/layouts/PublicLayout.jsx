import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../utils/format';

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/security', label: 'Security & privacy' },
  { to: '/about', label: 'About' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Block body is required: current Chromium returns a Promise from scrollTo(), and an effect must
  // return nothing or a cleanup function — React would call the Promise on unmount and crash.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className={`sticky top-0 z-40 transition-[background,box-shadow,border-color] duration-200 ${scrolled ? 'border-b border-line bg-white/85 backdrop-blur-md' : 'border-b border-transparent bg-white'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button to={homeForRole(user.role)} iconRight={ArrowRight}>Open portal</Button>
            ) : (
              <>
                <Button to="/pro/login" variant="ghost">Professional sign in</Button>
                <Button to="/login" variant="secondary">Patient sign in</Button>
                <Button to="/register">Get started</Button>
              </>
            )}
          </div>
          <button className="rounded-lg p-2 text-ink md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line bg-white md:hidden">
              <div className="space-y-1 px-5 py-4">
                {NAV.map((n) => (
                  <Link key={n.to} to={n.to} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-canvas">{n.label}</Link>
                ))}
                <div className="grid gap-2 pt-3">
                  <Button to="/register">Get started</Button>
                  <Button to="/login" variant="secondary">Patient sign in</Button>
                  <Button to="/pro/login" variant="secondary">Professional sign in</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-6 text-muted">
              Critical information when needed. Privacy when it matters. A Government of Maharashtra hackathon prototype.
            </p>
          </div>
          {[
            ['Product', [['How it works', '/how-it-works'], ['Security & privacy', '/security'], ['About', '/about']]],
            ['Patients', [['Create your Emergency ID', '/register'], ['Patient sign in', '/login']]],
            ['Professionals', [['Professional sign in', '/pro/login'], ['Request verification', '/pro/register']]],
          ].map(([title, links]) => (
            <div key={title}>
              <p className="text-[13px] font-semibold text-ink">{title}</p>
              <ul className="mt-3 space-y-2.5">
                {links.map(([label, to]) => (
                  <li key={to}><Link to={to} className="text-[13px] text-muted hover:text-ink">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-muted md:flex-row md:items-center md:justify-between lg:px-8">
            <p>© {new Date().getFullYear()} Emergi-Access. Prototype for demonstration — uses synthetic data only.</p>
            <p>Not a certified medical device or clinical system. Clinical decisions remain with qualified professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
