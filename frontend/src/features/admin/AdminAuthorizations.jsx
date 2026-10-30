import { useState } from 'react';
import { Search, KeyRound, Ban, ScrollText, Clock3 } from 'lucide-react';
import { useApi, useInterval, useCountdown } from '../../hooks/useApi';
import { PageHeader, Card, Table, Pagination, Tabs, DefinitionList } from '../../components/ui/Data';
import { Input, Select, Textarea } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState, StatusBadge, RoleBadge } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { Drawer, Modal } from '../../components/ui/Overlay';
import { api, qs } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from './useDebounced';
import { CATEGORY_LABELS, REASON_LABELS, ROLE_LABELS, formatCountdown, formatDateTime, humanize } from '../../utils/format';

function Remaining({ a, serverTime }) {
  const r = useCountdown(a.expiresAt, serverTime);
  if (a.status !== 'ACTIVE') return <span className="text-muted">—</span>;
  return <span className={`tabular inline-flex items-center gap-1 font-semibold ${r <= 60 ? 'text-amber-700' : 'text-ink'}`}><Clock3 className="size-3.5 text-brand-600" />{formatCountdown(r)}</span>;
}

export default function AdminAuthorizations({ mode = 'requests' }) {
  const activeMode = mode === 'active';
  const [status, setStatus] = useState(activeMode ? 'ACTIVE' : '');
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useApi(`/admin/authorizations${qs({ status, role, q: dq, page })}`);
  useInterval(() => reload({ silent: true }), activeMode ? 5000 : 15000);

  const revoke = async () => {
    setBusy(true);
    try {
      await api('/admin/revoke-access', { method: 'POST', body: { authorizationId: revokeTarget.id, reason } });
      toast.success('Authorization revoked', `${revokeTarget.professionalName}’s next request will be refused.`);
      setRevokeTarget(null);
      setSelected(null);
      setReason('');
      reload({ silent: true });
    } catch (e) {
      toast.error('Could not revoke', e.message);
      reload({ silent: true });
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'p', header: 'Professional', render: (a) => (<div><p className="font-semibold">{a.professionalName}</p><p className="text-xs text-muted">{a.professionalId} · {a.organization}</p></div>) },
    { key: 'r', header: 'Role', render: (a) => <RoleBadge role={a.professionalRole} /> },
    { key: 'e', header: 'Patient', render: (a) => (<div><p className="font-medium">{a.patientDisplayName}</p><p className="font-mono text-[11px] text-muted">{a.patientEmergencyId}</p></div>) },
    { key: 'why', header: 'Reason', render: (a) => <span className="text-muted">{REASON_LABELS[a.reason]}</span> },
    activeMode ? { key: 't', header: 'Remaining', render: (a) => <Remaining a={a} serverTime={data.serverTime} /> } : { key: 't', header: 'Requested', render: (a) => <span className="tabular text-muted">{formatDateTime(a.requestedAt)}</span> },
    { key: 's', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    { key: 'x', header: '', render: (a) => ['ACTIVE', 'PENDING'].includes(a.status) && <Button size="sm" variant="danger-soft" icon={Ban} onClick={(ev) => { ev.stopPropagation(); setRevokeTarget(a); }}>Revoke</Button> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Access control"
        title={activeMode ? 'Active authorizations' : 'Emergency access requests'}
        description={activeMode ? 'Live break-glass sessions. Revocation takes effect on the professional’s next request.' : 'Every break-glass request, with its outcome. Select a row for details.'}
      />
      <Card padded={false} className="overflow-hidden">
        <Tabs className="px-3" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[
          ...(activeMode ? [] : [{ value: '', label: 'All' }]),
          { value: 'ACTIVE', label: 'Active' }, { value: 'PENDING', label: 'Pending' }, { value: 'EXPIRED', label: 'Expired' }, { value: 'REVOKED', label: activeMode ? 'Revoked (history)' : 'Revoked' }, { value: 'DENIED', label: 'Denied' },
        ]} />
        <div className="flex flex-wrap gap-3 border-b border-line px-5 py-3">
          <Input icon={Search} fieldClassName="w-full max-w-sm" placeholder="Emergency ID, professional ID, organization" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select fieldClassName="w-44" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} placeholder="All roles" options={[{ value: 'PARAMEDIC', label: 'Paramedic' }, { value: 'DOCTOR', label: 'Doctor' }, { value: 'SPECIALIST', label: 'Specialist' }]} />
        </div>
        {loading && !data ? <div className="p-5"><PageSkeleton /></div> : error && !data ? <div className="p-5"><ErrorState error={error} onRetry={reload} /></div> : (
          <>
            <Table rows={data.items} columns={columns} onRowClick={setSelected} empty={<EmptyState icon={KeyRound} title={status === 'ACTIVE' ? 'No active emergency sessions' : 'No authorizations found'} description={status === 'ACTIVE' ? 'Active break-glass sessions appear here in real time.' : undefined} />} />
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>

      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Authorization details" subtitle={selected?.id}
        footer={selected && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" icon={ScrollText} to={`/admin/audit?authorizationId=${selected.id}`}>View audit trail</Button>
            {['ACTIVE', 'PENDING'].includes(selected.status) && <Button variant="danger" icon={Ban} onClick={() => setRevokeTarget(selected)}>Revoke</Button>}
          </div>
        )}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2"><StatusBadge status={selected.status} /><RoleBadge role={selected.professionalRole} /></div>
            <DefinitionList items={[
              ['Professional', `${selected.professionalName} · ${selected.professionalId}`],
              ['Organization', selected.organization],
              ['Patient', `${selected.patientDisplayName} · ${selected.patientEmergencyId}`],
              ['Reason', REASON_LABELS[selected.reason]],
              ['Justification', selected.justification],
              selected.treatmentPurpose && ['Treatment purpose', selected.treatmentPurpose],
              ['OTP verified', selected.otpVerified ? 'Yes (simulated)' : 'No'],
              ['Requested', formatDateTime(selected.requestedAt)],
              ['Granted', formatDateTime(selected.grantedAt)],
              ['Expires', formatDateTime(selected.expiresAt)],
              ['Duration', `${Math.round(selected.durationSeconds / 60)} min`],
              selected.revokedAt && ['Revoked', `${formatDateTime(selected.revokedAt)} by ${ROLE_LABELS[selected.revokedByRole]}`],
              selected.revocationReason && ['Revocation reason', selected.revocationReason],
              selected.denialReason && ['Denial reason', humanize(selected.denialReason)],
              ['Record views', selected.accessCount],
            ]} />
            <div>
              <p className="text-[13px] font-semibold text-ink">Categories disclosed to this role</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{selected.categories.map((c) => <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{CATEGORY_LABELS[c]}</span>)}</div>
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)} size="sm" title="Revoke emergency authorization"
        description={revokeTarget && `${revokeTarget.professionalName} (${ROLE_LABELS[revokeTarget.professionalRole]}) will lose access to ${revokeTarget.patientDisplayName}’s record immediately.`}
        footer={<><Button variant="secondary" onClick={() => setRevokeTarget(null)}>Cancel</Button><Button variant="danger" icon={Ban} loading={busy} disabled={reason.trim().length < 3} onClick={revoke}>Revoke now</Button></>}>
        <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Patient handed over to hospital emergency department" hint="Recorded in the audit log and shown to the professional." />
      </Modal>
    </>
  );
}
