import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-8', inverted = false }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={inverted ? '#ffffff' : '#142B45'} />
      <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill={inverted ? '#087F8C' : '#22b8c6'} />
      <path d="M19 13h6v6h-6z" fill={inverted ? '#142B45' : '#ffffff'} opacity="0.9" />
    </svg>
  );
}

export function Logo({ to = '/', inverted = false, className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Emergi-Access home">
      <LogoMark inverted={inverted} />
      <span className={`text-[15px] font-semibold tracking-tight ${inverted ? 'text-white' : 'text-navy-800'}`}>
        Emergi<span className={inverted ? 'text-brand-300' : 'text-brand-600'}>-</span>Access
      </span>
    </Link>
  );
}
