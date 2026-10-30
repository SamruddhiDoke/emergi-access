import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useApi, useInterval } from '../../hooks/useApi';
import { PageHeader, Card } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState, EmptyState, Banner } from '../../components/ui/Feedback';
import { ActiveAuthorizationCard } from './ActiveAuthorizationCard';

export default function Authorizations() {
  const { data, error, loading, reload } = useApi('/patients/me/authorizations');
  useInterval(() => reload({ silent: true }), 8000);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        eyebrow="Privacy control"
        title="Active authorizations"
        description="Professionals who currently hold — or are completing verification for — emergency access to your record."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={() => reload()}>Refresh</Button>}
      />
      <Banner tone="info" icon={ShieldCheck} className="mb-5" title="Revocation is immediate">
        When you revoke access, the professional’s next request is refused by the server — even if their screen is still open.
      </Banner>
      {data.items.length === 0 ? (
        <Card><EmptyState icon={ShieldCheck} title="No one currently has access" description="Your record is private. Active emergency authorizations will appear here with a live countdown." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((a) => <ActiveAuthorizationCard key={a.id} a={a} serverTime={data.serverTime} onChanged={() => reload({ silent: true })} />)}
        </div>
      )}
    </>
  );
}
