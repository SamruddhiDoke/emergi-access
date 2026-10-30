import { Link } from 'react-router-dom';
import { UserRound, BadgeCheck, Activity, ShieldCheck, Clock3, Ban, ShieldX, ArrowRight, ShieldAlert, ScrollText, RefreshCw } from 'lucide-react';
import { useApi, useInterval } from '../../hooks/useApi';
import { PageHeader, Card, CardHeader, StatCard } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState, EmptyState, Badge, RoleBadge } from '../../components/ui/Feedback';
import { TimeSeriesChart, Legend, HorizontalBars, StatusMeters } from './charts';
import { actionMeta } from './auditLabels';
import { ROLE_LABELS, timeAgo } from '../../utils/format';

export const SEVERITY_TONE = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'neutral' };

export default function AdminDashboard() {
  const { data, error, loading, reload } = useApi('/admin/dashboard');
  useInterval(() => reload({ silent: true }), 15000);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  const m = data.metrics;
  const last14 = data.activity.reduce((s, d) => s + d.requests, 0);

  return (
    <>
      <PageHeader
        eyebrow="Command centre"
        title="System overview"
        description="Live metrics from PostgreSQL. Administrators see access metadata and audit records — never clinical data."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={() => reload()}>Refresh</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered patients" value={m.totalPatients} icon={UserRound} to="/admin/patients" />
        <StatCard label="Verified professionals" value={m.verifiedProfessionals} icon={BadgeCheck} tone="brand" hint={m.pendingVerification ? `${m.pendingVerification} awaiting verification` : 'No pending verifications'} to="/admin/verification" />
        <StatCard label="Active emergency sessions" value={m.activeSessions} icon={ShieldCheck} tone="success" to="/admin/authorizations" />
        <StatCard label="Total access requests" value={m.totalRequests} icon={Activity} hint={`${last14} in the last 14 days`} to="/admin/requests" />
        <StatCard label="Expired authorizations" value={m.expiredAuthorizations} icon={Clock3} />
        <StatCard label="Revoked authorizations" value={m.revokedAuthorizations} icon={Ban} tone="danger" />
        <StatCard label="Denied access attempts" value={m.deniedAttempts} icon={ShieldX} tone="warning" hint="All denied events in the audit log" to="/admin/audit?outcome=DENIED" />
        <StatCard label="Suspicious activity alerts" value={data.alertCount} icon={ShieldAlert} tone={data.alertCount ? 'danger' : 'neutral'} hint="Last 24 hours" to="/admin/security" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Emergency access activity" description="Break-glass requests and denied events per day · last 14 days" action={<Legend items={[{ label: 'Requests' }, { label: 'Denied events' }]} />} />
          <div className="mt-5"><TimeSeriesChart data={data.activity} series={[{ key: 'requests', label: 'Requests' }, { key: 'denied', label: 'Denied events' }]} /></div>
        </Card>
        <Card>
          <CardHeader title="Authorization status" description="All authorizations on record" />
          <div className="mt-5"><StatusMeters data={data.statusDistribution} /></div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Access by role" description="Authorizations requested per clinical role" />
          <div className="mt-4"><HorizontalBars data={data.roleDistribution} labelKey="role" name="Requests" format={(r) => ROLE_LABELS[r] || r} /></div>
        </Card>
        <Card padded={false}>
          <div className="p-5 pb-3"><CardHeader icon={ShieldAlert} title="Suspicious activity" action={<Button size="sm" variant="ghost" iconRight={ArrowRight} to="/admin/security">All</Button>} /></div>
          {data.alerts.length === 0 ? <EmptyState compact icon={ShieldCheck} title="No alerts" description="No unusual patterns in the last 24 hours." /> : (
            <ul className="divide-y divide-line border-t border-line">
              {data.alerts.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-semibold text-ink">{a.title}</p><Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge></div>
                  <p className="mt-0.5 text-xs text-muted">{a.actor.name} · {a.actor.professionalId || ROLE_LABELS[a.actor.role]} — {a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card padded={false}>
          <div className="p-5 pb-3"><CardHeader icon={ScrollText} title="Recent audit activity" action={<Button size="sm" variant="ghost" iconRight={ArrowRight} to="/admin/audit">Audit log</Button>} /></div>
          <ul className="divide-y divide-line border-t border-line">
            {data.recentAudit.map((e) => {
              const meta = actionMeta(e.action);
              const bad = e.outcome !== 'SUCCESS';
              return (
                <li key={e.id}>
                  <Link to={`/admin/audit?event=${e.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-canvas/70">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${bad ? 'bg-red-50 text-red-600' : 'bg-canvas text-muted ring-1 ring-line'}`}><meta.icon className="size-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{meta.label}</p>
                      <p className="truncate text-xs text-muted">{e.actorName || 'System'}{e.patientEmergencyId ? ` · ${e.patientEmergencyId}` : ''}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-subtle">{timeAgo(e.createdAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-subtle"><RoleBadge role="ADMIN" />Updated {timeAgo(data.serverTime)} · refreshes every 15 seconds</p>
    </>
  );
}
