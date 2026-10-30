import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  UserRound, ShieldAlert, ArrowRight, ArrowLeft, ScanLine, AlertTriangle, CheckCircle2, ShieldX, Fingerprint, Siren, Eye, Clock3, ScrollText, Lock,
} from 'lucide-react';
import { Card, Stepper } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { Textarea, Checkbox, Input } from '../../components/ui/Form';
import { Spinner, RoleBadge } from '../../components/ui/Feedback';
import { OtpInput, DemoOtpNotice } from '../../components/OtpInput';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { REASON_LABELS, GENDER_LABELS, SPECIALTY_LABELS, CATEGORY_LABELS, ROLE_LABELS, formatDuration } from '../../utils/format';

const STEPS = [
  { label: 'Identify', description: 'Confirm the patient' },
  { label: 'Reason', description: 'Why access is needed' },
  { label: 'Justify', description: 'Short clinical explanation' },
  { label: 'Confirm', description: 'Break-glass acknowledgement' },
  { label: 'Verify', description: 'One-time code' },
];

const REASON_HINTS = {
  PATIENT_UNCONSCIOUS: 'Unresponsive or with reduced consciousness',
  UNABLE_TO_COMMUNICATE: 'Conscious but cannot give a history',
  CRITICAL_EMERGENCY: 'Life-threatening situation in progress',
  UNKNOWN_MEDICAL_HISTORY: 'No history available from any source',
  IMMEDIATE_TREATMENT_REQUIRED: 'Treatment cannot wait for consent',
};

const ROLE_SCOPE = {
  PARAMEDIC: ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'MAJOR_CONDITIONS', 'MEDICATION_ALERTS', 'EMERGENCY_CONTACTS'],
  DOCTOR: ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'MAJOR_CONDITIONS', 'CURRENT_MEDICATIONS', 'MEDICAL_HISTORY'],
  SPECIALIST: ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'SPECIALTY_CONDITIONS', 'SPECIALTY_MEDICATIONS', 'SPECIALTY_HISTORY'],
};

function Denied({ error, onBack }) {
  const unverified = error.code === 'PROFESSIONAL_NOT_VERIFIED';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg py-6 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-600/10">{unverified ? <ShieldX className="size-6" /> : <AlertTriangle className="size-6" />}</span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-ink">{unverified ? 'Emergency access denied' : error.code === 'INVALID_EMERGENCY_ID' ? 'Emergency ID not recognised' : 'Request could not be completed'}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{error.message}</p>
      <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-1.5 text-xs text-muted ring-1 ring-line"><ScrollText className="size-3.5" />This attempt has been recorded in the audit log.</p>
      <div className="mt-7 flex justify-center gap-2">
        <Button variant="secondary" icon={ScanLine} onClick={onBack}>Scan again</Button>
        <Button variant="ghost" to="/pro">Back to dashboard</Button>
      </div>
    </motion.div>
  );
}

