import { Link } from 'react-router-dom';
import { HeartPulse, QrCode, PencilLine, History, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Circle, Clock, Eye } from 'lucide-react';
import { useApi, useInterval } from '../../hooks/useApi';
import { Card, CardHeader, ProgressBar } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState, EmptyState, RoleBadge, StatusBadge, Badge } from '../../components/ui/Feedback';
import { QrCard, DownloadQrButton, BloodGroupTile } from '../../components/medical';
import { ActiveAuthorizationCard } from './ActiveAuthorizationCard';
import { formatDateTime, timeAgo, REASON_LABELS, humanize } from '../../utils/format';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function PatientDashboard() {
  const { data, error, loading, reload } = useApi('/patients/me/dashboard');
  useInterval(() => reload({ silent: true }), 15000);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { profile, active, recent, totals, serverTime } = data;
  const severe = profile.medical.allergies.filter((a) => ['SEVERE', 'LIFE_THREATENING'].includes(a.severity));
  const firstName = profile.user.fullName.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-muted">{greeting()},</p>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink">{firstName}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted"><Clock className="size-3.5" />Profile last updated {formatDateTime(profile.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={HeartPulse} to="/patient/profile">View medical profile</Button>
          <Button variant="secondary" icon={PencilLine} to="/patient/profile/edit">Update information</Button>
        </div>
      </div>

      {active.length > 0 && (
        <Card className="border-brand-200 bg-brand-50/40">
          <CardHeader icon={Eye} title={`Your record is being accessed (${active.length})`} description="A verified professional currently holds emergency access. You can revoke it at any time." action={<Button size="sm" variant="secondary" to="/patient/authorizations">Manage</Button>} />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {active.map((a) => <ActiveAuthorizationCard key={a.id} a={a} serverTime={serverTime} onChanged={() => reload({ silent: true })} />)}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          <QrCard />
          <div className="flex flex-wrap gap-2">
            <DownloadQrButton emergencyId={profile.emergencyId} variant="primary" />
            <Button variant="secondary" icon={QrCode} to="/patient/qr">Open QR card</Button>
          </div>
        </div>
        <div className="grid gap-5">
          <Card>
            <div className="flex items-center justify-between"><BloodGroupTile value={profile.medical.bloodGroup} compact />{!profile.medical.bloodGroup && <Button size="sm" variant="link" to="/patient/profile/edit">Add</Button>}</div>
          </Card>
          <Card>
            <CardHeader icon={AlertTriangle} title="Critical allergy alerts" description="Visible to every authorized clinical role" />
            <div className="mt-4 flex flex-wrap gap-2">
              {severe.length ? severe.map((a) => (
                <Badge key={a.id} tone="danger" icon={AlertTriangle} className="!h-7 !px-2.5 !text-[13px]">{a.allergen} · {humanize(a.severity)}</Badge>
              )) : <p className="text-[13px] text-muted">No severe allergies recorded.</p>}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Profile completeness" description="A complete profile helps clinicians treat you safely." action={<span className="tabular text-2xl font-semibold text-ink">{profile.completion.percent}%</span>} />
          <ProgressBar value={profile.completion.percent} className="mt-4" />
          <ul className="mt-5 space-y-2.5">
            {profile.completion.checks.map((c) => (
              <li key={c.key} className="flex items-center justify-between text-[13px]">
                <span className={`flex items-center gap-2 ${c.done ? 'text-ink' : 'text-muted'}`}>
                  {c.done ? <CheckCircle2 className="size-4 text-brand-600" /> : <Circle className="size-4 text-line-strong" />}{c.label}
                </span>
                {!c.done && <Link to={c.key === 'contacts' ? '/patient/contacts' : c.key === 'personal' ? '/patient/settings' : '/patient/profile/edit'} className="text-xs font-medium text-brand-700 hover:underline">Add</Link>}
              </li>
            ))}
          </ul>
        </Card>

        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader icon={History} title="Recent access history" description={`${Object.values(totals).reduce((s, n) => s + n, 0)} emergency requests on record`} action={<Button size="sm" variant="ghost" iconRight={ArrowRight} to="/patient/access-history">View all</Button>} />
          </div>
          {recent.length === 0 ? (
            <EmptyState compact icon={ShieldCheck} title="No one has accessed your record" description="When a professional requests emergency access, it will appear here." />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {recent.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">{a.professionalName}<RoleBadge role={a.professionalRole} /></p>
                    <p className="mt-0.5 truncate text-xs text-muted">{a.organization} · {REASON_LABELS[a.reason]}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={a.status} />
                    <span className="text-[11px] text-subtle">{timeAgo(a.requestedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
