import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Keyboard, ShieldCheck, EyeOff } from 'lucide-react';
import { PageHeader, Card, Tabs } from '../../components/ui/Data';
import { Banner } from '../../components/ui/Feedback';
import { QrScanner } from './QrScanner';
import { ManualEntry } from './ManualEntry';
import { useAuth } from '../../context/AuthContext';

export default function ScannerPage() {
  const [tab, setTab] = useState('camera');
  const navigate = useNavigate();
  const { user } = useAuth();
  const verified = user.professional?.verificationStatus === 'VERIFIED';

  return (
    <>
      <PageHeader eyebrow="Step 1 · Identify" title="Scan Emergency QR" description="Scan the patient’s Emergi-Access card, or type the Emergency ID printed beneath the code." back={{ to: '/pro', label: 'Dashboard' }} />
      {!verified && (
        <Banner tone="warning" icon={ShieldCheck} className="mb-5" title="Your account is awaiting verification">
          The server will refuse emergency access until an administrator verifies your professional credentials. Attempts are recorded.
        </Banner>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card padded={false}>
          <Tabs className="px-3" value={tab} onChange={setTab} tabs={[{ value: 'camera', label: 'Camera', icon: ScanLine }, { value: 'manual', label: 'Manual entry', icon: Keyboard }]} />
          <div className="p-6">
            {tab === 'camera' ? (
              <QrScanner onDetected={(text) => navigate(`/pro/access/new?eid=${encodeURIComponent(text.trim())}`)} />
            ) : (
              <div className="mx-auto max-w-md py-8">
                <p className="text-sm font-semibold text-ink">Enter Emergency ID</p>
                <p className="mb-5 mt-1 text-[13px] text-muted">Use this when the camera is unavailable or the code is damaged.</p>
                <ManualEntry autoFocus />
              </div>
            )}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><EyeOff className="size-4" /></span><h3 className="text-sm font-semibold text-ink">Scanning reveals no medical data</h3></div>
            <p className="mt-3 text-[13px] leading-5 text-muted">The QR contains only an opaque identifier. After scanning you will see the patient’s first name, last initial and age so you can confirm identity — nothing more.</p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-ink">What happens next</h3>
            <ol className="mt-3 space-y-2.5 text-[13px] text-muted">
              {['Confirm patient identity', 'Select an emergency reason', 'Write a short justification', 'Acknowledge monitoring', 'Verify with a one-time code'].map((t, i) => (
                <li key={t} className="flex items-center gap-3"><span className="tabular flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-ink ring-1 ring-line">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
