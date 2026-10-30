import { useState } from 'react';
import { PencilLine, FileDown, AlertTriangle, Activity, Pill, History as HistoryIcon, Users, ShieldAlert, Clock } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { PageHeader, DefinitionList, Card } from '../../components/ui/Data';
import { Button } from '../../components/ui/Button';
import { PageSkeleton, ErrorState } from '../../components/ui/Feedback';
import { SectionCard, AllergyList, ConditionList, MedicationList, AlertList, HistoryList, ContactList, BloodGroupTile } from '../../components/medical';
import { download } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatDateTime, GENDER_LABELS } from '../../utils/format';

export default function MedicalProfile() {
  const { data: p, error, loading, reload } = useApi('/patients/me');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  if (loading && !p) return <PageSkeleton />;
  if (error && !p) return <ErrorState error={error} onRetry={reload} />;
  const m = p.medical;

  const pdf = async () => {
    setBusy(true);
    try {
      await download('/patients/me/summary.pdf', `emergi-access-summary-${p.emergencyId}.pdf`);
    } catch (e) {
      toast.error('Download failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Medical profile"
        title="Your complete emergency profile"
        description="Only you can see everything here. Clinicians receive a role-filtered subset during an authorized emergency."
        actions={<><Button variant="secondary" icon={FileDown} loading={busy} onClick={pdf}>Download PDF</Button><Button icon={PencilLine} to="/patient/profile/edit">Edit information</Button></>}
      />
      <p className="-mt-4 mb-6 flex items-center gap-1.5 text-[13px] text-muted"><Clock className="size-3.5" />Last updated {formatDateTime(p.updatedAt)}</p>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5">
          <BloodGroupTile value={m.bloodGroup} />
          <Card>
            <h3 className="text-sm font-semibold text-ink">Personal details</h3>
            <DefinitionList className="mt-2" items={[
              ['Name', p.user.fullName],
              ['Date of birth', formatDate(p.dateOfBirth)],
              ['Gender', GENDER_LABELS[p.gender] || 'Not specified'],
              ['Mobile', p.user.phone],
              ['Emergency ID', <span className="font-mono text-xs">{p.emergencyId}</span>],
            ]} />
          </Card>
        </div>
        <div className="space-y-5">
          <SectionCard icon={ShieldAlert} title="Critical medical alerts" count={m.alerts.length} accent="warning"><AlertList items={m.alerts} /></SectionCard>
          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard icon={AlertTriangle} title="Allergies" count={m.allergies.length} accent="danger"><AllergyList items={m.allergies} /></SectionCard>
            <SectionCard icon={Activity} title="Chronic conditions" count={m.conditions.length} accent="brand"><ConditionList items={m.conditions} /></SectionCard>
          </div>
          <SectionCard icon={Pill} title="Current medications" count={m.medications.length} accent="brand"><MedicationList items={m.medications} /></SectionCard>
          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard icon={HistoryIcon} title="Medical history" count={m.history.length}><HistoryList items={m.history} /></SectionCard>
            <SectionCard icon={Users} title="Emergency contacts" count={p.contacts.length} action={<Button size="sm" variant="link" to="/patient/contacts">Manage</Button>}><ContactList items={p.contacts} /></SectionCard>
          </div>
        </div>
      </div>
    </>
  );
}
