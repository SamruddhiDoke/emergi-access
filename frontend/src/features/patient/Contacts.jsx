import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Info } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, Card } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { SectionCard, ContactList } from '../../components/medical';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ContactsFields } from './MedicalFormSections';
import { Users } from 'lucide-react';

export default function Contacts() {
  const { data, error, loading, reload, setData } = useApi('/patients/me');
  const toast = useToast();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm();

  useEffect(() => {
    if (data) reset({ contacts: data.contacts.map(({ name, relationship, phone, isPrimary }) => ({ name, relationship, phone, isPrimary })) });
  }, [data, reset]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const onSubmit = async (v) => {
    try {
      const updated = await api('/patients/me', { method: 'PUT', body: { contacts: v.contacts } });
      setData(updated);
      toast.success('Emergency contacts saved');
    } catch (e) {
      toast.error('Could not save contacts', e.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Emergency contacts" title="Who should we call?" description="Paramedics see these contacts during an authorized emergency so they can reach your family quickly." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-6">
          <ContactsFields control={control} register={register} errors={errors} />
          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
            <Button type="button" variant="ghost" disabled={!isDirty} onClick={() => reset()}>Discard</Button>
            <Button type="submit" icon={Save} loading={isSubmitting} disabled={!isDirty}>Save contacts</Button>
          </div>
        </form>
        <div className="space-y-5">
          <SectionCard icon={Users} title="As shown to paramedics" count={data.contacts.length}><ContactList items={data.contacts} /></SectionCard>
          <Card className="flex gap-3 text-[13px] leading-5 text-muted"><Info className="mt-0.5 size-4 shrink-0 text-brand-600" />Doctors and specialists do not receive your emergency contacts under the minimum-necessary policy.</Card>
        </div>
      </div>
    </>
  );
}
