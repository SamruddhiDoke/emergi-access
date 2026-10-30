import { useState } from 'react';
import { Clock3, Building2, Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { RoleBadge, StatusBadge } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { Textarea } from '../../components/ui/Form';
import { useCountdown } from '../../hooks/useApi';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { REASON_LABELS, formatCountdown, CATEGORY_LABELS, timeAgo } from '../../utils/format';

/** A live authorization on the patient's own record, with revocation. */
export function ActiveAuthorizationCard({ a, serverTime, onChanged }) {
  const remaining = useCountdown(a.expiresAt, serverTime);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const pct = a.status === 'ACTIVE' ? (remaining / a.durationSeconds) * 100 : 0;

  const revoke = async () => {
    setBusy(true);
    try {
      await api('/patients/me/revoke-access', { method: 'POST', body: { authorizationId: a.id, reason: reason || undefined } });
      toast.success('Access revoked', `${a.professionalName} can no longer view your record.`);
      setConfirm(false);
      onChanged?.();
    } catch (e) {
      toast.error('Could not revoke access', e.message);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{a.professionalName}</p>
            <RoleBadge role={a.professionalRole} />
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted"><Building2 className="size-3.5" />{a.organization} · {a.professionalId}</p>
        </div>
        {a.status === 'ACTIVE' ? (
          <div className="text-right">
            <p className="tabular flex items-center gap-1.5 text-lg font-semibold text-ink"><Clock3 className="size-4 text-brand-600" />{formatCountdown(remaining)}</p>
            <p className="text-[11px] text-muted">remaining</p>
          </div>
        ) : (
          <p className="text-xs text-muted">Requested {timeAgo(a.requestedAt)} · awaiting verification</p>
        )}
      </div>
      {a.status === 'ACTIVE' && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink/[0.06]"><div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
      )}
      <div className="mt-3 rounded-lg bg-canvas px-3 py-2.5 text-[13px]">
        <p className="font-medium text-ink">{REASON_LABELS[a.reason]}</p>
        <p className="mt-0.5 text-muted">“{a.justification}”</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {a.categories.slice(0, 6).map((c) => <span key={c} className="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">{CATEGORY_LABELS[c]}</span>)}
        </div>
        <Button size="sm" variant="danger-soft" icon={Ban} onClick={() => setConfirm(true)}>Revoke access</Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={revoke}
        loading={busy}
        title="Revoke emergency access?"
        confirmLabel="Revoke now"
        description={`${a.professionalName} (${a.organization}) will immediately lose access to your medical information. If you are currently receiving emergency care, this may affect your treatment.`}
      >
        <Textarea fieldClassName="mt-4" label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I did not authorise this" />
      </ConfirmDialog>
    </motion.div>
  );
}
