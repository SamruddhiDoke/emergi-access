import { useEffect, useState } from 'react';
import { Save, Timer, ShieldCheck, FlaskConical, Server } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, CardHeader, DefinitionList } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { PageSkeleton, ErrorState, Badge, Banner } from '../../components/ui/Feedback';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDuration } from '../../utils/format';

const PRESETS = [120, 300, 600, 900];

export default function AdminSettings() {
  const { data, error, loading, reload, setData } = useApi('/admin/settings');
  const [duration, setDuration] = useState(300);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { if (data) setDuration(data.authorizationDurationSeconds); }, [data]);
  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const save = async () => {
    setSaving(true);
    try {
      setData(await api('/admin/settings', { method: 'PUT', body: { authorizationDurationSeconds: Number(duration) } }));
      toast.success('Settings saved', `New authorizations will last ${formatDuration(Number(duration))}.`);
    } catch (e) {
      toast.error('Could not save settings', e.message);
    } finally {
      setSaving(false);
    }
  };

  const valid = Number(duration) >= 60 && Number(duration) <= 3600;
  return (
    <>
      <PageHeader eyebrow="System" title="System settings" description="Configuration for the emergency access policy. Changes are recorded in the audit log." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader icon={Timer} title="Emergency authorization duration" description="How long a break-glass authorization stays active before the server expires it." />
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setDuration(p)} className={`rounded-xl border px-3 py-3 text-left transition-all ${Number(duration) === p ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10' : 'border-line hover:border-line-strong'}`}>
                <p className="tabular text-lg font-semibold text-ink">{p / 60} min</p>
                <p className="text-xs text-muted">{p === 300 ? 'Recommended' : p < 300 ? 'Demo-friendly' : 'Extended'}</p>
              </button>
            ))}
          </div>
          <Input fieldClassName="mt-5 max-w-xs" label="Custom duration (seconds)" type="number" min={60} max={3600} value={duration} onChange={(e) => setDuration(e.target.value)} error={valid ? undefined : 'Between 60 and 3600 seconds'} hint={valid ? `= ${formatDuration(Number(duration))}` : undefined} />
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-xs text-muted">Applies to new authorizations. Active sessions keep their original expiry.</p>
            <Button icon={Save} loading={saving} disabled={!valid || Number(duration) === data.authorizationDurationSeconds} onClick={save}>Save</Button>
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader icon={Server} title="Runtime configuration" description="Read-only — set via environment variables" />
            <DefinitionList className="mt-3" items={[
              ['Environment', <Badge tone="neutral">{data.environment}</Badge>],
              ['Demo mode', data.demoMode ? <Badge tone="warning" icon={FlaskConical}>On — simulated OTP shown</Badge> : <Badge tone="success">Off</Badge>],
              ['Session lifetime', `${data.sessionTtlHours} hours`],
              ['One-time code lifetime', formatDuration(data.otpTtlSeconds)],
              ['Rate limiting', data.rateLimiting ? <Badge tone="success" icon={ShieldCheck}>Enabled</Badge> : <Badge tone="warning">Disabled</Badge>],
            ]} />
          </Card>
          <Banner tone="demo" icon={FlaskConical} title="Prototype environment">
            Demo mode exposes one-time codes on screen because no SMS or email gateway is connected. Disable DEMO_MODE before any real-world use.
          </Banner>
        </div>
      </div>
    </>
  );
}
