import { useState } from 'react';
import { Timer, CheckCircle2, Activity, ShieldX } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, CardHeader, StatCard } from '../../components/ui/Data';
import { Segmented } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState } from '../../components/ui/Feedback';
import { TimeSeriesChart, HorizontalBars, GroupedBars, Columns, Legend } from './charts';
import { qs } from '../../services/api';
import { REASON_LABELS, ROLE_LABELS, formatDuration, humanize } from '../../utils/format';

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, error, loading, reload } = useApi(`/admin/analytics${qs({ days })}`);

  return (
    <>
      <PageHeader eyebrow="Insights" title="Access analytics" description="Patterns in emergency access, computed live from stored authorizations and audit events."
        actions={<Segmented value={days} onChange={setDays} options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} />} />
      {loading && !data ? <PageSkeleton /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : (() => {
        const total = data.activity.reduce((s, d) => s + d.requests, 0);
        const granted = data.activity.reduce((s, d) => s + d.granted, 0);
        const denied = data.activity.reduce((s, d) => s + d.denied, 0);
        const peak = Math.max(...data.hourly.map((h) => h.count));
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Break-glass requests" value={total} icon={Activity} tone="brand" hint={`Last ${days} days`} />
              <StatCard label="Granted" value={granted} icon={CheckCircle2} tone="success" hint={total ? `${Math.round((granted / total) * 100)}% of requests` : '—'} />
              <StatCard label="Denied events" value={denied} icon={ShieldX} tone="warning" hint="From the audit log" />
              <StatCard label="Average access duration" value={formatDuration(data.averageAccessSeconds)} icon={Timer} hint={`${data.completedSessions} completed sessions`} />
            </div>
            <Card>
              <CardHeader title="Daily activity" description="Requests, granted authorizations and denied events" action={<Legend items={[{ label: 'Requests' }, { label: 'Granted' }, { label: 'Denied events' }]} />} />
              <div className="mt-5"><TimeSeriesChart height={260} data={data.activity} series={[{ key: 'requests', label: 'Requests' }, { key: 'granted', label: 'Granted' }, { key: 'denied', label: 'Denied events' }]} /></div>
            </Card>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader title="Outcomes by role" description="Granted, denied and revoked authorizations" action={<Legend items={[{ label: 'Granted' }, { label: 'Denied' }, { label: 'Revoked' }]} />} />
                <div className="mt-5"><GroupedBars data={data.byRole} labelKey="role" format={(r) => ROLE_LABELS[r] || r} series={[{ key: 'granted', label: 'Granted' }, { key: 'denied', label: 'Denied' }, { key: 'revoked', label: 'Revoked' }]} /></div>
              </Card>
              <Card>
                <CardHeader title="Emergency reasons" description="Why break-glass access was requested" />
                <div className="mt-4">{data.byReason.length ? <HorizontalBars data={data.byReason} labelKey="reason" name="Requests" format={(r) => REASON_LABELS[r] || r} /> : <EmptyState compact title="No data" />}</div>
              </Card>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader title="Requests by hour of day (IST)" description={`Peak hour highlighted · ${peak} requests`} />
                <div className="mt-5"><Columns data={data.hourly} labelKey="hour" format={(h) => `${String(h).padStart(2, '0')}:00`} highlight={(d) => d.count === peak && peak > 0} /></div>
              </Card>
              <Card>
                <CardHeader title="Denial reasons" description="Why access was refused" />
                {data.denialReasons.length === 0 ? <EmptyState compact title="No denials" /> : (
                  <ul className="mt-4 space-y-2.5">
                    {data.denialReasons.slice(0, 8).map((d) => (
                      <li key={d.reason} className="flex items-center justify-between gap-3 text-[13px]"><span className="truncate text-ink">{humanize(d.reason)}</span><span className="tabular font-semibold text-ink">{d.count}</span></li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
            <Card>
              <CardHeader title="Top organizations" description="Emergency access requests by healthcare organization" />
              <div className="mt-4">{data.byOrganization.length ? <HorizontalBars data={data.byOrganization} labelKey="organization" name="Requests" /> : <EmptyState compact title="No data" />}</div>
            </Card>
          </div>
        );
      })()}
    </>
  );
}
