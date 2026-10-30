import { motion } from 'framer-motion';
import {
  QrCode, BadgeCheck, Siren, Filter, TimerReset, ScrollText, UserPlus, ScanLine, KeyRound, Lock, EyeOff, Ban,
} from 'lucide-react';

export const MECHANISMS = [
  { icon: QrCode, title: 'Privacy-preserving QR identification', text: 'The QR holds an opaque, 80-bit random Emergency ID. No name, no blood group, no diagnosis — scanning it alone reveals nothing.' },
  { icon: BadgeCheck, title: 'Verified professional authentication', text: 'Clinicians sign in with a second factor, and their credentials must be verified before any emergency workflow unlocks.' },
  { icon: Siren, title: 'Controlled break-glass access', text: 'Every emergency access requires a stated reason, a written justification, explicit acknowledgement and one-time verification.' },
  { icon: Filter, title: 'Minimum-necessary disclosure', text: 'The server filters the record by role. A paramedic, doctor and specialist each receive a different, purpose-fit view.' },
  { icon: TimerReset, title: 'Temporary, revocable authorization', text: 'Access expires on the database clock and can be revoked instantly by the patient or an administrator.' },
  { icon: ScrollText, title: 'Immutable audit trail', text: 'Every attempt — granted or denied — is written to an append-only log that cannot be edited or deleted.' },
];

export const STEPS = [
  { icon: UserPlus, title: 'Patient registers', text: 'Creates a medical emergency profile with allergies, conditions, medications and contacts.' },
  { icon: QrCode, title: 'Emergency QR is issued', text: 'A random Emergency ID is generated and encoded as a QR card for wallet, phone or wristband.' },
  { icon: ScanLine, title: 'QR is scanned', text: 'A clinician scans the card. The server confirms identity with initials and age only.' },
  { icon: BadgeCheck, title: 'Professional authenticates', text: 'Session, verified status and role are checked fresh against the database.' },
  { icon: Siren, title: 'Controlled authorization', text: 'Reason, justification, acknowledgement and a one-time code open a break-glass request.' },
  { icon: Filter, title: 'Minimum-necessary disclosure', text: 'Only the categories permitted for that role are assembled and returned.' },
  { icon: TimerReset, title: 'Automatic expiry', text: 'A countdown runs; when it reaches zero the server refuses every further request.' },
  { icon: ScrollText, title: 'Audit logging', text: 'The full sequence is recorded and visible to the patient and administrators.' },
];

export const SECURITY_POINTS = [
  { icon: EyeOff, title: 'Opaque identifiers', text: 'Emergency IDs are generated from a cryptographic random source and carry no patient attributes.' },
  { icon: Filter, title: 'Server-side role filtering', text: 'The browser never receives fields a role is not entitled to. There is nothing hidden with CSS.' },
  { icon: KeyRound, title: 'Break-glass with a second factor', text: 'Emergency access requires a one-time code. Wrong codes are counted; five failures deny the request.' },
  { icon: TimerReset, title: 'Expiry on the database clock', text: 'Expiry is compared against PostgreSQL time on every request — browser timers are display only.' },
  { icon: Ban, title: 'Instant revocation', text: 'Revoked authorizations are rejected on the very next request, regardless of any token the client holds.' },
  { icon: Lock, title: 'Hardened sessions', text: 'HttpOnly SameSite cookies, CSRF tokens, server-side session revocation, bcrypt hashing and rate limiting.' },
];

export function SectionHeading({ eyebrow, title, description, align = 'left', inverted }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className={`eyebrow ${inverted ? '!text-brand-300' : ''}`}>{eyebrow}</p>}
      <h2 className={`mt-3 text-[32px] font-semibold leading-[1.12] tracking-tight sm:text-[40px] ${inverted ? 'text-white' : 'text-ink'}`}>{title}</h2>
      {description && <p className={`mt-4 text-base leading-7 ${inverted ? 'text-white/65' : 'text-muted'}`}>{description}</p>}
    </div>
  );
}

const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

export function MechanismGrid() {
  return (
    <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {MECHANISMS.map((m, i) => (
        <motion.div key={m.title} {...reveal} transition={{ delay: i * 0.05, duration: 0.4 }} className="group bg-white p-7 transition-colors hover:bg-canvas/60">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/10 transition-colors group-hover:bg-brand-600 group-hover:text-white">
              <m.icon className="size-[18px]" />
            </span>
            <span className="tabular text-xs font-semibold text-subtle">0{i + 1}</span>
          </div>
          <h3 className="mt-5 text-[15px] font-semibold text-ink">{m.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{m.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function WorkflowTimeline() {
  return (
    <ol className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <motion.li key={s.title} {...reveal} transition={{ delay: (i % 4) * 0.06, duration: 0.4 }} className="card relative p-5">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-lg bg-navy-800 text-brand-300">
              <s.icon className="size-4" />
            </span>
            <span className="tabular text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">Step {i + 1}</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">{s.title}</h3>
          <p className="mt-1.5 text-[13px] leading-5 text-muted">{s.text}</p>
          {i < STEPS.length - 1 && <span className="absolute -right-3 top-1/2 hidden h-px w-2 bg-line-strong lg:block" />}
        </motion.li>
      ))}
    </ol>
  );
}