export default function AccessRequest() {
  const [params] = useSearchParams();
  const eid = params.get('eid') || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const role = user.role;

  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState(null);
  const [fatal, setFatal] = useState(null);
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [purpose, setPurpose] = useState('');
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpError, setOtpError] = useState(null);

  // Identification is audited server-side, so guard against React StrictMode's double effect.
  const identified = useRef(null);
  useEffect(() => {
    if (identified.current === eid) return;
    identified.current = eid;
    api('/emergency/identify', { method: 'POST', body: { emergencyId: eid } })
      .then((r) => setPatient(r.patient))
      .catch((e) => setFatal(e));
  }, [eid]);

  const submitRequest = async () => {
    setBusy(true);
    try {
      const res = await api('/emergency/request-access', {
        method: 'POST',
        body: { emergencyId: patient.emergencyId, reason, justification, treatmentPurpose: role === 'SPECIALIST' ? purpose : undefined, acknowledged: true },
      });
      setPending(res);
      setStep(4);
    } catch (e) {
      if (e.code === 'ACTIVE_AUTHORIZATION_EXISTS') {
        toast.info('You already have active access', 'Opening the existing authorization.');
        navigate(`/pro/access/${e.details.authorizationId}`, { replace: true });
      } else if (e.status === 400) {
        toast.error('Please check your request', e.message);
      } else setFatal(e);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    setOtpError(null);
    try {
      const { authorization } = await api('/emergency/verify-otp', { method: 'POST', body: { authorizationId: pending.authorization.id, code: value } });
      toast.success('Emergency access granted', `Authorized for ${formatDuration(authorization.durationSeconds)}. This session is being recorded.`);
      navigate(`/pro/access/${authorization.id}`, { replace: true });
    } catch (e) {
      setCode('');
      if (e.code === 'OTP_INVALID') setOtpError(e);
      else setFatal(e);
    } finally {
      setBusy(false);
    }
  };

  const canNext = [Boolean(patient), Boolean(reason) && (role !== 'SPECIALIST' || purpose.trim().length >= 5), justification.trim().length >= 15, ack][step];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Siren className="size-3.5" />Break-glass</p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-ink">Emergency access request</h1>
        </div>
        <Button variant="ghost" to="/pro">Cancel</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="hidden h-fit lg:block">
          <Stepper steps={STEPS} current={step} orientation="vertical" />
          <div className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
            <p className="font-semibold text-ink">Signed in as</p>
            <p className="mt-1">{user.fullName}</p>
            <p>{ROLE_LABELS[role]} · {user.professional?.professionalId}</p>
            <p>{user.professional?.organization}</p>
          </div>
        </Card>

        <Card padded={false} className="overflow-hidden">
          <div className="border-b border-line px-6 py-4 lg:hidden"><Stepper steps={STEPS} current={step} /></div>
          <div className="min-h-[420px] p-6 sm:p-8">
            {fatal ? (
              <Denied error={fatal} onBack={() => navigate('/pro/scan')} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                  {step === 0 && (
                    !patient ? (
                      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted"><Spinner className="size-6" />Identifying patient…</div>
                    ) : (
                      <div>
                        <h2 className="text-lg font-semibold text-ink">Confirm patient identity</h2>
                        <p className="mt-1 text-[13px] text-muted">Compare these details with the patient in front of you.</p>
                        <div className="mt-6 flex items-center gap-5 rounded-2xl border border-line bg-canvas/50 p-5">
                          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-white"><UserRound className="size-7" /></span>
                          <div className="min-w-0">
                            <p className="text-2xl font-semibold tracking-tight text-ink">{patient.displayName}</p>
                            <p className="mt-1 text-sm text-muted">{patient.age} years · {GENDER_LABELS[patient.gender] || 'Gender not specified'}</p>
                            <p className="mt-1.5 font-mono text-xs text-muted">{patient.emergencyId}</p>
                          </div>
                          <CheckCircle2 className="ml-auto hidden size-6 shrink-0 text-emerald-600 sm:block" />
                        </div>
                        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-brand-50/60 px-4 py-3 text-[13px] text-brand-900 ring-1 ring-brand-600/10">
                          <Lock className="mt-0.5 size-4 shrink-0" />No medical information has been disclosed. Medical data is released only after an authorized break-glass request.
                        </div>
                        {patient.activeAuthorizationId && (
                          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
                            You already hold an active authorization for this patient.
                            <Button size="sm" to={`/pro/access/${patient.activeAuthorizationId}`}>Resume</Button>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {step === 1 && (
                    <div>
                      <h2 className="text-lg font-semibold text-ink">Select the emergency reason</h2>
                      <p className="mt-1 text-[13px] text-muted">Choose the reason that best describes the situation.</p>
                      <div className="mt-6 grid gap-2.5 sm:grid-cols-2" role="radiogroup">
                        {Object.entries(REASON_LABELS).map(([key, label]) => (
                          <button key={key} type="button" role="radio" aria-checked={reason === key} onClick={() => setReason(key)}
                            className={`rounded-xl border p-4 text-left transition-all ${reason === key ? 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10' : 'border-line bg-white hover:border-line-strong hover:bg-canvas/50'}`}>
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-ink">{label}</span>
                              <span className={`flex size-4 items-center justify-center rounded-full border ${reason === key ? 'border-brand-600 bg-brand-600' : 'border-line-strong'}`}>{reason === key && <span className="size-1.5 rounded-full bg-white" />}</span>
                            </span>
                            <span className="mt-1 block text-xs text-muted">{REASON_HINTS[key]}</span>
                          </button>
                        ))}
                      </div>
                      {role === 'SPECIALIST' && (
                        <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                          <p className="text-[13px] font-semibold text-ink">Specialist scope: {SPECIALTY_LABELS[user.professional?.specialty]}</p>
                          <p className="mt-0.5 text-xs text-muted">You will see only records categorised under your verified specialty.</p>
                          <Input fieldClassName="mt-3" label="Treatment purpose" required placeholder="e.g. Urgent cardiology review for arrhythmia" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <h2 className="text-lg font-semibold text-ink">Provide a justification</h2>
                      <p className="mt-1 text-[13px] text-muted">Briefly describe the clinical situation. This is shown to the patient and administrators.</p>
                      <Textarea fieldClassName="mt-6" rows={5} autoFocus maxLength={500} value={justification} onChange={(e) => setJustification(e.target.value)}
                        placeholder="e.g. Found unresponsive at a bus stop, no family present. Need allergy and medication status before treatment."
                        hint={`${justification.trim().length}/500 · minimum 15 characters`} />
                      <div className="mt-4 flex flex-wrap gap-2">
                        {['Found unresponsive at the scene, no history available.', 'Patient post-ictal and unable to communicate, need medication history.', 'Severe breathlessness on arrival, checking allergies before treatment.'].map((t) => (
                          <button key={t} type="button" onClick={() => setJustification(t)} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-muted hover:border-brand-300 hover:text-ink">{t.split(',')[0]}…</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div>
                      <h2 className="text-lg font-semibold text-ink">Confirm break-glass access</h2>
                      <p className="mt-1 text-[13px] text-muted">Review your request before continuing.</p>
                      <dl className="mt-6 divide-y divide-line rounded-xl border border-line text-[13px]">
                        {[
                          ['Patient', `${patient.displayName} · ${patient.age} yrs`],
                          ['Reason', REASON_LABELS[reason]],
                          ['Justification', justification],
                          role === 'SPECIALIST' && ['Treatment purpose', purpose],
                          ['Your role', <span className="inline-flex items-center gap-2">{ROLE_LABELS[role]} <RoleBadge role={role} /></span>],
                        ].filter(Boolean).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-[120px_1fr] gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                        ))}
                      </dl>
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-subtle">You will receive</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">{ROLE_SCOPE[role].map((c) => <span key={c} className="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{CATEGORY_LABELS[c]}</span>)}</div>
                      </div>
                      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50/70 p-4">
                        <div className="flex gap-3">
                          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
                          <div className="text-[13px] leading-5 text-amber-950">
                            <p className="font-semibold">This action is recorded and monitored</p>
                            <ul className="mt-1.5 space-y-1 text-amber-900">
                              <li className="flex items-center gap-1.5"><Eye className="size-3.5" />The patient and administrators will see this access.</li>
                              <li className="flex items-center gap-1.5"><Clock3 className="size-3.5" />Access is time-limited and can be revoked at any time.</li>
                              <li className="flex items-center gap-1.5"><ScrollText className="size-3.5" />Misuse of emergency access may result in disciplinary action.</li>
                            </ul>
                          </div>
                        </div>
                        <Checkbox className="mt-4" checked={ack} onChange={(e) => setAck(e.target.checked)} label="I confirm this is a genuine emergency and accept that this access is audited." />
                      </div>
                    </div>
                  )}

                  {step === 4 && pending && (
                    <div className="mx-auto max-w-md text-center">
                      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-navy-800 text-brand-300"><Fingerprint className="size-6" /></span>
                      <h2 className="mt-5 text-lg font-semibold text-ink">Verify this emergency access</h2>
                      <p className="mt-1 text-[13px] text-muted">Enter the one-time code to activate a {formatDuration(pending.authorization.durationSeconds)} authorization.</p>
                      <div className="mt-6"><OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) verify(v); }} disabled={busy} invalid={Boolean(otpError)} /></div>
                      {otpError && <p className="mt-3 text-[13px] text-red-600">{otpError.message}. {otpError.details?.remainingAttempts} attempts remaining.</p>}
                      <div className="mt-4 text-left"><DemoOtpNotice code={pending.otp.demoCode} onUse={(c) => { setCode(c); verify(c); }} /></div>
                      <Button size="lg" className="mt-5 w-full" loading={busy} disabled={code.length !== 6} onClick={() => verify()}>Verify and access</Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          {!fatal && step < 4 && (
            <div className="flex items-center justify-between border-t border-line bg-canvas/50 px-6 py-4 sm:px-8">
              {step > 0 ? <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>Back</Button> : <Button variant="ghost" icon={ScanLine} to="/pro/scan">Re-scan</Button>}
              {step < 3 ? (
                <Button disabled={!canNext} iconRight={ArrowRight} onClick={() => setStep((s) => s + 1)}>{step === 0 ? 'Request emergency access' : 'Continue'}</Button>
              ) : (
                <Button variant="danger" disabled={!ack} loading={busy} icon={Siren} onClick={submitRequest}>Break glass & request access</Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
