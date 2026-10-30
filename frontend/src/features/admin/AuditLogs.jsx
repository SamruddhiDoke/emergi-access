import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, ScrollText, X, Lock, Ban, Filter } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, Table, Pagination, DefinitionList } from '../../components/ui/Data';
import { Input, Select } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState, StatusBadge, RoleBadge, Spinner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Drawer, Modal } from '../../components/ui/Overlay';
import { Textarea } from '../../components/ui/Form';
import { api, download, qs } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from './useDebounced';
import { actionMeta } from './auditLabels';
import { CATEGORY_LABELS, REASON_LABELS, ROLE_LABELS, formatDateTime, formatDuration, humanize } from '../../utils/format';

const EMPTY = { q: '', outcome: '', role: '', action: '', emergencyId: '', organization: '', from: '', to: '', authorizationId: '' };

function EventDrawer({ id, onClose, onRevoked }) {
  const [data, setData] = useState(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setData(null);
    if (id) api(`/admin/audit-logs/${id}`).then(setData).catch((e) => toast.error('Could not load event', e.message));
  }, [id, toast]);

  const revoke = async () => {
    setBusy(true);
    try {
      await api('/admin/revoke-access', { method: 'POST', body: { authorizationId: data.authorization.id, reason } });
      toast.success('Authorization revoked', 'The professional’s next request will be refused.');
      setRevokeOpen(false);
      setReason('');
      setData(await api(`/admin/audit-logs/${id}`));
      onRevoked?.();
    } catch (e) {
      toast.error('Could not revoke', e.message);
    } finally {
      setBusy(false);
    }
  };

  const e = data?.event;
  const auth = data?.authorization;
  const meta = e && actionMeta(e.action);
  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={meta?.label || 'Audit event'} subtitle={e && formatDateTime(e.createdAt)}
      footer={auth && ['ACTIVE', 'PENDING'].includes(auth.status) && (
        <div className="flex items-center justify-between gap-3"><p className="text-[13px] text-muted">This authorization is still <strong className="text-ink">{auth.status.toLowerCase()}</strong>.</p><Button variant="danger" icon={Ban} onClick={() => setRevokeOpen(true)}>Revoke authorization</Button></div>
      )}>
      {!data ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <div className="space-y-7">
          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={e.outcome} />{e.actorRole && <RoleBadge role={e.actorRole} />}<span className="font-mono text-[11px] text-subtle">{e.id}</span></div>
          <DefinitionList items={[
            ['Actor', e.actorName || 'System'],
            e.professionalId && ['Professional ID', e.professionalId],
            e.organization && ['Organization', e.organization],
            e.patientEmergencyId && ['Patient Emergency ID', <span className="font-mono text-xs">{e.patientEmergencyId}</span>],
            e.authorizationId && ['Authorization', <span className="font-mono text-xs">{e.authorizationId}</span>],
            e.reason && ['Emergency reason', REASON_LABELS[e.reason] || humanize(e.reason)],
            e.justification && ['Justification', e.justification],
            e.accessDurationSec != null && ['Access duration', formatDuration(e.accessDurationSec)],
            e.expiryStatus && ['Expiry status', humanize(e.expiryStatus)],
            e.denialReason && ['Denial reason', <span className="font-medium text-red-700">{humanize(e.denialReason)}</span>],
            e.ipAddress && ['IP address', <span className="font-mono text-xs">{e.ipAddress}</span>],
          ]} />
          {e.categoriesAccessed.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-ink">Information categories accessed</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{e.categoriesAccessed.map((c) => <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{CATEGORY_LABELS[c] || c}</span>)}</div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><Lock className="size-3" />Audit records store categories only — never medical values.</p>
            </div>
          )}
          {e.metadata && Object.keys(e.metadata).length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-ink">Metadata</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-navy-900 p-3 text-[11px] leading-5 text-brand-100">{JSON.stringify(e.metadata, null, 2)}</pre>
            </div>
          )}
          {data.timeline.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-ink">Authorization timeline</p>
              <ol className="mt-3">
                {data.timeline.map((t, i) => {
                  const tm = actionMeta(t.action);
                  const bad = t.outcome !== 'SUCCESS';
                  return (
                    <li key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < data.timeline.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-24px)] w-px bg-line" />}
                      <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ${t.id === e.id ? 'bg-brand-600 text-white ring-brand-600' : bad ? 'bg-red-50 text-red-600 ring-red-600/15' : 'bg-white text-muted ring-line'}`}><tm.icon className="size-3.5" /></span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[13px] font-medium text-ink">{tm.label}</p>
                        <p className="text-xs text-muted">{t.actorName || 'System'} · {formatDateTime(t.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
      <Modal open={revokeOpen} onClose={() => setRevokeOpen(false)} size="sm" title="Revoke emergency authorization" description="The professional will be refused on their very next request."
        footer={<><Button variant="secondary" onClick={() => setRevokeOpen(false)}>Cancel</Button><Button variant="danger" loading={busy} disabled={reason.trim().length < 3} onClick={revoke}>Revoke now</Button></>}>
        <Textarea label="Reason" required rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="e.g. Access no longer clinically required" />
      </Modal>
    </Drawer>
  );
}

export default function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...EMPTY, ...Object.fromEntries([...params].filter(([k]) => k in EMPTY)) }));
  const [page, setPage] = useState(1);
  const [eventId, setEventId] = useState(params.get('event'));
  const [exporting, setExporting] = useState(false);
  const toast = useToast();
  const debounced = useDebounced(filters);
  const query = qs({ ...debounced, page });
  const { data, error, loading, reload } = useApi(`/admin/audit-logs${query}`);

  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const active = Object.values(filters).filter(Boolean).length;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await download(`/admin/audit-logs/export.csv${qs(debounced)}`, `emergi-access-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toast.error('Export failed', e.message);
    } finally {
      setExporting(false);
    }
  };

  const open = (id) => { setEventId(id); setParams((p) => { const n = new URLSearchParams(p); n.set('event', id); return n; }, { replace: true }); };
  const close = () => { setEventId(null); setParams((p) => { const n = new URLSearchParams(p); n.delete('event'); return n; }, { replace: true }); };

  return (
    <>
      <PageHeader eyebrow="Accountability" title="Audit logs" description="Append-only record of every authentication, access attempt and administrative action. Events cannot be edited or deleted."
        actions={<Button variant="secondary" icon={Download} loading={exporting} onClick={exportCsv}>Export CSV</Button>} />
      <Card padded={false} className="overflow-hidden">
        <div className="space-y-3 border-b border-line px-5 py-4">
          <div className="flex flex-wrap gap-3">
            <Input icon={Search} fieldClassName="w-full max-w-md" placeholder="Search actor, professional ID, Emergency ID, action…" value={filters.q} onChange={set('q')} />
            <Select fieldClassName="w-40" value={filters.outcome} onChange={set('outcome')} placeholder="All outcomes" options={[{ value: 'SUCCESS', label: 'Success' }, { value: 'DENIED', label: 'Denied' }, { value: 'FAILURE', label: 'Failure' }]} />
            <Select fieldClassName="w-40" value={filters.role} onChange={set('role')} placeholder="All roles" options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select fieldClassName="w-60" value={filters.action} onChange={set('action')} placeholder="All event types" options={(data?.actions || []).map((a) => ({ value: a, label: actionMeta(a).label }))} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Input fieldClassName="w-56" placeholder="Patient Emergency ID" value={filters.emergencyId} onChange={set('emergencyId')} className="font-mono" />
            <Input fieldClassName="w-52" placeholder="Organization" value={filters.organization} onChange={set('organization')} />
            <Input fieldClassName="w-40" type="date" aria-label="From date" value={filters.from} onChange={set('from')} />
            <span className="pb-2.5 text-xs text-muted">to</span>
            <Input fieldClassName="w-40" type="date" aria-label="To date" value={filters.to} onChange={set('to')} />
            {active > 0 && <Button variant="ghost" size="sm" icon={X} onClick={() => { setFilters(EMPTY); setPage(1); }}>Clear {active} filter{active > 1 ? 's' : ''}</Button>}
          </div>
          {filters.authorizationId && <p className="flex items-center gap-1.5 text-xs text-muted"><Filter className="size-3" />Showing events for authorization <span className="font-mono">{filters.authorizationId}</span></p>}
        </div>
        {loading && !data ? <div className="p-5"><PageSkeleton /></div> : error && !data ? <div className="p-5"><ErrorState error={error} onRetry={reload} /></div> : (
          <>
            <Table
              dense
              rows={data.items}
              onRowClick={(e) => open(e.id)}
              columns={[
                { key: 't', header: 'Time', render: (e) => <span className="tabular whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</span> },
                { key: 'a', header: 'Event', render: (e) => { const m = actionMeta(e.action); return <span className="flex items-center gap-2 font-medium"><m.icon className="size-3.5 text-muted" />{m.label}</span>; } },
                { key: 'w', header: 'Actor', render: (e) => (<div className="min-w-0"><p className="truncate">{e.actorName || 'System'}</p>{e.professionalId && <p className="font-mono text-[11px] text-muted">{e.professionalId}</p>}</div>) },
                { key: 'r', header: 'Role', render: (e) => e.actorRole ? <RoleBadge role={e.actorRole} /> : <span className="text-subtle">—</span> },
                { key: 'p', header: 'Patient ID', render: (e) => e.patientEmergencyId ? <span className="font-mono text-[11px]">{e.patientEmergencyId}</span> : <span className="text-subtle">—</span> },
                { key: 'o', header: 'Outcome', render: (e) => <StatusBadge status={e.outcome} /> },
              ]}
              empty={<EmptyState icon={ScrollText} title="No matching events" description="Adjust or clear the filters." />}
            />
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>
      <EventDrawer id={eventId} onClose={close} onRevoked={() => reload({ silent: true })} />
    </>
  );
}
