import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanLine, ArrowRight, ShieldCheck, Clock3, Activity, History, BadgeCheck, Hourglass, Building2, KeyRound } from 'lucide-react';
import { useApi, useInterval, useCountdown } from '../../hooks/useApi';
import { Card, CardHeader, StatCard, Table } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState, EmptyState, StatusBadge, Banner, Badge } from '../../components/ui/Feedback';
import { ManualEntry } from '../emergency/ManualEntry';
import { useAuth } from '../../context/AuthContext';
import { CATEGORY_LABELS, REASON_LABELS, ROLE_LABELS, SPECIALTY_LABELS, formatCountdown, timeAgo } from '../../utils/format';

function ActiveRow({ a, serverTime }) {
  const remaining = useCountdown(a.expiresAt, serverTime);
  return (
    <Link to={`/pro/access/${a.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 transition-colors hover:bg-emerald-50">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{a.patientDisplayName}</p>
        <p className="truncate text-xs text-muted">{REASON_LABELS[a.reason]} · <span className="font-mono">{a.patientEmergencyId}</span></p>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular flex items-center gap-1 text-sm font-semibold text-ink"><Clock3 className="size-3.5 text-brand-600" />{formatCountdown(remaining)}</span>
        <ArrowRight className="size-4 text-subtle" />
      </div>
    </Link>
  );
}

export default function ProDashboard() {
  const { user, refresh } = useAuth();
  const { data, error, loading, reload } = useApi('/emergency/dashboard');
  // Verification status can change while signed in (administrator action), so re-read it.
  useEffect(() => { refresh(); }, [refresh]);
  useInterval(() => reload({ silent: true }), 10000);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const pro = user.professional;
  const verified = pro.verificationStatus === 'VERIFIED';
  const { stats, active, recent, serverTime, accessMatrix } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">{ROLE_LABELS[user.role]}{pro.specialty ? ` · ${SPECIALTY_LABELS[pro.specialty]}` : ''}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">{user.fullName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="flex items-center gap-1.5"><Building2 className="size-3.5" />{pro.organization}</span>
            <span className="font-mono text-xs">{pro.professionalId}</span>
            {verified ? <Badge tone="success" icon={BadgeCheck}>Verified</Badge> : <Badge tone="warning" icon={Hourglass}>Pending verification</Badge>}
          </p>
        </div>
      </div>

      {!verified && (
        <Banner tone="warning" icon={Hourglass} title="Verification pending">
          An administrator must verify your professional credentials before emergency access is enabled. Any attempt before then is refused by the server and recorded.
        </Banner>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-navy-800 p-7 text-white shadow-[var(--shadow-raised)]">
          <div className="hairline-grid absolute inset-0 opacity-25 [filter:invert(1)]" />
          <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">Emergency identification</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Scan a patient’s Emergency QR</h2>
            <p className="mt-2 max-w-md text-[13px] leading-5 text-white/65">Identify the patient, state your reason and verify to receive role-scoped emergency information.</p>
            <Link to="/pro/scan" className="group mt-6 inline-flex h-12 items-center gap-3 rounded-xl bg-white pl-4 pr-5 text-[15px] font-semibold text-navy-800 shadow-lg transition-transform hover:-translate-y-0.5">
              <span className="relative flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white">
                <ScanLine className="size-4" />
                <span className="absolute inset-0 animate-ping rounded-lg bg-brand-500/40" />
              </span>
              Scan Emergency QR
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
        <Card>
          <CardHeader icon={KeyRound} title="Manual Emergency ID entry" description="Fallback when the camera is unavailable or the card is damaged." />
          <div className="mt-5"><ManualEntry compact /></div>
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Your role receives</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{accessMatrix.map((c) => <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{CATEGORY_LABELS[c]}</span>)}</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active authorizations" value={stats.activeNow} icon={ShieldCheck} tone="success" />
        <StatCard label="Requests · last 30 days" value={stats.last30Days} icon={Activity} tone="brand" />
        <StatCard label="Total emergency requests" value={stats.totalRequests} icon={History} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader icon={ShieldCheck} title="Active authorizations" description="Sessions you can currently open" />
          <div className="mt-4 space-y-2.5">
            {active.length ? active.map((a) => <ActiveRow key={a.id} a={a} serverTime={serverTime} />) : <EmptyState compact icon={Clock3} title="No active sessions" description="Authorizations appear here while they are valid." />}
          </div>
        </Card>
        <Card padded={false} className="overflow-hidden">
          <div className="p-5 pb-4"><CardHeader icon={History} title="Recent emergency access" action={<Button size="sm" variant="ghost" iconRight={ArrowRight} to="/pro/history">All history</Button>} /></div>
          <Table
            dense
            rows={recent}
            columns={[
              { key: 'p', header: 'Patient', render: (a) => <span className="font-medium">{a.patientDisplayName}</span> },
              { key: 'r', header: 'Reason', render: (a) => <span className="text-muted">{REASON_LABELS[a.reason]}</span> },
              { key: 't', header: 'When', render: (a) => <span className="text-muted">{timeAgo(a.requestedAt)}</span> },
              { key: 's', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
            ]}
            empty={<EmptyState compact icon={History} title="No emergency access yet" />}
          />
        </Card>
      </div>
    </div>
  );
}
