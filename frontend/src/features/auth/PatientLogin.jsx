import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import { Input } from '../../components/ui/Form';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { homeForRole } from '../../utils/format';
import { DemoAccounts } from './DemoAccounts';

export default function PatientLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  const onSubmit = async ({ email, password }) => {
    setError(null);
    try {
      const res = await login(email, password, 'patient');
      navigate(location.state?.from?.startsWith('/patient') ? location.state.from : homeForRole(res.user.role), { replace: true });
    } catch (e) {
      setError(e);
    }
  };

  return (
    <AuthLayout variant="patient" title="Welcome back" subtitle="Sign in to manage your emergency profile and see who has accessed it.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>
              {error.message}
              {error.code === 'WRONG_PORTAL' && (
                <> <Link to="/pro/login" className="font-semibold underline">Go to professional sign in</Link></>
              )}
            </span>
          </div>
        )}
        <Input label="Email" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
        <Input label="Password" type="password" icon={Lock} autoComplete="current-password" placeholder="••••••••••" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} iconRight={ArrowRight}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted">
        New to Emergi-Access? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create your Emergency ID</Link>
      </p>
      <p className="mt-2 text-center text-[13px] text-muted">
        Healthcare professional? <Link to="/pro/login" className="font-semibold text-brand-700 hover:underline">Sign in here</Link>
      </p>
      <DemoAccounts portal="patient" onPick={(email, pw) => { setValue('email', email); setValue('password', pw); }} />
    </AuthLayout>
  );
}
