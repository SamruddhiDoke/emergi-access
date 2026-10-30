import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, Table, Pagination, DefinitionList } from '../../components/ui/Data';
import { Segmented } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState, StatusBadge } from '../../components/ui/Feedback';
import { Drawer } from '../../components/ui/Overlay';
import { qs } from '../../services/api';
import { CATEGORY_LABELS, REASON_LABELS, ROLE_LABELS, formatDateTime, humanize } from '../../utils/format';

export default function ProHistory() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(`/emergency/history${qs({ page, status })}`);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="Accountability" title="Your emergency access history" description="Every break-glass request you have made, including denied and revoked ones." />
      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <Segmented value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: '', label: 'All' }, { value: 'ACTIVE', label: 'Active' }, { value: 'EXPIRED', label: 'Expired' }, { value: 'REVOKED', label: 'Revoked' }, { value: 'DENIED', label: 'Denied' }]} />
          <span className="tabular text-[13px] text-muted">{data.meta.total} requests</span>
        </div>
        <Table
          rows={data.items}
          onRowClick={(a) => (a.status === 'ACTIVE' ? navigate(`/pro/access/${a.id}`) : setSelected(a))}
          columns={[
            { key: 'p', header: 'Patient', render: (a) => (<div><p className="font-medium">{a.patientDisplayName}</p><p className="font-mono text-[11px] text-muted">{a.patientEmergencyId}</p></div>) },
            { key: 'r', header: 'Reason', render: (a) => REASON_LABELS[a.reason] },
            { key: 'w', header: 'Requested', render: (a) => <span className="tabular text-muted">{formatDateTime(a.requestedAt)}</span> },
            { key: 'v', header: 'Views', render: (a) => <span className="tabular">{a.accessCount}</span> },
            { key: 's', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
          ]}
          empty={<EmptyState icon={History} title="No requests found" />}
        />
        <Pagination meta={data.meta} onPage={setPage} />
      </Card>
      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.patientDisplayName} subtitle="Authorization details">
        {selected && (
          <div className="space-y-5">
            <StatusBadge status={selected.status} />
            <DefinitionList items={[
              ['Emergency ID', <span className="font-mono text-xs">{selected.patientEmergencyId}</span>],
              ['Reason', REASON_LABELS[selected.reason]],
              ['Justification', selected.justification],
              ['Requested', formatDateTime(selected.requestedAt)],
              ['Granted', formatDateTime(selected.grantedAt)],
              ['Expiry', formatDateTime(selected.expiresAt)],
              selected.revokedAt && ['Revoked', `${formatDateTime(selected.revokedAt)} · ${ROLE_LABELS[selected.revokedByRole]}`],
              selected.revocationReason && ['Revocation reason', selected.revocationReason],
              selected.denialReason && ['Denial reason', humanize(selected.denialReason)],
              ['Views', selected.accessCount],
            ]} />
            <div className="flex flex-wrap gap-1.5">{selected.categories.map((c) => <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{CATEGORY_LABELS[c]}</span>)}</div>
          </div>
        )}
      </Drawer>
    </>
  );
}
