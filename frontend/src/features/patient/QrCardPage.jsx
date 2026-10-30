import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Printer, EyeOff, Check, X, Code2 } from 'lucide-react';
import { PageHeader, Card } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { QrCard, DownloadQrButton } from '../../components/medical';

export default function QrCardPage() {
  const [qr, setQr] = useState(null);
  return (
    <>
      <PageHeader
        eyebrow="Emergency QR card"
        title="Your Emergency ID"
        description="Keep this card in your wallet, on your phone’s lock screen, or on a wristband. Healthcare professionals scan it to begin a controlled emergency access request."
        actions={<><Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button><DownloadQrButton emergencyId={qr?.emergencyId} /></>}
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="mx-auto w-full max-w-xl"><QrCard size="lg" onLoaded={setQr} /></div>
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><EyeOff className="size-4" /></span><h3 className="text-sm font-semibold text-ink">What this QR code contains</h3></div>
            <div className="mt-4 rounded-lg bg-navy-900 px-4 py-3 font-mono text-[13px] text-brand-200">
              <span className="text-white/40">payload: </span>"{qr?.payload || '…'}"
            </div>
            <ul className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
              <li className="flex items-center gap-2 text-ink"><Check className="size-4 text-brand-600" />Random Emergency ID</li>
              {['Your name', 'Blood group', 'Allergies', 'Medications', 'Conditions', 'Contacts'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-muted"><X className="size-4 text-subtle" />{t}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg bg-canvas text-muted ring-1 ring-line"><Code2 className="size-4" /></span><h3 className="text-sm font-semibold text-ink">What happens when it is scanned</h3></div>
            <ol className="mt-4 space-y-2.5 text-[13px] text-muted">
              {[
                'The professional must be signed in and verified.',
                'They see only your first name, last initial and age.',
                'They state a reason and justification, then verify with a one-time code.',
                'They receive a role-limited view for a few minutes.',
                'You can see the access and revoke it at any time.',
              ].map((t, i) => <li key={t} className="flex gap-3"><span className="tabular flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-ink ring-1 ring-line">{i + 1}</span>{t}</li>)}
            </ol>
          </Card>
          <p className="text-xs text-muted">Lost your card? You can regenerate your Emergency ID in <Link className="font-medium text-brand-700 hover:underline" to="/patient/settings">account settings</Link> — your old QR will stop working immediately.</p>
        </div>
      </div>
    </>
  );
}
