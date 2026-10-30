import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, CircleDot, Clock3, Ban, ShieldX, CheckCircle2, Hourglass } from 'lucide-react';
import { Button } from './Button';

const TONES = {
  neutral: 'bg-ink/[0.05] text-muted ring-ink/[0.06]',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/15',
  navy: 'bg-navy-800 text-white ring-navy-800',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/15',
};

export function Badge({ tone = 'neutral', icon: Icon, children, className = '', dot }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="size-3" strokeWidth={2.25} />}
      {children}
    </span>
  );
}

const STATUS = {
  ACTIVE: { tone: 'success', label: 'Active', icon: CircleDot },
  PENDING: { tone: 'warning', label: 'Pending', icon: Hourglass },
  EXPIRED: { tone: 'neutral', label: 'Expired', icon: Clock3 },
  REVOKED: { tone: 'danger', label: 'Revoked', icon: Ban },
  DENIED: { tone: 'danger', label: 'Denied', icon: ShieldX },
  VERIFIED: { tone: 'success', label: 'Verified', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', label: 'Rejected', icon: ShieldX },
  SUCCESS: { tone: 'success', label: 'Success', icon: CheckCircle2 },
  FAILURE: { tone: 'warning', label: 'Failure', icon: AlertTriangle },
  SUSPENDED: { tone: 'danger', label: 'Suspended', icon: Ban },
};

/** Status is always conveyed by icon + label, never colour alone. */
export function StatusBadge({ status, label }) {
  const s = STATUS[status] || { tone: 'neutral', label: status };
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {label || s.label}
    </Badge>
  );
}

export function RoleBadge({ role }) {
  const map = { PARAMEDIC: 'brand', DOCTOR: 'navy', SPECIALIST: 'violet', ADMIN: 'neutral', PATIENT: 'neutral' };
  const label = { PARAMEDIC: 'Paramedic', DOCTOR: 'Doctor', SPECIALIST: 'Specialist', ADMIN: 'Admin', PATIENT: 'Patient' }[role] || role;
  return <Badge tone={map[role] || 'neutral'}>{label}</Badge>;
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-ink/[0.06] ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function Spinner({ className = 'size-5' }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-brand-600/25 border-t-brand-600 ${className}`} />;
}

export function EmptyState({ icon: Icon, title, description, action, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'} px-6`}>
      {Icon && (
        <div className="mb-3.5 flex size-11 items-center justify-center rounded-xl border border-line bg-canvas text-subtle">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Unable to load this page' }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3.5 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-[13px] text-muted">{error?.message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} className="mt-4" onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Tooltip({ content, children, side = 'top' }) {
  const [open, setOpen] = useState(false);
  const pos = side === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'top-full mt-2 left-1/2 -translate-x-1/2';
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 w-max max-w-64 rounded-md bg-navy-900 px-2.5 py-1.5 text-xs leading-4 font-medium text-white shadow-lg ${pos}`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Banner({ tone = 'info', icon: Icon, title, children, action, className = '' }) {
  const tones = {
    info: 'border-brand-200 bg-brand-50/70 text-brand-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
    neutral: 'border-line bg-canvas text-ink',
    demo: 'border-dashed border-amber-300 bg-amber-50/70 text-amber-900',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${tones[tone]} ${className}`}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
      <div className="min-w-0 flex-1 text-[13px] leading-5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
