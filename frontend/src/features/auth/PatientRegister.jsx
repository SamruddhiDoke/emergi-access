import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Input, Select, Checkbox } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Data';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { GENDER_LABELS } from '../../utils/format';
import { AllergiesFields, ConditionsFields, MedicationsFields, AlertsFields, HistoryFields, ContactsFields, BloodGroupField, cleanMedical } from '../patient/MedicalFormSections';

const STEPS = [
  { label: 'Account', description: 'Your personal details', fields: ['fullName', 'email', 'phone', 'dateOfBirth', 'password', 'confirmPassword'] },
  { label: 'Medical', description: 'Blood group, allergies, conditions', fields: ['medical'] },
  { label: 'Medication & history', description: 'Medications, alerts, history', fields: ['medical'] },
  { label: 'Contacts', description: 'Who to call in an emergency', fields: ['contacts', 'consent'] },
];

export default function PatientRegister() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const { registerPatient } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { register, control, handleSubmit, trigger, getValues, formState: { errors, isSubmitting } } = useForm({
    mode: 'onTouched',
    defaultValues: {
      gender: '',
      medical: { bloodGroup: '', allergies: [], conditions: [], medications: [], alerts: [], history: [] },
      contacts: [{ name: '', relationship: '', phone: '', isPrimary: true }],
    },
  });
  const formProps = { control, register, errors };

  const next = async () => {
    if (await trigger(STEPS[step].fields)) setStep((s) => s + 1);
  };

  const onSubmit = async (v) => {
    setError(null);
    try {
      await registerPatient({
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        password: v.password,
        dateOfBirth: v.dateOfBirth,
        gender: v.gender || null,
        medical: cleanMedical(v.medical),
        contacts: v.contacts,
      });
      toast.success('Your Emergency ID is ready', 'Download your QR card and keep it with you.');
      navigate('/patient/qr', { replace: true });
    } catch (e) {
      setError(e);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <p className="text-[13px] text-muted">Already registered? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></p>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <p className="eyebrow">Create your Emergency ID</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Patient registration</h1>
          <div className="mt-8"><Stepper steps={STEPS} current={step} orientation="vertical" /></div>
          <div className="mt-10 rounded-xl border border-line bg-white p-4 text-xs leading-5 text-muted">
            <ShieldCheck className="mb-2 size-4 text-brand-600" />
            Your QR code will contain only a random Emergency ID — never your name or medical data. Use synthetic information in this demo.
          </div>
        </aside>

        <div>
          <div className="mb-6 lg:hidden"><Stepper steps={STEPS} current={step} /></div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="card overflow-hidden">
            <div className="border-b border-line px-6 py-5 sm:px-8">
              <p className="text-xs font-medium text-muted">Step {step + 1} of {STEPS.length}</p>
              <h2 className="mt-0.5 text-lg font-semibold text-ink">{STEPS[step].description}</h2>
            </div>
            <div className="px-6 py-6 sm:px-8">
              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error.message}</div>
              )}
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                  {step === 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input fieldClassName="sm:col-span-2" label="Full name" required error={errors.fullName?.message} {...register('fullName', { required: 'Full name is required', minLength: { value: 2, message: 'Name is too short' } })} />
                      <Input label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
                      <Input label="Mobile number" required placeholder="+91 98xxx xxxxx" error={errors.phone?.message} {...register('phone', { required: 'Mobile number is required', pattern: { value: /^\+?[0-9][0-9\s-]{7,16}$/, message: 'Enter a valid mobile number' } })} />
                      <Input label="Date of birth" type="date" required max={new Date().toISOString().slice(0, 10)} error={errors.dateOfBirth?.message} {...register('dateOfBirth', { required: 'Date of birth is required' })} />
                      <Select label="Gender" hint="Optional" placeholder="Prefer not to specify" options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))} {...register('gender')} />
                      <Input label="Password" type="password" required autoComplete="new-password" hint="At least 10 characters with a letter and a number." error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 10, message: 'At least 10 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} />
                      <Input label="Confirm password" type="password" required autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword', { validate: (v) => v === getValues('password') || 'Passwords do not match' })} />
                    </div>
                  )}
                  {step === 1 && (
                    <div className="space-y-8">
                      <div className="max-w-xs"><BloodGroupField register={register} /></div>
                      <AllergiesFields {...formProps} />
                      <ConditionsFields {...formProps} />
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-8">
                      <MedicationsFields {...formProps} />
                      <AlertsFields {...formProps} />
                      <HistoryFields {...formProps} />
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-6">
                      <ContactsFields {...formProps} />
                      <div className="rounded-xl border border-line bg-canvas/60 p-4">
                        <Checkbox
                          label="I understand how my information is shared"
                          description="Verified professionals may access the minimum necessary part of my profile during an emergency. Every access is time-limited, recorded and visible to me, and I can revoke it."
                          {...register('consent', { required: true })}
                        />
                        {errors.consent && <p className="mt-2 pl-[30px] text-xs text-red-600">Please confirm to continue</p>}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between border-t border-line bg-canvas/50 px-6 py-4 sm:px-8">
              {step > 0 ? <Button type="button" variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>Back</Button> : <span />}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next} iconRight={ArrowRight}>Continue</Button>
              ) : (
                <Button type="submit" loading={isSubmitting} icon={ShieldCheck}>Create Emergency ID</Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
