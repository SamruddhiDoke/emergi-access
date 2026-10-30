/**
 * Minimum-necessary disclosure policy.
 *
 * This module is the single place that decides which parts of a medical record a role may see.
 * The emergency API serialises *only* the object returned by `discloseForRole`; the complete record
 * never leaves the server for clinical roles.
 */

const SEVERE_ALLERGY = new Set(['SEVERE', 'LIFE_THREATENING']);
const MAJOR_CONDITION = new Set(['MAJOR', 'CRITICAL']);

export const CATEGORY = Object.freeze({
  BLOOD_GROUP: 'BLOOD_GROUP',
  CRITICAL_ALERTS: 'CRITICAL_ALERTS',
  SEVERE_ALLERGIES: 'SEVERE_ALLERGIES',
  MAJOR_CONDITIONS: 'MAJOR_CONDITIONS',
  MEDICATION_ALERTS: 'MEDICATION_ALERTS',
  CURRENT_MEDICATIONS: 'CURRENT_MEDICATIONS',
  MEDICAL_HISTORY: 'MEDICAL_HISTORY',
  EMERGENCY_CONTACTS: 'EMERGENCY_CONTACTS',
  SPECIALTY_CONDITIONS: 'SPECIALTY_CONDITIONS',
  SPECIALTY_MEDICATIONS: 'SPECIALTY_MEDICATIONS',
  SPECIALTY_HISTORY: 'SPECIALTY_HISTORY',
});

/** Human-readable description of what each role receives. Exposed to the UI and the API docs. */
export const ACCESS_MATRIX = {
  PARAMEDIC: [CATEGORY.BLOOD_GROUP, CATEGORY.CRITICAL_ALERTS, CATEGORY.SEVERE_ALLERGIES, CATEGORY.MAJOR_CONDITIONS, CATEGORY.MEDICATION_ALERTS, CATEGORY.EMERGENCY_CONTACTS],
  DOCTOR: [CATEGORY.BLOOD_GROUP, CATEGORY.CRITICAL_ALERTS, CATEGORY.SEVERE_ALLERGIES, CATEGORY.MAJOR_CONDITIONS, CATEGORY.CURRENT_MEDICATIONS, CATEGORY.MEDICAL_HISTORY],
  SPECIALIST: [CATEGORY.BLOOD_GROUP, CATEGORY.CRITICAL_ALERTS, CATEGORY.SEVERE_ALLERGIES, CATEGORY.SPECIALTY_CONDITIONS, CATEGORY.SPECIALTY_MEDICATIONS, CATEGORY.SPECIALTY_HISTORY],
};

const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k] ?? null]));

const allergyView = (a) => pick(a, ['allergen', 'reaction', 'severity']);
const conditionView = (c) => pick(c, ['name', 'severity', 'category', 'diagnosedYear', 'notes']);
const alertView = (a) => pick(a, ['title', 'details']);
const historyView = (h) => pick(h, ['title', 'category', 'year', 'notes']);
const contactView = (c) => pick(c, ['name', 'relationship', 'phone', 'isPrimary']);

function ageFrom(dob) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

/** Identity shown to a clinician during an active authorization: enough to confirm the right patient. */
function identityView(patient) {
  return {
    fullName: patient.user.fullName,
    age: ageFrom(patient.dateOfBirth),
    gender: patient.gender,
    emergencyId: patient.emergencyId,
  };
}

/**
 * @param {object} patient  PatientProfile including user, medical (with relations) and contacts
 * @param {'PARAMEDIC'|'DOCTOR'|'SPECIALIST'} role
 * @param {{ specialtyScope?: string|null }} scope
 * @returns {{ data: object, categories: string[] }}
 */
export function discloseForRole(patient, role, { specialtyScope } = {}) {
  const m = patient.medical || { allergies: [], conditions: [], medications: [], alerts: [], history: [] };
  const severeAllergies = m.allergies.filter((a) => SEVERE_ALLERGY.has(a.severity)).map(allergyView);
  const majorConditions = m.conditions.filter((c) => MAJOR_CONDITION.has(c.severity)).map(conditionView);

  const base = {
    patient: identityView(patient),
    bloodGroup: m.bloodGroup ?? null,
    criticalAlerts: m.alerts.map(alertView),
    severeAllergies,
  };

  if (role === 'PARAMEDIC') {
    return {
      categories: ACCESS_MATRIX.PARAMEDIC,
      data: {
        ...base,
        majorConditions,
        medicationAlerts: m.medications
          .filter((med) => med.isCritical)
          .map((med) => ({ name: med.name, alertNote: med.alertNote ?? null })),
        emergencyContacts: patient.contacts.map(contactView),
      },
    };
  }

  if (role === 'DOCTOR') {
    return {
      categories: ACCESS_MATRIX.DOCTOR,
      data: {
        ...base,
        majorConditions,
        currentMedications: m.medications.map((med) =>
          pick(med, ['name', 'dosage', 'frequency', 'category', 'isCritical', 'alertNote']),
        ),
        medicalHistory: m.history.map(historyView),
      },
    };
  }

  if (role === 'SPECIALIST') {
    if (!specialtyScope) throw new Error('Specialist disclosure requires a specialty scope');
    const inScope = (item) => item.category === specialtyScope;
    return {
      categories: ACCESS_MATRIX.SPECIALIST,
      data: {
        ...base,
        specialtyScope,
        specialtyConditions: m.conditions.filter(inScope).map(conditionView),
        specialtyMedications: m.medications
          .filter(inScope)
          .map((med) => pick(med, ['name', 'dosage', 'frequency', 'isCritical', 'alertNote'])),
        specialtyHistory: m.history.filter(inScope).map(historyView),
      },
    };
  }

  // Patients and administrators never use this path; any other role receives nothing.
  throw new Error(`No disclosure policy defined for role ${role}`);
}
