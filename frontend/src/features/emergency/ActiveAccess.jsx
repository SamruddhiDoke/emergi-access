import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RefreshCw, FileDown, LogOut, ShieldCheck, Ban, Clock3, AlertTriangle, Activity, Pill, History as HistoryIcon, Users, ShieldAlert, ScrollText,
  LayoutDashboard, ScanLine, Lock, UserRound,
} from 'lucide-react';
import { Card } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { RoleBadge, Spinner, Banner } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Overlay';
import { SectionCard, AllergyList, ConditionList, MedicationList, AlertList, HistoryList, ContactList, BloodGroupTile, WithheldNotice } from '../../components/medical';
import { CountdownRing } from './CountdownRing';
import { api, download } from '../../services/api';
import { useCountdown, useInterval } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_LABELS, GENDER_LABELS, REASON_LABELS, ROLE_LABELS, SPECIALTY_LABELS, formatDateTime, formatTime } from '../../utils/format';

const ALL_CATEGORIES = ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'MAJOR_CONDITIONS', 'MEDICATION_ALERTS', 'CURRENT_MEDICATIONS', 'MEDICAL_HISTORY', 'EMERGENCY_CONTACTS'];
const SPECIALTY_EQUIVALENT = { SPECIALTY_CONDITIONS: 'MAJOR_CONDITIONS', SPECIALTY_MEDICATIONS: 'CURRENT_MEDICATIONS', SPECIALTY_HISTORY: 'MEDICAL_HISTORY' };
const ENDED_CODES = ['AUTHORIZATION_REVOKED', 'AUTHORIZATION_EXPIRED', 'AUTHORIZATION_DENIED', 'VERIFICATION_REQUIRED', 'AUTHORIZATION_NOT_FOUND'];

