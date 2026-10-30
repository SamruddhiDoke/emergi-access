import { motion } from 'framer-motion';
import { ShieldCheck, Clock3, ScrollText, EyeOff } from 'lucide-react';
import { Logo } from '../components/ui/Logo';

const POINTS = {
  patient: [
    { icon: EyeOff, title: 'Your QR carries no medical data', text: 'Only an opaque Emergency ID. Scanning it alone reveals nothing.' },
    { icon: ShieldCheck, title: 'Verified professionals only', text: 'Access requires a verified clinician, a stated reason and a second factor.' },
    { icon: ScrollText, title: 'You see every access', text: 'Each request, view and revocation appears in your access history.' },
  ],
  professional: [
    { icon: ShieldCheck, title: 'Role-scoped disclosure', text: 'You receive exactly what your role needs to treat — nothing more.' },
    { icon: Clock3, title: 'Time-limited authorization', text: 'Emergency access expires automatically and can be revoked at any time.' },
    { icon: ScrollText, title: 'Fully accountable', text: 'Every break-glass action is recorded in an immutable audit trail.' },
  ],
};

export default function AuthLayout({ children, variant = 'patient', title, subtitle, wide = false }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:order-none">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full ${wide ? 'max-w-2xl' : 'max-w-[400px]'}`}
          >
            {title && <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>}
            {subtitle && <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>}
            <div className={title ? 'mt-8' : ''}>{children}</div>
          </motion.div>
        </div>
        <p className="text-xs text-subtle">Hackathon prototype · synthetic demonstration data only</p>
      </div>

      <div className="relative hidden overflow-hidden bg-navy-800 lg:block">
        <div className="hairline-grid absolute inset-0 opacity-[0.35] [filter:invert(1)]" />
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-12 xl:p-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">{variant === 'patient' ? 'For patients' : 'For healthcare professionals'}</p>
          <h2 className="mt-3 max-w-md text-[30px] font-semibold leading-[1.15] tracking-tight text-white">
            {variant === 'patient' ? 'Ready in an emergency. Private every other moment.' : 'The right information, at the right moment, for the right role.'}
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS[variant].map((p, i) => (
              <motion.li key={p.title} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-brand-300 ring-1 ring-white/10">
                  <p.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{p.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-white/60">{p.text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
