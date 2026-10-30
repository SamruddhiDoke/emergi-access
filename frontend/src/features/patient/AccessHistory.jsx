import { useState } from 'react';
import { History, ShieldCheck, Eye, ScanLine, KeyRound, Ban, Clock3, ShieldX, FileDown } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, CardHeader, Table, Pagination } from '../../components/ui/Data';
import { PageSkeleton, ErrorState, EmptyState, RoleBadge, StatusBadge } from '../../components/ui/Feedback';
import { Drawer } from '../../components/ui/Overlay';
import { DefinitionList } from '../../components/ui/Data';
import { qs } from '../../services/api';
import { REASON_LABELS, formatDateTime, timeAgo, CATEGORY_LABELS, humanize, ROLE_LABELS } from '../../utils/format';

const EVENT_META = {
  PATIENT_IDENTIFIED: { icon: ScanLine, label: 'Your Emergency ID was scanned' },
  IDENTIFY_FAILED: { icon: ShieldX, label: 'Unrecognised ID attempt' },
  EMERGENCY_ACCESS_REQUESTED: { icon: KeyRound, label: 'Emergency access requested' },
  EMERGENCY_ACCESS_GRANTED: { icon: ShieldCheck, label: 'Emergency access granted' },
  EMERGENCY_ACCESS_DENIED: { icon: ShieldX, label: 'Emergency access denied' },
  MEDICAL_INFORMATION_VIEWED: { icon: Eye, label: 'Medical information viewed' },
  MEDICAL_INFORMATION_DENIED: { icon: ShieldX, label: 'Blocked attempt to view information' },
  EMERGENCY_SUMMARY_EXPORTED: { icon: FileDown, label: 'Emergency summary exported' },
  EMERGENCY_ACCESS_EXPIRED: { icon: Clock3, label: 'Access expired automatically' },
  EMERGENCY_ACCESS_REVOKED: { icon: Ban, label: 'Access revoked' },
  EMERGENCY_ACCESS_ENDED: { icon: Ban, label: 'Access ended by professional' },
};

export default function AccessHistory() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const { data, error, loading, reload } = useApi(`/patients/me/access-history${qs({ page })}`);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const columns = [
    { key: 'pro', header: 'Professional', render: (a) => (<div><p className="font-semibold">{a.professionalName}</p><p className="text-xs text-muted">{a.organization}</p></div>) },
    { key: 'role', header: 'Role', render: (a) => <RoleBadge role={a.professionalRole} /> },
    { key: 'reason', header: 'Reason', render: (a) => REASON_LABELS[a.reason] },
    { key: 'when', header: 'Requested', render: (a) => <span className="tabular text-muted">{formatDateTime(a.requestedAt)}</span> },
    { key: 'views', header: 'Views', render: (a) => <span className="tabular">{a.accessCount}</span> },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Transparency" title="Access history" description="Every emergency request against your record — who, when, why, and what they could see." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card padded={false} className="overflow-hidden">
          <Table columns={columns} rows={data.items} onRowClick={setSelected} empty={<EmptyState icon={History} title="No access yet" description="No healthcare professional has requested access to your record." />} />
          <Pagination meta={data.meta} onPage={setPage} />
        </Card>
        <Card>
          <CardHeader title="Activity timeline" description="The underlying audit events for your record" />
          {data.events.length === 0 ? <EmptyState compact icon={ShieldCheck} title="No events" /> : (
            <ol className="mt-5">
              {data.events.map((e, i) => {
                const meta = EVENT_META[e.action] || { icon: History, label: humanize(e.action) };
                const bad = e.outcome !== 'SUCCESS';
                return (
                  <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < data.events.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-24px)] w-px bg-line" />}
                    <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ${bad ? 'bg-red-50 text-red-600 ring-red-600/15' : 'bg-white text-muted ring-line'}`}><meta.icon className="size-3.5" /></span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] font-medium text-ink">{meta.label}</p>
                      <p className="text-xs text-muted">{e.actorName ? `${e.actorName} · ${ROLE_LABELS[e.actorRole] || ''}` : 'System'} · {timeAgo(e.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
      <Drawer open={Boolean(selected)} onClose={() => setSelected(null)} title="Access details" subtitle={selected && formatDateTime(selected.requestedAt)}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-2"><StatusBadge status={selected.status} /><RoleBadge role={selected.professionalRole} /></div>
            <DefinitionList items={[
              ['Professional', selected.professionalName],
              ['Professional ID', selected.professionalId],
              ['Organization', selected.organization],
              ['Reason', REASON_LABELS[selected.reason]],
              ['Justification', selected.justification],
              selected.treatmentPurpose && ['Treatment purpose', selected.treatmentPurpose],
              ['Granted', formatDateTime(selected.grantedAt)],
              ['Expires / expired', formatDateTime(selected.expiresAt)],
              selected.revokedAt && ['Revoked', `${formatDateTime(selected.revokedAt)} by ${ROLE_LABELS[selected.revokedByRole]}`],
              selected.revocationReason && ['Revocation reason', selected.revocationReason],
              selected.denialReason && ['Denial reason', humanize(selected.denialReason)],
              ['Times viewed', selected.accessCount],
            ]} />
            <div>
              <p className="text-[13px] font-semibold text-ink">Information categories available to this role</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{selected.categories.map((c) => <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{CATEGORY_LABELS[c]}</span>)}</div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