function EndedScreen({ ended, emergencyId }) {
  const revoked = ended.status === 'REVOKED' || ended.code === 'AUTHORIZATION_REVOKED';
  const expired = ended.status === 'EXPIRED' || ended.code === 'AUTHORIZATION_EXPIRED';
  const Icon = revoked ? Ban : expired ? Clock3 : ShieldAlert;
  const title = revoked ? 'Authorization revoked' : expired ? 'Authorization expired' : ended.code === 'AUTHORIZATION_NOT_FOUND' ? 'Authorization not found' : 'Access unavailable';
  const d = ended.details || {};
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="mx-auto max-w-xl py-10">
      <Card padded={false} className="overflow-hidden">
        <div className={`h-1 ${revoked ? 'bg-red-500' : 'bg-line-strong'}`} />
        <div className="px-8 py-10 text-center">
          <span className={`mx-auto flex size-14 items-center justify-center rounded-2xl ring-1 ${revoked ? 'bg-red-50 text-red-600 ring-red-600/10' : 'bg-canvas text-muted ring-line'}`}><Icon className="size-6" /></span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{ended.message}</p>
          {revoked && (d.revokedAt || ended.revokedAt) && (
            <dl className="mx-auto mt-6 max-w-sm divide-y divide-line rounded-xl border border-line text-left text-[13px]">
              <div className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-muted">Revoked at</dt><dd className="font-medium text-ink">{formatDateTime(d.revokedAt || ended.revokedAt)}</dd></div>
              <div className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-muted">Revoked by</dt><dd className="font-medium text-ink">{ROLE_LABELS[d.revokedByRole || ended.revokedByRole] || '—'}</dd></div>
              {(d.revocationReason || ended.revocationReason) && <div className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-muted">Reason</dt><dd className="text-right font-medium text-ink">{d.revocationReason || ended.revocationReason}</dd></div>}
            </dl>
          )}
          <div className="mx-auto mt-6 flex max-w-sm items-start gap-2.5 rounded-xl bg-canvas px-4 py-3 text-left text-xs leading-5 text-muted ring-1 ring-line">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            Medical information has been cleared from this screen. The server refuses every further request under this authorization.
          </div>
          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="secondary" icon={LayoutDashboard} to="/pro">Dashboard</Button>
            {emergencyId && <Button icon={ScanLine} to={`/pro/access/new?eid=${encodeURIComponent(emergencyId)}`}>New request for this patient</Button>}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function ActiveAccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [ended, setEnded] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [endBusy, setEndBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const emergencyId = useRef(null);

  const end = useCallback((payload) => {
    setInfo(null); // Clear disclosed data the moment access ends.
    setEnded(payload);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api(`/emergency/medical-information/${id}`);
      emergencyId.current = res.authorization.patientEmergencyId;
      setInfo(res);
      return res;
    } catch (e) {
      if (ENDED_CODES.includes(e.code)) end({ code: e.code, message: e.message, details: e.details });
      else toast.error('Could not load medical information', e.message);
    }
  }, [id, end, toast]);

  const loaded = useRef(null);
  useEffect(() => {
    if (loaded.current === id) return; // each fetch is audited; avoid StrictMode double-fetch
    loaded.current = id;
    load();
  }, [id, load]);

  // Poll authorization status so a revocation elsewhere closes this view promptly.
  const checkStatus = useCallback(async () => {
    try {
      const { authorization } = await api(`/emergency/authorization/${id}`);
      emergencyId.current = authorization.patientEmergencyId;
      if (authorization.status !== 'ACTIVE') {
        end({
          status: authorization.status,
          message: authorization.status === 'REVOKED' ? 'This emergency authorization has been revoked.' : 'This emergency authorization has expired.',
          revokedAt: authorization.revokedAt,
          revokedByRole: authorization.revokedByRole,
          revocationReason: authorization.revocationReason,
        });
      }
    } catch (e) {
      if (e.code === 'AUTHORIZATION_NOT_FOUND') end({ code: e.code, message: e.message });
    }
  }, [id, end]);
  useInterval(checkStatus, info && !ended ? 5000 : null);

  const a = info?.authorization;
  const remaining = useCountdown(a?.expiresAt, info?.serverTime);
  const zeroHandled = useRef(false);
  useEffect(() => {
    if (info && remaining <= 0 && !zeroHandled.current) {
      zeroHandled.current = true;
      // The local timer reached zero; ask the server, which is the authority on expiry.
      setTimeout(checkStatus, 600);
    }
  }, [remaining, info, checkStatus]);

  const refresh = async () => {
    setRefreshing(true);
    const res = await load();
    setRefreshing(false);
    if (res) toast.success('Record refreshed', 'Authorization re-validated by the server.');
  };

  const endAccess = async () => {
    setEndBusy(true);
    try {
      await api(`/emergency/revoke/${id}`, { method: 'POST', body: {} });
      toast.success('Access ended', 'Your authorization has been closed and recorded.');
      navigate('/pro', { replace: true });
    } catch (e) {
      toast.error('Could not end access', e.message);
    } finally {
      setEndBusy(false);
    }
  };

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await download(`/emergency/medical-information/${id}/summary.pdf`, `emergency-summary-${id.slice(0, 8)}.pdf`);
    } catch (e) {
      if (ENDED_CODES.includes(e.code)) end({ code: e.code, message: e.message });
      else toast.error('Export failed', e.message);
    } finally {
      setPdfBusy(false);
    }
  };

  if (ended) return <EndedScreen ended={ended} emergencyId={emergencyId.current} />;
  if (!info) return <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted"><Spinner className="size-6" />Validating authorization…</div>;

  const d = info.disclosure;
  const received = new Set(info.categories.map((c) => SPECIALTY_EQUIVALENT[c] || c));
  const withheld = ALL_CATEGORIES.filter((c) => !received.has(c)).map((c) => CATEGORY_LABELS[c]);
  if (a.professionalRole === 'SPECIALIST') withheld.push(`Records outside ${SPECIALTY_LABELS[a.specialtyScope]}`);
  else withheld.push('Mild allergies & minor conditions');
  const low = remaining <= 60;

  return (
    <div className="space-y-5">
      {/* Authorization header */}
      <div className="card sticky top-14 z-20 overflow-hidden lg:top-4">
        <div className={`h-1 transition-colors ${low ? 'bg-amber-500' : 'bg-brand-600'}`} />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-white"><UserRound className="size-5" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{d.patient.fullName}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/15">
                  <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" /></span>
                  Authorized
                </span>
                <RoleBadge role={a.professionalRole} />
              </div>
              <p className="mt-0.5 text-[13px] text-muted">{d.patient.age} yrs · {GENDER_LABELS[d.patient.gender] || '—'} · <span className="font-mono text-xs">{d.patient.emergencyId}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <CountdownRing remaining={remaining} total={a.durationSeconds} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={RefreshCw} loading={refreshing} onClick={refresh}>Refresh record</Button>
              <Button variant="secondary" size="sm" icon={FileDown} loading={pdfBusy} onClick={pdf}>PDF</Button>
              <Button variant="danger-soft" size="sm" icon={LogOut} onClick={() => setEndOpen(true)}>End access</Button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {low && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Banner tone="warning" icon={Clock3} title="Authorization ending soon">Access will close automatically when the timer reaches zero. Start a new request if care is ongoing.</Banner>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {d.criticalAlerts.length > 0 && <SectionCard icon={ShieldAlert} title="Critical medical alerts" count={d.criticalAlerts.length} accent="warning"><AlertList items={d.criticalAlerts} /></SectionCard>}
          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard icon={AlertTriangle} title="Severe allergies" count={d.severeAllergies.length} accent="danger"><AllergyList items={d.severeAllergies} /></SectionCard>
            {d.majorConditions && <SectionCard icon={Activity} title="Major medical conditions" count={d.majorConditions.length} accent="brand"><ConditionList items={d.majorConditions} /></SectionCard>}
            {d.specialtyConditions && <SectionCard icon={Activity} title={`${SPECIALTY_LABELS[d.specialtyScope]} conditions`} count={d.specialtyConditions.length} accent="brand"><ConditionList items={d.specialtyConditions} /></SectionCard>}
          </div>
          {d.medicationAlerts && <SectionCard icon={Pill} title="Medication alerts" count={d.medicationAlerts.length} accent="warning"><MedicationList items={d.medicationAlerts.map((m) => ({ ...m, isCritical: true }))} /></SectionCard>}
          {d.currentMedications && <SectionCard icon={Pill} title="Current medications" count={d.currentMedications.length} accent="brand"><MedicationList items={d.currentMedications} /></SectionCard>}
          {d.specialtyMedications && <SectionCard icon={Pill} title={`${SPECIALTY_LABELS[d.specialtyScope]} medications`} count={d.specialtyMedications.length} accent="brand"><MedicationList items={d.specialtyMedications} /></SectionCard>}
          {d.medicalHistory && <SectionCard icon={HistoryIcon} title="Relevant medical history" count={d.medicalHistory.length}><HistoryList items={d.medicalHistory} /></SectionCard>}
          {d.specialtyHistory && <SectionCard icon={HistoryIcon} title={`${SPECIALTY_LABELS[d.specialtyScope]} history`} count={d.specialtyHistory.length}><HistoryList items={d.specialtyHistory} /></SectionCard>}
          {d.emergencyContacts && <SectionCard icon={Users} title="Emergency contacts" count={d.emergencyContacts.length}><ContactList items={d.emergencyContacts} /></SectionCard>}
        </div>
        <aside className="space-y-5">
          <BloodGroupTile value={d.bloodGroup} />
          <WithheldNotice categories={withheld} />
          <Card>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink"><ShieldCheck className="size-4 text-brand-600" />Authorization</p>
            <dl className="mt-3 space-y-2 text-[13px]">
              {[
                ['Reason', REASON_LABELS[a.reason]],
                ['Granted', formatTime(a.grantedAt)],
                ['Expires', formatTime(a.expiresAt)],
                ['Views', a.accessCount],
                ['ID', <span className="font-mono text-[11px]">{a.id.slice(0, 8)}…</span>],
              ].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>)}
            </dl>
            <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-xs leading-5 text-muted"><ScrollText className="mt-0.5 size-3.5 shrink-0" />Every view of this record is logged with your identity and the categories disclosed.</p>
          </Card>
          <p className="px-1 text-xs leading-5 text-subtle">Decision support only. Verify critical information clinically. Emergi-Access does not provide diagnosis or treatment advice.</p>
        </aside>
      </div>

      <ConfirmDialog open={endOpen} onClose={() => setEndOpen(false)} onConfirm={endAccess} loading={endBusy} title="End emergency access?" confirmLabel="End access"
        description="Your authorization will be closed immediately and you will need a new break-glass request to view this record again." />
    </div>
  );
}
