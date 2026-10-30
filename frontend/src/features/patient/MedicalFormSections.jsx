import { useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Input, Select, Checkbox } from '../../components/ui/Form';
import { BLOOD_GROUPS, SPECIALTY_LABELS } from '../../utils/format';

const CATEGORY_OPTIONS = Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({ value, label }));
const ALLERGY_SEVERITY = [
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' },
  { value: 'LIFE_THREATENING', label: 'Life-threatening' },
];
const CONDITION_SEVERITY = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'CRITICAL', label: 'Critical' },
];

function RepeatSection({ title, description, fields, onAdd, addLabel, children, emptyText }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
        <button type="button" onClick={onAdd} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-brand-700 hover:bg-brand-50">
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>
      {fields.length === 0 ? (
        <button type="button" onClick={onAdd} className="flex w-full items-center justify-center rounded-xl border border-dashed border-line-strong py-5 text-[13px] text-muted transition-colors hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-700">
          {emptyText}
        </button>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </section>
  );
}

function Row({ onRemove, children }) {
  return (
    <div className="group relative rounded-xl border border-line bg-canvas/40 p-3.5 pr-12">
      {children}
      <button type="button" onClick={onRemove} className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-subtle transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Remove">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

const err = (errors, path) => path.split('.').reduce((o, k) => o?.[k], errors)?.message;

export function BloodGroupField({ register }) {
  return (
    <Select
      label="Blood group"
      placeholder="Select blood group"
      options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))}
      {...register('medical.bloodGroup')}
      hint="Shown to every authorized clinical role."
    />
  );
}

export function AllergiesFields({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medical.allergies' });
  return (
    <RepeatSection title="Allergies" description="Severe and life-threatening allergies are shown to all clinical roles." fields={fields} addLabel="Add allergy" emptyText="No allergies recorded — add one" onAdd={() => append({ allergen: '', reaction: '', severity: 'SEVERE' })}>
      {fields.map((f, i) => (
        <Row key={f.id} onRemove={() => remove(i)}>
          <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
            <Input placeholder="Allergen, e.g. Penicillin" aria-label="Allergen" error={err(errors, `medical.allergies.${i}.allergen`)} {...register(`medical.allergies.${i}.allergen`, { required: 'Allergen is required' })} />
            <Input placeholder="Reaction" aria-label="Reaction" {...register(`medical.allergies.${i}.reaction`)} />
            <Select aria-label="Severity" options={ALLERGY_SEVERITY} {...register(`medical.allergies.${i}.severity`)} />
          </div>
        </Row>
      ))}
    </RepeatSection>
  );
}

export function ConditionsFields({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medical.conditions' });
  return (
    <RepeatSection title="Chronic conditions" description="Category scopes what a specialist may see." fields={fields} addLabel="Add condition" emptyText="No conditions recorded — add one" onAdd={() => append({ name: '', severity: 'MAJOR', category: 'GENERAL', diagnosedYear: '', notes: '' })}>
      {fields.map((f, i) => (
        <Row key={f.id} onRemove={() => remove(i)}>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_0.7fr]">
            <Input placeholder="Condition, e.g. Asthma" aria-label="Condition" error={err(errors, `medical.conditions.${i}.name`)} {...register(`medical.conditions.${i}.name`, { required: 'Condition is required' })} />
            <Select aria-label="Severity" options={CONDITION_SEVERITY} {...register(`medical.conditions.${i}.severity`)} />
            <Select aria-label="Category" options={CATEGORY_OPTIONS} {...register(`medical.conditions.${i}.category`)} />
            <Input placeholder="Year" aria-label="Year diagnosed" inputMode="numeric" {...register(`medical.conditions.${i}.diagnosedYear`)} />
          </div>
          <Input fieldClassName="mt-3" placeholder="Notes (optional)" aria-label="Notes" {...register(`medical.conditions.${i}.notes`)} />
        </Row>
      ))}
    </RepeatSection>
  );
}

export function MedicationsFields({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medical.medications' });
  return (
    <RepeatSection title="Current medications" description="Mark medications that responders must know about immediately." fields={fields} addLabel="Add medication" emptyText="No medications recorded — add one" onAdd={() => append({ name: '', dosage: '', frequency: '', category: 'GENERAL', isCritical: false, alertNote: '' })}>
      {fields.map((f, i) => (
        <Row key={f.id} onRemove={() => remove(i)}>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_0.9fr_1fr_1fr]">
            <Input placeholder="Medication" aria-label="Medication" error={err(errors, `medical.medications.${i}.name`)} {...register(`medical.medications.${i}.name`, { required: 'Medication is required' })} />
            <Input placeholder="Dosage" aria-label="Dosage" {...register(`medical.medications.${i}.dosage`)} />
            <Input placeholder="Frequency" aria-label="Frequency" {...register(`medical.medications.${i}.frequency`)} />
            <Select aria-label="Category" options={CATEGORY_OPTIONS} {...register(`medical.medications.${i}.category`)} />
          </div>
          <div className="mt-3 grid items-center gap-3 sm:grid-cols-[auto_1fr]">
            <Checkbox label="Critical alert" {...register(`medical.medications.${i}.isCritical`)} />
            <Input placeholder="Alert note for responders, e.g. Anticoagulant — bleeding risk" aria-label="Alert note" {...register(`medical.medications.${i}.alertNote`)} />
          </div>
        </Row>
      ))}
    </RepeatSection>
  );
}

export function AlertsFields({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medical.alerts' });
  return (
    <RepeatSection title="Critical medical alerts" description="E.g. implanted devices, insulin dependence, controlled oxygen." fields={fields} addLabel="Add alert" emptyText="No critical alerts — add one" onAdd={() => append({ title: '', details: '' })}>
      {fields.map((f, i) => (
        <Row key={f.id} onRemove={() => remove(i)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Alert, e.g. Pacemaker fitted" aria-label="Alert" error={err(errors, `medical.alerts.${i}.title`)} {...register(`medical.alerts.${i}.title`, { required: 'Alert is required' })} />
            <Input placeholder="Details (optional)" aria-label="Details" {...register(`medical.alerts.${i}.details`)} />
          </div>
        </Row>
      ))}
    </RepeatSection>
  );
}

export function HistoryFields({ control, register, errors }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'medical.history' });
  return (
    <RepeatSection title="Relevant medical history" description="Surgeries, admissions and significant events." fields={fields} addLabel="Add entry" emptyText="No history entries — add one" onAdd={() => append({ title: '', category: 'GENERAL', year: '', notes: '' })}>
      {fields.map((f, i) => (
        <Row key={f.id} onRemove={() => remove(i)}>
          <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_0.7fr]">
            <Input placeholder="Event, e.g. Appendectomy" aria-label="History entry" error={err(errors, `medical.history.${i}.title`)} {...register(`medical.history.${i}.title`, { required: 'Entry is required' })} />
            <Select aria-label="Category" options={CATEGORY_OPTIONS} {...register(`medical.history.${i}.category`)} />
            <Input placeholder="Year" aria-label="Year" inputMode="numeric" {...register(`medical.history.${i}.year`)} />
          </div>
          <Input fieldClassName="mt-3" placeholder="Notes (optional)" aria-label="Notes" {...register(`medical.history.${i}.notes`)} />
        </Row>
      ))}
    </RepeatSection>
  );
}

