import { motion } from 'framer-motion';
import { ArrowRight, Zap, ShieldHalf, Check, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import HeroVisual from './HeroVisual';
import { MechanismGrid, WorkflowTimeline, SectionHeading, SECURITY_POINTS } from './sections';

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-28 lg:pt-20">
        <div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-xs font-medium text-muted shadow-[var(--shadow-card)]">
            <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Prototype</span>
            Government of Maharashtra Hackathon
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="mt-6 text-[42px] font-semibold leading-[1.04] tracking-[-0.035em] text-navy-800 sm:text-[56px] lg:text-[62px]"
          >
            Critical medical information.{' '}
            <span className="text-brand-600">When every second matters.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5 }} className="mt-6 max-w-xl text-[17px] leading-8 text-muted">
            Emergency medical access, reimagined around patient privacy. Empower verified healthcare professionals with secure, time-limited access to essential medical information when patients cannot speak for themselves.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to="/register" size="lg" iconRight={ArrowRight}>Get Started</Button>
            <Button to="/how-it-works" size="lg" variant="secondary">Explore How It Works</Button>
          </motion.div>
          <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
            {[
              ['0 bytes', 'medical data in the QR'],
              ['5 min', 'default access window'],
              ['100%', 'of attempts audited'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="tabular text-xl font-semibold tracking-tight text-ink">{v}</dt>
                <dd className="mt-1 text-xs leading-5 text-muted">{l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <SectionHeading
        eyebrow="The problem"
        title="Emergencies need information fast. Medical records need protection always."
        description="An unconscious patient cannot tell a paramedic about a life-threatening allergy. But giving every responder unrestricted access to complete medical records creates serious privacy risks. Today, systems tend to fail one way or the other."
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="card p-7">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/15"><Zap className="size-[18px]" /></span>
          <h3 className="mt-5 text-lg font-semibold text-ink">Information availability</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Clinicians must know blood group, severe allergies, critical conditions and medications within minutes — often with no family present.</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {['Delayed history means delayed treatment', 'Unknown allergies risk fatal drug reactions', 'Anticoagulants change every intervention'].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-ink"><X className="mt-0.5 size-4 shrink-0 text-amber-600" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-subtle shadow-[var(--shadow-card)]">versus</span>
        </div>
        <div className="card p-7">
          <span className="flex size-10 items-center justify-center rounded-xl bg-navy-800 text-brand-300"><ShieldHalf className="size-[18px]" /></span>
          <h3 className="mt-5 text-lg font-semibold text-ink">Patient privacy</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Medical records are among the most sensitive personal data. Broad, unlogged access invites misuse and erodes trust.</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {['Over-disclosure exposes unrelated history', 'Unrestricted access cannot be justified', 'Without logs, misuse goes unnoticed'].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-ink"><X className="mt-0.5 size-4 shrink-0 text-navy-600" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="border-y border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <SectionHeading
          eyebrow="The solution"
          title="Six mechanisms. One principle: no more than necessary."
          description="Emergi-Access delivers critical medical information to the right healthcare professional, at the right time, without exposing more patient information than necessary."
        />
        <MechanismGrid />
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading eyebrow="How it works" title="From registration to accountable access in eight steps." />
        <Button to="/how-it-works" variant="secondary" iconRight={ArrowRight}>Full walkthrough</Button>
      </div>
      <WorkflowTimeline />
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="relative overflow-hidden bg-navy-800">
      <div className="hairline-grid absolute inset-0 opacity-30 [filter:invert(1)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              inverted
              eyebrow="Security & privacy"
              title="Every decision enforced on the server."
              description="The interface never decides what a clinician may see. Authorization, role filtering, expiry and revocation are validated against PostgreSQL on every request."
            />
            <Button to="/security" variant="secondary" className="mt-8" iconRight={ArrowRight}>Security architecture</Button>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
            {SECURITY_POINTS.map((p) => (
              <div key={p.title} className="bg-navy-800 p-6">
                <p.icon className="size-[18px] text-brand-300" />
                <h3 className="mt-4 text-sm font-semibold text-white">{p.title}</h3>
                <p className="mt-1.5 text-[13px] leading-5 text-white/60">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
      <div className="card relative overflow-hidden px-8 py-14 text-center sm:px-14">
        <div className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-[30px] font-semibold leading-tight tracking-tight text-navy-800 sm:text-[40px]">
            Make emergency information accessible. <span className="text-brand-600">Keep patient privacy protected.</span>
          </h2>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button to="/register" size="lg" iconRight={ArrowRight}>Create your Emergency ID</Button>
            <Button to="/pro/login" size="lg" variant="secondary">Professional sign in</Button>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted">
            {['Free to register', 'Revoke access any time', 'See every access to your record'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-brand-600" />{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <HowItWorksSection />
      <SecuritySection />
      <FinalCta />
    </>
  );
}
