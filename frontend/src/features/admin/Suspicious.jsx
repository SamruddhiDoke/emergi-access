import { useState } from 'react';
import { ShieldAlert, ShieldCheck, ScrollText, UserX, Clock3, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card } from '../../components/ui/Data';
import { Segmented } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState, Badge, RoleBadge } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { api, qs } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { SEVERITY_TONE } from './AdminDashboard';
import { formatDateTime, timeAgo } from '../../utils/format';

const RULES = [
  ['Repeated denied attempts', '≥ 3 denied events from one actor', 'HIGH'],
  ['Emergency ID enumeration', '≥ 3 unrecognised IDs from one actor', 'HIGH'],
  ['Repeated verification failures', '≥ 3 failed one-time codes', 'MEDIUM'],
  ['High request volume', '≥ 5 break-glass requests', 'MEDIUM'],
  ['Many patient records', 'Access granted for ≥ 4 different patients', 'MEDIUM'],
  ['Repeated failed sign-ins', '≥ 4 failed sign-ins on one account', 'LOW'],
];

export default function Suspicious() {
  const [windowHours, setWindowHours] = useState(24);
  const [suspend, setSuspend] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { data, error, loading, reload } = useApi(`/admin/suspicious-activity${qs({ windowHours })}`);

  const doSuspend = async () => {
    setBusy(true);
    try {
      await api('/admin/account-status', { method: 'POST', body: { userId: suspend.userId, status: 'SUSPENDED' } });
      toast.success('Account suspended', `${suspend.name} has been signed out of all sessions.`);
      setSuspend(null);
    } catch (e) {
      toast.error('Could not suspend', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Monitoring" title="Suspicious activity" description="Transparent, rule-based detection over the audit trail. Every alert explains exactly why it fired."
        actions={<><Segmented value={windowHours} onChange={setWindowHours} options={[{ value: 24, label: '24 h' }, { value: 72, label: '3 days' }, { value: 168, label: '7 days' }]} /><Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => reload()}>Refresh</Button></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {loading && !data ? <PageSkeleton /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : data.alerts.length === 0 ? (
            <Card><EmptyState icon={ShieldCheck} title="No suspicious activity" description="No actor crossed a detection threshold in this window." /></Card>
          ) : data.alerts.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card overflow-hidden">
              <div className="flex">
                <div className={`w-1 shrink-0 ${a.severity === 'HIGH' ? 'bg-red-500' : a.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-line-strong'}`} />
                <div className="flex-1 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${a.severity === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}><ShieldAlert className="size-4" /></span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{a.title}</p>
                        <p className="mt-0.5 text-[13px] text-muted">{a.description}</p>
                      </div>
                    </div>
                    <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity} severity</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-canvas px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span className="font-semibold text-ink">{a.actor.name}</span>
                      {a.actor.role && <RoleBadge role={a.actor.role} />}
                      {a.actor.professionalId && <span className="font-mono text-xs text-muted">{a.actor.professionalId}</span>}
                      {a.actor.organization && <span className="text-xs text-muted">· {a.actor.organization}</span>}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted" title={formatDateTime(a.lastSeen)}><Clock3 className="size-3" />Last seen {timeAgo(a.lastSeen)}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="secondary" icon={ScrollText} to={`/admin/audit?q=${encodeURIComponent(a.actor.professionalId || a.actor.name || '')}`}>Investigate events</Button>
                    {a.actor.role !== 'ADMIN' && <Button size="sm" variant="danger-soft" icon={UserX} onClick={() => setSuspend(a.actor)}>Suspend account</Button>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <Card className="h-fit">
          <h3 className="text-sm font-semibold text-ink">Detection rules</h3>
          <p className="mt-1 text-[13px] text-muted">Evaluated per actor within the selected window.</p>
          <ul className="mt-4 divide-y divide-line">
            {RULES.map(([t, d, s]) => (
              <li key={t} className="flex items-start justify-between gap-3 py-2.5">
                <div><p className="text-[13px] font-medium text-ink">{t}</p><p className="text-xs text-muted">{d}</p></div>
                <Badge tone={SEVERITY_TONE[s]}>{s}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <ConfirmDialog open={Boolean(suspend)} onClose={() => setSuspend(null)} onConfirm={doSuspend} loading={busy} title="Suspend this account?" confirmLabel="Suspend"
        description={suspend && `${suspend.name} will be signed out of every session immediately and will be unable to sign in until reactivated.`} />
    </>
  );
}
