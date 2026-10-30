import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { OtpInput, DemoOtpNotice } from '../../components/OtpInput';
import { useAuth } from '../../context/AuthContext';
import { homeForRole } from '../../utils/format';
import { DemoAccounts } from './DemoAccounts';

export default function ProfessionalLogin() {
  const { user, login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  if (user && !verifying) return <Navigate to={homeForRole(user.role)} replace />;

  const onSubmit = async ({ email, password }) => {
    setError(null);
    try {
      const res = await login(email, password, 'professional');
      setChallenge({ ...res.challenge, maskedEmail: res.maskedEmail });
      setCode('');
    } catch (e) {
      setError(e);
    }
  };

  const submitCode = async (value = code) => {
    if (value.length !== 6) return;
    setError(null);
    setVerifying(true);
    try {
      const u = await verifyOtp(challenge.challengeId, value);
      const from = location.state?.from;
      const home = homeForRole(u.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (e) {
      setError(e);
      setCode('');
      setVerifying(false);
    }
  };

  return (
    <AuthLayout
      variant="professional"
      title={challenge ? 'Verify it’s you' : 'Professional sign in'}
      subtitle={challenge ? `Enter the 6-digit code sent to ${challenge.maskedEmail}.` : 'For verified paramedics, doctors, specialists and administrators.'}
    >
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {error.message}
            {error.details?.remainingAttempts !== undefined && ` ${error.details.remainingAttempts} attempts remaining.`}
            {error.code === 'WRONG_PORTAL' && <> <Link to="/login" className="font-semibold underline">Go to patient sign in</Link></>}
          </span>
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {!challenge ? (
          <motion.div key="creds" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Input label="Work email" type="email" icon={Mail} autoComplete="username" placeholder="name@hospital.org" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
              <Input label="Password" type="password" icon={Lock} autoComplete="current-password" placeholder="••••••••••" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
              <Button type="submit" size="lg" variant="navy" className="w-full" loading={isSubmitting} iconRight={ArrowRight}>Continue</Button>
            </form>
            <p className="mt-6 text-center text-[13px] text-muted">
              Not registered? <Link to="/pro/register" className="font-semibold text-brand-700 hover:underline">Request professional access</Link>
            </p>
            <p className="mt-2 text-center text-[13px] text-muted">
              Patient? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Patient sign in</Link>
            </p>
            <DemoAccounts portal="professional" onPick={(email, pw) => { setValue('email', email); setValue('password', pw); }} />
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-5">
            <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) submitCode(v); }} disabled={verifying} invalid={Boolean(error)} />
            <DemoOtpNotice code={challenge.demoCode} onUse={(c) => { setCode(c); submitCode(c); }} />
            <Button size="lg" variant="navy" className="w-full" loading={verifying} disabled={code.length !== 6} icon={ShieldCheck} onClick={() => submitCode()}>Verify and sign in</Button>
            <button type="button" onClick={() => { setChallenge(null); setError(null); }} className="mx-auto flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
              <ArrowLeft className="size-4" /> Use a different account
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
