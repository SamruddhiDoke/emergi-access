import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Input, Select } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { api } from '../../services/api';
import { SPECIALTY_LABELS } from '../../utils/format';

export default function ProfessionalRegister() {
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { role: 'PARAMEDIC' } });
  const role = watch('role');

  const onSubmit = async (values) => {
    setError(null);
    try {
      const res = await api('/auth/register/professional', {
        method: 'POST',
        body: { ...values, specialty: values.role === 'SPECIALIST' ? values.specialty : null },
      });
      setDone(res);
    } catch (e) {
      setError(e);
    }
  };

  if (done) {
    return (
      <AuthLayout variant="professional">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-6" /></span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Registration received</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{done.message}</p>
          <div className="mt-6 rounded-xl border border-line bg-canvas p-4 text-left text-[13px]">
            <p><span className="text-muted">Professional ID · </span><span className="font-medium text-ink">{done.user.professional.professionalId}</span></p>
            <p className="mt-1"><span className="text-muted">Status · </span><span className="font-medium text-amber-700">Pending verification</span></p>
          </div>
          <Button to="/pro/login" className="mt-6 w-full" size="lg" variant="navy">Go to sign in</Button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="professional" title="Request professional access" subtitle="Your account will be reviewed by an administrator before emergency access is enabled.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error.message}</div>
        )}
        <Input label="Full name" required error={errors.fullName?.message} {...register('fullName', { required: 'Full name is required' })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Professional role" required options={[{ value: 'PARAMEDIC', label: 'Paramedic' }, { value: 'DOCTOR', label: 'Doctor' }, { value: 'SPECIALIST', label: 'Specialist' }]} {...register('role')} />
          <Input label="Professional ID" required placeholder="MH-DOC-20431" error={errors.professionalId?.message} {...register('professionalId', { required: 'Professional ID is required', pattern: { value: /^[A-Za-z]{2,5}-[A-Za-z0-9-]{3,20}$/, message: 'Format: e.g. MH-DOC-20431' } })} />
        </div>
        {role === 'SPECIALIST' && (
          <Select label="Clinical specialty" required placeholder="Select specialty" error={errors.specialty?.message} options={Object.entries(SPECIALTY_LABELS).filter(([k]) => k !== 'GENERAL').map(([value, label]) => ({ value, label }))} {...register('specialty', { required: 'Specialists must choose a specialty' })} hint="Specialist access is limited to records in this specialty." />
        )}
        <Input label="Healthcare organization" required placeholder="Hospital or EMS service" error={errors.organization?.message} {...register('organization', { required: 'Organization is required' })} />
        <Input label="Work email" type="email" required error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
        <Input label="Password" type="password" required autoComplete="new-password" hint="At least 10 characters, including a letter and a number." error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 10, message: 'At least 10 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} />
        <div className="flex gap-2.5 rounded-lg bg-canvas px-3.5 py-3 text-xs leading-5 text-muted ring-1 ring-line">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Demonstration verification only. This prototype is not connected to any government or medical council licensing registry.
        </div>
        <Button type="submit" size="lg" variant="navy" className="w-full" loading={isSubmitting}>Submit for verification</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">Already registered? <Link to="/pro/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></p>
    </AuthLayout>
  );
}
