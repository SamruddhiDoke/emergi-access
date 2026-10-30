import { useState } from 'react';
import { Search, Stethoscope, BadgeCheck, X, Info } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, Table, Pagination, Tabs } from '../../components/ui/Data';
import { Input, Select } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState, StatusBadge, RoleBadge, Banner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { api, qs } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from './useDebounced';
import { SPECIALTY_LABELS, timeAgo } from '../../utils/format';

export default function AdminProfessionals({ verificationQueue = false }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [verification, setVerification] = useState(verificationQueue ? 'PENDING' : '');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState(null); // { pro, kind: VERIFY|REJECT|SUSPEND|ACTIVATE }
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useApi(`/admin/professionals${qs({ q: dq, role, verification, page })}`);

  const run = async () => {
    setBusy(true);
    const { pro, kind } = action;
    try {
      if (kind === 'VERIFY' || kind === 'REJECT') {
        await api('/admin/verify-professional', { method: 'POST', body: { professionalId: pro.id, decision: kind } });
        toast.success(kind === 'VERIFY' ? 'Professional verified' : 'Verification rejected', `${pro.fullName} · ${pro.professionalId}`);
      } else {
        await api('/admin/account-status', { method: 'POST', body: { userId: pro.userId, status: kind === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE' } });
        toast.success(kind === 'SUSPEND' ? 'Account suspended' : 'Account reactivated', pro.fullName);
      }
      setAction(null);
      reload({ silent: true });
    } catch (e) {
      toast.error('Action failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = {
    VERIFY: ['Verify this professional?', 'Verify', 'brand', 'They will be able to request emergency access immediately.'],
    REJECT: ['Reject verification?', 'Reject', 'danger', 'They will remain unable to use emergency access.'],
    SUSPEND: ['Suspend account?', 'Suspend', 'danger', 'All of their sessions will end immediately.'],
    ACTIVATE: ['Reactivate account?', 'Reactivate', 'brand', 'They will be able to sign in again.'],
  }[action?.kind || 'VERIFY'];

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title={verificationQueue ? 'Professional verification' : 'Healthcare professionals'}
        description={verificationQueue ? 'Review and verify healthcare professionals before they can use emergency access.' : 'Paramedics, doctors and specialists registered on Emergi-Access.'}
      />
      {verificationQueue && (
        <Banner tone="demo" icon={Info} className="mb-5" title="Demonstration verification">
          In this prototype, verification is a manual administrator decision. It is not connected to any government or medical council licensing database.
        </Banner>
      )}
      <Card padded={false} className="overflow-hidden">
        <Tabs className="px-3" value={verification} onChange={(v) => { setVerification(v); setPage(1); }} tabs={[{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'REJECTED', label: 'Rejected' }]} />
        <div className="flex flex-wrap gap-3 border-b border-line px-5 py-3">
          <Input icon={Search} fieldClassName="w-full max-w-sm" placeholder="Search name, ID, organization" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select fieldClassName="w-44" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} placeholder="All roles" options={[{ value: 'PARAMEDIC', label: 'Paramedic' }, { value: 'DOCTOR', label: 'Doctor' }, { value: 'SPECIALIST', label: 'Specialist' }]} />
        </div>
        {loading && !data ? <div className="p-5"><PageSkeleton /></div> : error && !data ? <div className="p-5"><ErrorState error={error} onRetry={reload} /></div> : (
          <>
            <Table
              rows={data.items}
              columns={[
                { key: 'n', header: 'Professional', render: (p) => (<div><p className="font-semibold">{p.fullName}</p><p className="text-xs text-muted">{p.email}</p></div>) },
                { key: 'r', header: 'Role', render: (p) => (<div className="flex flex-col items-start gap-1"><RoleBadge role={p.role} />{p.specialty && <span className="text-[11px] text-muted">{SPECIALTY_LABELS[p.specialty]}</span>}</div>) },
                { key: 'i', header: 'Professional ID', render: (p) => <span className="font-mono text-xs">{p.professionalId}</span> },
                { key: 'o', header: 'Organization', render: (p) => <span className="text-muted">{p.organization}</span> },
                { key: 'v', header: 'Verification', render: (p) => <StatusBadge status={p.verificationStatus} /> },
                { key: 'l', header: 'Last sign-in', render: (p) => <span className="text-muted">{p.lastLoginAt ? timeAgo(p.lastLoginAt) : 'Never'}</span> },
                {
                  key: 'x', header: '', render: (p) => (
                    <div className="flex justify-end gap-1.5">
                      {p.verificationStatus !== 'VERIFIED' && <Button size="sm" icon={BadgeCheck} onClick={() => setAction({ pro: p, kind: 'VERIFY' })}>Verify</Button>}
                      {p.verificationStatus === 'PENDING' && <Button size="sm" variant="ghost" icon={X} onClick={() => setAction({ pro: p, kind: 'REJECT' })}>Reject</Button>}
                      {p.verificationStatus === 'VERIFIED' && <Button size="sm" variant="ghost" onClick={() => setAction({ pro: p, kind: p.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE' })}>{p.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</Button>}
                    </div>
                  ),
                },
              ]}
              empty={<EmptyState icon={Stethoscope} title={verification === 'PENDING' ? 'Verification queue is empty' : 'No professionals found'} />}
            />
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>
      <ConfirmDialog open={Boolean(action)} onClose={() => setAction(null)} onConfirm={run} loading={busy} title={copy[0]} confirmLabel={copy[1]} tone={copy[2]}
        description={action && `${action.pro.fullName} (${action.pro.professionalId}, ${action.pro.organization}). ${copy[3]}`} />
    </>
  );
}

