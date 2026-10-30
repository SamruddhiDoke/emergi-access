import { useEffect, useState } from 'react';
import { AlertTriangle, Pill, Phone, Star, Lock, Droplet, Activity, History as HistoryIcon, Users, Siren, Download } from 'lucide-react';
import { Badge } from './ui/Feedback';
import { humanize, SPECIALTY_LABELS } from '../utils/format';
import { api, download } from '../services/api';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Feedback';

const ALLERGY_TONE = { LIFE_THREATENING: 'danger', SEVERE: 'danger', MODERATE: 'warning', MILD: 'neutral' };
const CONDITION_TONE = { CRITICAL: 'danger', MAJOR: 'warning', MINOR: 'neutral' };

export function SectionCard({ icon: Icon, title, count, accent = 'neutral', children, action }) {
  const accents = {
    neutral: 'bg-canvas text-muted ring-line',
    danger: 'bg-red-50 text-red-600 ring-red-600/10',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/15',
    brand: 'bg-brand-50 text-brand-700 ring-brand-600/10',
  };
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className={`flex size-7 items-center justify-center rounded-lg ring-1 ${accents[accent]}`}><Icon className="size-3.5" strokeWidth={2.25} /></span>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {count !== undefined && <span className="tabular rounded-full bg-ink/[0.05] px-1.5 text-[11px] font-medium text-muted">{count}</span>}
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

const Empty = ({ text = 'None recorded' }) => <p className="px-5 py-4 text-[13px] text-subtle">{text}</p>;
const RowWrap = ({ children }) => <li className="flex items-start justify-between gap-4 px-5 py-3">{children}</li>;

export function AllergyList({ items }) {
  if (!items?.length) return <Empty />;
  return (
    <ul className="divide-y divide-line">
      {items.map((a, i) => (
        <RowWrap key={a.id || i}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{a.allergen}</p>
            {a.reaction && <p className="mt-0.5 text-[13px] text-muted">{a.reaction}</p>}
          </div>
          <Badge tone={ALLERGY_TONE[a.severity]} icon={a.severity === 'LIFE_THREATENING' ? AlertTriangle : undefined}>{humanize(a.severity)}</Badge>
        </RowWrap>
      ))}
    </ul>
  );
}

export function ConditionList({ items }) {
  if (!items?.length) return <Empty />;
  return (
    <ul className="divide-y divide-line">
      {items.map((c, i) => (
        <RowWrap key={c.id || i}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{c.name}</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {[SPECIALTY_LABELS[c.category], c.diagnosedYear && `since ${c.diagnosedYear}`].filter(Boolean).join(' · ')}
              {c.notes && <span className="block">{c.notes}</span>}
            </p>
          </div>
          <Badge tone={CONDITION_TONE[c.severity]}>{humanize(c.severity)}</Badge>
        </RowWrap>
      ))}
    </ul>
  );
}

export function MedicationList({ items }) {
  if (!items?.length) return <Empty />;
  return (
    <ul className="divide-y divide-line">
      {items.map((m, i) => (
        <RowWrap key={m.id || i}>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{m.name}</p>
            {(m.dosage || m.frequency) && <p className="mt-0.5 text-[13px] text-muted">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>}
            {m.alertNote && (m.isCritical ?? true) && (
              <p className="mt-1.5 inline-flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-600/15">
                <AlertTriangle className="mt-px size-3 shrink-0" />{m.alertNote}
              </p>
            )}
          </div>
          {m.isCritical && <Badge tone="warning">Alert</Badge>}
        </RowWrap>
      ))}
    </ul>
  );
}

export function AlertList({ items }) {
  if (!items?.length) return <Empty text="No critical alerts" />;
  return (
    <ul className="divide-y divide-amber-600/10">
      {items.map((a, i) => (
        <li key={a.id || i} className="flex items-start gap-3 bg-amber-50/40 px-5 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-ink">{a.title}</p>
            {a.details && <p className="mt-0.5 text-[13px] text-muted">{a.details}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HistoryList({ items }) {
  if (!items?.length) return <Empty />;
  return (
    <ul className="px-5 py-2">
      {items.map((h, i) => (
        <li key={h.id || i} className="relative flex gap-4 py-2.5 pl-5">
          <span className="absolute left-0 top-[18px] size-2 rounded-full bg-line-strong ring-4 ring-white" />
          {i < items.length - 1 && <span className="absolute left-[3.5px] top-6 h-full w-px bg-line" />}
          <span className="tabular w-10 shrink-0 text-[13px] font-medium text-muted">{h.year || '—'}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{h.title}</p>
            <p className="mt-0.5 text-[13px] text-muted">{[SPECIALTY_LABELS[h.category], h.notes].filter(Boolean).join(' · ')}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ContactList({ items }) {
  if (!items?.length) return <Empty />;
  return (
    <ul className="divide-y divide-line">
      {items.map((c, i) => (
        <RowWrap key={c.id || i}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-semibold text-muted ring-1 ring-line">{c.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">{c.name}{c.isPrimary && <Star className="size-3 fill-amber-400 text-amber-400" aria-label="Primary" />}</p>
              <p className="text-[13px] text-muted">{c.relationship}</p>
            </div>
          </div>
          <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="tabular inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-brand-700 hover:bg-brand-50">
            <Phone className="size-3.5" />{c.phone}
          </a>
        </RowWrap>
      ))}
    </ul>
  );
}

export function BloodGroupTile({ value, compact }) {
  return (
    <div className={`flex items-center gap-4 ${compact ? '' : 'card p-5'}`}>
      <span className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-600/10"><Droplet className="size-5" /></span>
      <div>
        <p className="text-[13px] font-medium text-muted">Blood group</p>
        <p className="text-[28px] font-semibold leading-none tracking-tight text-ink">{value || '—'}</p>
      </div>
    </div>
  );
}

export function WithheldNotice({ categories }) {
  if (!categories?.length) return null;
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-white px-5 py-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-ink"><Lock className="size-3.5 text-muted" />Withheld for your role</p>
      <p className="mt-1 text-[13px] text-muted">These categories were not sent to your device under the minimum-necessary policy.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {categories.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded-md bg-ink/[0.04] px-2 py-1 text-xs text-muted"><Lock className="size-3" />{c}</span>)}
      </div>
    </div>
  );
}

export const SECTION_ICONS = { Activity, Pill, HistoryIcon, Users, Siren, AlertTriangle };

/** The patient's QR card — fetched from the API (payload is the opaque Emergency ID only). */
export function QrCard({ size = 'md', onLoaded }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api('/patients/me/qr').then((d) => { setQr(d); onLoaded?.(d); }).catch(setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const big = size === 'lg';
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-navy-800 text-white shadow-[var(--shadow-raised)] ${big ? 'p-7' : 'p-5'}`}>
      <div className="hairline-grid absolute inset-0 opacity-20 [filter:invert(1)]" />
      <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">Emergi-Access</p>
            <p className={`font-semibold tracking-tight ${big ? 'text-lg' : 'text-[15px]'}`}>Emergency Medical ID</p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15"><Siren className="size-4 text-brand-300" /></span>
        </div>
        <div className={`mt-5 flex items-center ${big ? 'gap-6' : 'gap-4'}`}>
          <div className={`shrink-0 rounded-xl bg-white p-2 ${big ? 'size-44' : 'size-28'}`}>
            {qr ? <img src={qr.dataUrl} alt={`QR code for Emergency ID ${qr.emergencyId}`} className="size-full" /> : error ? <p className="p-2 text-xs text-red-600">{error.message}</p> : <Skeleton className="size-full" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Emergency ID</p>
            <p className={`mt-1 break-all font-mono font-semibold tracking-wide ${big ? 'text-lg' : 'text-sm'}`}>{qr?.emergencyId || '••••'}</p>
            <p className="mt-3 text-[11px] leading-4 text-white/55">For healthcare professionals: scan with Emergi-Access. This code contains no medical information.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DownloadQrButton({ emergencyId, ...props }) {
  return (
    <Button icon={Download} onClick={() => download('/patients/me/qr.png', `emergi-access-${emergencyId || 'qr'}.png`)} {...props}>
      Download QR
    </Button>
  );
}
