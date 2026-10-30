import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { AllergiesFields, ConditionsFields, MedicationsFields, AlertsFields, HistoryFields, BloodGroupField, cleanMedical, medicalToForm } from './MedicalFormSections';

export default function EditMedical() {
  const { data, error, loading, reload } = useApi('/patients/me');
  const toast = useToast();
  const navigate = useNavigate();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    if (data) reset({ medical: medicalToForm(data.medical) });
  }, [data, reset]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const onSubmit = async (v) => {
    try {
      await api('/patients/me', { method: 'PUT', body: { medical: cleanMedical(v.medical) } });
      toast.success('Medical information updated', 'Your changes are live for future emergency access.');
      navigate('/patient/profile');
    } catch (e) {
      toast.error('Could not save changes', e.message);
    }
  };

  const props = { control, register, errors };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        back={{ to: '/patient/profile', label: 'Medical profile' }}
        eyebrow="Edit"
        title="Update medical information"
        description="Changes take effect immediately. Every update is timestamped and recorded."
        actions={<><Button variant="secondary" type="button" to="/patient/profile">Cancel</Button><Button type="submit" icon={Save} loading={isSubmitting} disabled={!isDirty}>Save changes</Button></>}
      />
      <div className="space-y-5">
        <section className="card p-6"><div className="max-w-xs"><BloodGroupField register={register} /></div></section>
        <section className="card p-6"><AlertsFields {...props} /></section>
        <section className="card p-6"><AllergiesFields {...props} /></section>
        <section className="card p-6"><ConditionsFields {...props} /></section>
        <section className="card p-6"><MedicationsFields {...props} /></section>
        <section className="card p-6"><HistoryFields {...props} /></section>
      </div>
      <div className="sticky bottom-4 mt-6 flex justify-end">
        <div className="flex gap-2 rounded-xl border border-line bg-white/95 p-2 shadow-[var(--shadow-pop)] backdrop-blur">
          <Button variant="ghost" type="button" to="/patient/profile">Cancel</Button>
          <Button type="submit" icon={Save} loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
        </div>
      </div>
    </form>
  );
}
