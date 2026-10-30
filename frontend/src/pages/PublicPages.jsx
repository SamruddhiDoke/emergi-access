import { ArrowRight, Check, X, Ambulance, Stethoscope, HeartPulse, UserRound, ShieldCheck, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MechanismGrid, WorkflowTimeline, SectionHeading, SECURITY_POINTS } from './sections';

function PageHero({ eyebrow, title, description }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_70%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      </div>
    </section>
  );
}

const MATRIX_ROWS = [
  ['Blood group', true, true, true, true],
  ['Critical medical alerts', true, true, true, true],
  ['Severe allergies', true, true, true, true],
  ['Major medical conditions', true, true, 'Specialty only', true],
  ['Medication alerts', true, true, 'Specialty only', true],
  ['Full current medications', false, true, 'Specialty only', true],
  ['Relevant medical history', false, true, 'Specialty only', true],
  ['Emergency contacts', true, false, false, true],
  ['Mild allergies & minor conditions', false, false, false, true],
];

export function AccessMatrix() {
  const cell = (v) =>
    v === true ? <Check className="mx-auto size-4 text-brand-600" strokeWidth={2.5} /> : v === false ? <X className="mx-auto size-4 text-subtle" /> : <span className="text-xs font-medium text-violet-700">{v}</span>;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/70 text-left">
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Information category</th>
              {[[Ambulance, 'Paramedic'], [Stethoscope, 'Doctor'], [HeartPulse, 'Specialist'], [UserRound, 'Patient']].map(([Icon, l]) => (
                <th key={l} className="px-4 py-3 text-center text-[13px] font-semibold text-ink">
                  <span className="inline-flex items-center gap-1.5"><Icon className="size-4 text-muted" />{l}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map(([label, ...vals]) => (
              <tr key={label} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-3 font-medium text-ink">{label}</td>
                {vals.map((v, i) => <td key={i} className="px-4 py-3 text-center">{cell(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line bg-canvas/50 px-5 py-3 text-xs text-muted">
        Administrators see account metadata and audit records only — never clinical values. Specialists are scoped to their administrator-verified specialty.
      </p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <>
      <PageHero eyebrow="How it works" title="A fast path in an emergency. A controlled one, always." description="Emergi-Access turns an opaque QR code into a short, accountable, role-scoped window of access — and closes it automatically." />
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="End to end" title="The eight-step journey" />
        <WorkflowTimeline />
      </section>
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <SectionHeading eyebrow="Break-glass" title="What happens when a clinician scans" description="Each step is validated by the backend. Skipping or forging a step in the browser achieves nothing — the server simply refuses." />
          <ol className="space-y-3">
            {[
              ['Identify', 'Server resolves the Emergency ID and returns initials, age and sex only.'],
              ['Authenticate', 'The professional’s session, verification status and role are re-read from the database.'],
              ['Reason & justification', 'A standard emergency reason plus a written explanation of at least 15 characters.'],
              ['Acknowledge', 'Explicit confirmation that this access is monitored and recorded.'],
              ['Verify', 'A one-time code (simulated in this prototype). Five wrong codes deny the request.'],
              ['Authorize', 'A time-limited authorization is created with an expiry set from the database clock.'],
              ['Disclose', 'Only the categories permitted for that role are assembled and sent.'],
              ['Expire or revoke', 'After expiry or revocation every protected request is rejected.'],
            ].map(([t, d], i) => (
              <li key={t} className="card flex gap-4 p-4">
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                <div><p className="text-sm font-semibold text-ink">{t}</p><p className="mt-0.5 text-[13px] leading-5 text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Minimum necessary" title="Who sees what" description="The same record, three different clinical views. Filtering happens on the server before anything is sent." />
        <div className="mt-10"><AccessMatrix /></div>
        <div className="mt-10 flex gap-3"><Button to="/register" iconRight={ArrowRight}>Get started</Button><Button to="/security" variant="secondary">Security details</Button></div>
      </section>
    </>
  );
}

export function Security() {
  return (
    <>
      <PageHero eyebrow="Security & privacy" title="Privacy is the default. Access is the exception." description="Every security-relevant decision is made by the backend and recorded. Here is how the prototype enforces it." />
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY_POINTS.map((p) => (
            <div key={p.title} className="card p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/10"><p.icon className="size-[18px]" /></span>
              <h3 className="mt-5 text-[15px] font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionHeading eyebrow="Controls" title="Implemented safeguards" />
            <ul className="mt-8 space-y-3 text-sm">
              {[
                'bcrypt password hashing; OTPs stored only as keyed HMAC hashes',
                'JWT in HttpOnly, SameSite=Strict cookies backed by server-side sessions',
                'Double-submit CSRF tokens on every state-changing request',
                'Role and verification status re-read from the database on every request',
                'Ownership checks that return 404 for other users’ resources (no IDOR oracle)',
                'Expiry evaluated against PostgreSQL now() — never the browser clock',
                'Append-only audit log enforced by a database trigger',
                'Rate limiting (Redis-backed when available), Helmet security headers, strict CORS',
                'Zod validation with unknown fields stripped; identifiers never accepted from the client',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" /><span className="text-ink">{t}</span></li>
              ))}
            </ul>
          </div>
          <div className="card self-start p-6">
            <div className="flex items-center gap-2.5"><Info className="size-4 text-amber-600" /><h3 className="text-[15px] font-semibold text-ink">Prototype limitations — stated plainly</h3></div>
            <ul className="mt-4 space-y-3 text-[13px] leading-6 text-muted">
              <li>• One-time codes are <strong className="text-ink">simulated</strong>: in demo mode the code is displayed on screen. No SMS or email gateway is connected.</li>
              <li>• Professional verification is performed manually by an administrator. There is <strong className="text-ink">no connection</strong> to a government licensing registry.</li>
              <li>• All patient data is <strong className="text-ink">synthetic</strong>. The system has not been assessed for clinical safety or regulatory compliance.</li>
              <li>• Production deployment would additionally require encryption at rest, key management, HTTPS everywhere, penetration testing and formal compliance review.</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading eyebrow="Disclosure policy" title="The access matrix" />
        <div className="mt-10"><AccessMatrix /></div>
      </section>
    </>
  );
}

export function About() {
  return (
    <>
      <PageHero eyebrow="About Emergi-Access" title="Critical information when needed. Privacy when it matters." description="Emergi-Access is a privacy-preserving emergency medical information access platform, built as a prototype for the Government of Maharashtra Hackathon." />
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
        <div className="space-y-5 text-[15px] leading-7 text-muted">
          <p>When a patient is unconscious or unable to communicate, the people treating them have minutes to understand allergies, conditions and medications. Emergi-Access gives every registered patient a QR-based Emergency ID that verified professionals can use to request a short, monitored window of access.</p>
          <p>The QR code itself carries no medical information. What a clinician sees depends on their role, and access closes automatically. Patients can see every access to their record and revoke it at any time.</p>
          <p className="text-ink"><strong>Emergi-Access is an information access system, not a diagnostic or treatment system.</strong> Human healthcare professionals remain responsible for every clinical decision.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Patients', 'Own their emergency profile, QR card, and complete visibility of who accessed it.'],
            ['Paramedics', 'Get the essentials for the scene: allergies, critical conditions, medication alerts, contacts.'],
            ['Doctors', 'See current medications and relevant history to guide emergency treatment.'],
            ['Specialists', 'Receive only records within their verified specialty, for a stated treatment purpose.'],
          ].map(([t, d]) => (
            <div key={t} className="card p-5"><p className="text-sm font-semibold text-ink">{t}</p><p className="mt-1.5 text-[13px] leading-5 text-muted">{d}</p></div>
          ))}
        </div>
      </section>
      <section className="border-t border-line bg-canvas"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><SectionHeading eyebrow="Core innovation" title="Six mechanisms working together" /><MechanismGrid /></div></section>
    </>
  );
}

export function NotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-5 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">This page doesn’t exist</h1>
      <p className="mt-3 text-sm text-muted">The link may be broken or the page may have moved.</p>
      <Button to="/" className="mt-8">Back to home</Button>
    </section>
  );
}
