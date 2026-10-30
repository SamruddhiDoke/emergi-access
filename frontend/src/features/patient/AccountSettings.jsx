import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, KeyRound, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card, CardHeader } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Form';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Overlay';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { GENDER_LABELS, formatDateTime } from '../../utils/format';

export default function AccountSettings() {
  const { data, error, loading, reload, setData } = useApi('/patients/me');
  const { refresh } = useAuth();
  const toast = useToast();
  const personal = useForm();
  const password = useForm();
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPw, setRegenPw] = useState('');
  const [regenBusy, setRegenBusy] = useState(false);

  useEffect(() => {
    if (data) personal.reset({ fullName: data.user.fullName, phone: data.user.phone || '', dateOfBirth: data.dateOfBirth, gender: data.gender || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const savePersonal = async (v) => {
    try {
      setData(await api('/patients/me', { method: 'PUT', body: { ...v, gender: v.gender || null } }));
      await refresh();
      toast.success('Personal details saved');
    } catch (e) {
      toast.error('Could not save', e.message);
    }
  };

  const changePassword = async (v) => {
    try {
      const res = await api('/auth/change-password', { method: 'POST', body: v });
      password.reset({ currentPassword: '', newPassword: '' });
      toast.success('Password updated', res.message);
    } catch (e) {
      toast.error('Could not change password', e.message);
    }
  };

  const regenerate = async () => {
    setRegenBusy(true);
    try {
      const res = await api('/patients/me/emergency-id/regenerate', { method: 'POST', body: { password: regenPw } });
      toast.success('New Emergency ID issued', `${res.emergencyId} — download your new QR card.`);
      setRegenOpen(false);
      setRegenPw('');
      reload({ silent: true });
      refresh();
    } catch (e) {
      toast.error('Could not regenerate', e.message);
    } finally {
      setRegenBusy(false);
    }
  };

  const pe = personal.formState.errors;
  return (
    <>
      <PageHeader eyebrow="Account" title="Account settings" description={`Signed in as ${data.user.email}`} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card as="form" onSubmit={personal.handleSubmit(savePersonal)} noValidate>
          <CardHeader title="Personal details" description="Used to confirm your identity in an emergency." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input fieldClassName="sm:col-span-2" label="Full name" error={pe.fullName?.message} {...personal.register('fullName', { required: 'Full name is required' })} />
            <Input label="Mobile number" error={pe.phone?.message} {...personal.register('phone', { required: 'Mobile number is required', pattern: { value: /^\+?[0-9][0-9\s-]{7,16}$/, message: 'Enter a valid mobile number' } })} />
            <Input label="Date of birth" type="date" {...personal.register('dateOfBirth', { required: true })} />
            <Select label="Gender" placeholder="Prefer not to specify" options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))} {...personal.register('gender')} />
          </div>
          <div className="mt-6 flex justify-end border-t border-line pt-5">
            <Button type="submit" icon={Save} loading={personal.formState.isSubmitting} disabled={!personal.formState.isDirty}>Save details</Button>
          </div>
        </Card>
        <div className="space-y-6">
          <Card as="form" onSubmit={password.handleSubmit(changePassword)} noValidate>
            <CardHeader icon={KeyRound} title="Change password" description="Other devices will be signed out." />
            <div className="mt-5 space-y-4">
              <Input label="Current password" type="password" autoComplete="current-password" {...password.register('currentPassword', { required: true })} />
              <Input label="New password" type="password" autoComplete="new-password" hint="At least 10 characters with a letter and a number." error={password.formState.errors.newPassword?.message} {...password.register('newPassword', { required: 'Required', minLength: { value: 10, message: 'At least 10 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include a letter and a number' })} />
            </div>
            <Button type="submit" variant="secondary" className="mt-5 w-full" loading={password.formState.isSubmitting}>Update password</Button>
          </Card>
          <Card className="border-amber-200">
            <CardHeader icon={RefreshCcw} title="Regenerate Emergency ID" description={`Current ID issued ${formatDateTime(data.emergencyIdIssuedAt)}`} />
            <p className="mt-3 text-[13px] leading-5 text-muted">Use this if your QR card is lost or shared. Your old QR code will stop working immediately.</p>
            <Button variant="secondary" className="mt-4 w-full" icon={RefreshCcw} onClick={() => setRegenOpen(true)}>Regenerate ID</Button>
          </Card>
        </div>
      </div>
      <Modal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        title="Regenerate your Emergency ID?"
        description="Any printed or saved copy of your current QR code will stop working."
        footer={<><Button variant="secondary" onClick={() => setRegenOpen(false)}>Cancel</Button><Button onClick={regenerate} loading={regenBusy} disabled={!regenPw}>Regenerate</Button></>}
      >
        <div className="mb-4 flex gap-2.5 rounded-lg bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900 ring-1 ring-amber-600/15"><AlertTriangle className="mt-0.5 size-4 shrink-0" />Remember to download and carry your new QR card.</div>
        <Input label="Confirm your password" type="password" value={regenPw} onChange={(e) => setRegenPw(e.target.value)} autoFocus />
      </Modal>
    </>
  );
}