export function ContactsFields({ control, register, errors, min = 1 }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' });
  return (
    <RepeatSection title="Emergency contacts" description="Shared with paramedics during an authorized emergency." fields={fields} addLabel="Add contact" emptyText="Add at least one emergency contact" onAdd={() => fields.length < 5 && append({ name: '', relationship: '', phone: '', isPrimary: fields.length === 0 })}>
      {fields.map((f, i) => (
        <Row key={f.id} onRemove={() => fields.length > min && remove(i)}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Full name" aria-label="Contact name" error={err(errors, `contacts.${i}.name`)} {...register(`contacts.${i}.name`, { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })} />
            <Input placeholder="Relationship" aria-label="Relationship" error={err(errors, `contacts.${i}.relationship`)} {...register(`contacts.${i}.relationship`, { required: 'Relationship is required' })} />
            <Input placeholder="+91 98xxx xxxxx" aria-label="Mobile number" error={err(errors, `contacts.${i}.phone`)} {...register(`contacts.${i}.phone`, { required: 'Mobile number is required', pattern: { value: /^\+?[0-9][0-9\s-]{7,16}$/, message: 'Enter a valid mobile number' } })} />
          </div>
          <Checkbox className="mt-3" label="Primary contact" {...register(`contacts.${i}.isPrimary`)} />
        </Row>
      ))}
    </RepeatSection>
  );
}

const blankToNull = (v) => (v === '' || v === undefined ? null : v);
const yearOrNull = (v) => (v === '' || v == null ? null : Number(v));

/** Normalises react-hook-form values into the API payload shape. */
export function cleanMedical(m = {}) {
  return {
    bloodGroup: blankToNull(m.bloodGroup),
    allergies: (m.allergies || []).map((a) => ({ ...a, reaction: blankToNull(a.reaction) })),
    conditions: (m.conditions || []).map((c) => ({ ...c, diagnosedYear: yearOrNull(c.diagnosedYear), notes: blankToNull(c.notes) })),
    medications: (m.medications || []).map((x) => ({ ...x, dosage: blankToNull(x.dosage), frequency: blankToNull(x.frequency), alertNote: blankToNull(x.alertNote), isCritical: Boolean(x.isCritical) })),
    alerts: (m.alerts || []).map((a) => ({ ...a, details: blankToNull(a.details) })),
    history: (m.history || []).map((h) => ({ ...h, year: yearOrNull(h.year), notes: blankToNull(h.notes) })),
  };
}

/** Converts API profile data into form defaults (nulls → empty strings). */
export function medicalToForm(m) {
  const s = (v) => (v == null ? '' : v);
  return {
    bloodGroup: s(m.bloodGroup),
    allergies: m.allergies.map((a) => ({ allergen: a.allergen, reaction: s(a.reaction), severity: a.severity })),
    conditions: m.conditions.map((c) => ({ name: c.name, severity: c.severity, category: c.category, diagnosedYear: s(c.diagnosedYear), notes: s(c.notes) })),
    medications: m.medications.map((x) => ({ name: x.name, dosage: s(x.dosage), frequency: s(x.frequency), category: x.category, isCritical: x.isCritical, alertNote: s(x.alertNote) })),
    alerts: m.alerts.map((a) => ({ title: a.title, details: s(a.details) })),
    history: m.history.map((h) => ({ title: h.title, category: h.category, year: s(h.year), notes: s(h.notes) })),
  };
}
