import { useState } from 'react';
import { Search, UserRound, Lock } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, Table, Pagination, ProgressBar } from '../../components/ui/Data';
import { Input } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, EmptyState, StatusBadge, Banner } from '../../components/ui/Feedback';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { api, qs } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useDebounced } from './useDebounced';
import { formatDate, timeAgo } from '../../utils/format';

export default function AdminPatients() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const dq = useDebounced(q);
  const { data, error, loading, reload } = useApi(`/admin/patients${qs({ q: dq, page })}`);

  const toggle = async () => {
    setBusy(true);
    try {
      const status = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await api('/admin/account-status', { method: 'POST', body: { userId: target.userId, status } });
      toast.success(status === 'SUSPENDED' ? 'Account suspended' : 'Account reactivated', target.fullName);
      setTarget(null);
      reload({ silent: true });
    } catch (e) {
      toast.error('Action failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Directory" title="Patient management" description="Registered patients and profile completeness. Clinical values are not available to administrators." />
      <Banner tone="neutral" icon={Lock} className="mb-5">Minimum-necessary applies to administrators too: this view contains account metadata only, never medical records.</Banner>
      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <Input icon={Search} fieldClassName="max-w-sm" placeholder="Search name, email or Emergency ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        {loading && !data ? <div className="p-5"><PageSkeleton /></div> : error && !data ? <div className="p-5"><ErrorState error={error} onRetry={reload} /></div> : (
          <>
            <Table
              rows={data.items}
              columns={[
                { key: 'n', header: 'Patient', render: (p) => (<div><p className="font-semibold">{p.fullName}</p><p className="text-xs text-muted">{p.email}</p></div>) },
                { key: 'e', header: 'Emergency ID', render: (p) => <span className="font-mono text-xs">{p.emergencyId}</span> },
                { key: 'c', header: 'Profile', render: (p) => (<div className="w-28"><p className="tabular text-xs font-medium">{p.profileCompletion}%</p><ProgressBar value={p.profileCompletion} className="mt-1" /></div>) },
                { key: 'a', header: 'Access requests', render: (p) => <span className="tabular">{p.authorizationCount}</span> },
                { key: 'u', header: 'Last updated', render: (p) => <span className="text-muted">{timeAgo(p.lastUpdated)}</span> },
                { key: 'r', header: 'Registered', render: (p) => <span className="text-muted">{formatDate(p.registeredAt)}</span> },
                { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'} /> },
                { key: 'x', header: '', render: (p) => <Button size="sm" variant={p.status === 'ACTIVE' ? 'ghost' : 'secondary'} onClick={() => setTarget(p)}>{p.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</Button> },
              ]}
              empty={<EmptyState icon={UserRound} title="No patients found" description="Try a different search." />}
            />
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        )}
      </Card>
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} onConfirm={toggle} loading={busy}
        tone={target?.status === 'ACTIVE' ? 'danger' : 'brand'}
        title={target?.status === 'ACTIVE' ? 'Suspend patient account?' : 'Reactivate patient account?'}
        confirmLabel={target?.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
        description={target?.status === 'ACTIVE' ? `${target?.fullName} will be signed out everywhere and their Emergency ID will stop resolving.` : `${target?.fullName} will be able to sign in again.`} />
    </>
  );
}
