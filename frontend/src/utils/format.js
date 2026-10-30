export const REASON_LABELS = {
  PATIENT_UNCONSCIOUS: 'Patient unconscious',
  UNABLE_TO_COMMUNICATE: 'Patient unable to communicate',
  CRITICAL_EMERGENCY: 'Critical emergency',
  UNKNOWN_MEDICAL_HISTORY: 'Unknown medical history',
  IMMEDIATE_TREATMENT_REQUIRED: 'Immediate treatment required',
};

export const ROLE_LABELS = {
  PATIENT: 'Patient',
  PARAMEDIC: 'Paramedic',
  DOCTOR: 'Doctor',
  SPECIALIST: 'Specialist',
  ADMIN: 'Administrator',
};

export const CATEGORY_LABELS = {
  BLOOD_GROUP: 'Blood group',
  CRITICAL_ALERTS: 'Critical alerts',
  SEVERE_ALLERGIES: 'Severe allergies',
  MAJOR_CONDITIONS: 'Major conditions',
  MEDICATION_ALERTS: 'Medication alerts',
  CURRENT_MEDICATIONS: 'Current medications',
  MEDICAL_HISTORY: 'Medical history',
  EMERGENCY_CONTACTS: 'Emergency contacts',
  SPECIALTY_CONDITIONS: 'Specialty conditions',
  SPECIALTY_MEDICATIONS: 'Specialty medications',
  SPECIALTY_HISTORY: 'Specialty history',
};

export const SPECIALTY_LABELS = {
  GENERAL: 'General',
  CARDIOLOGY: 'Cardiology',
  NEUROLOGY: 'Neurology',
  RESPIRATORY: 'Respiratory',
  ENDOCRINOLOGY: 'Endocrinology',
  NEPHROLOGY: 'Nephrology',
  HAEMATOLOGY: 'Haematology',
};

export const GENDER_LABELS = { FEMALE: 'Female', MALE: 'Male', NON_BINARY: 'Non-binary', PREFER_NOT_TO_SAY: 'Prefer not to say' };
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const humanize = (v) =>
  v ? String(v).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '';

const dtf = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const df = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const tf = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const formatDateTime = (d) => (d ? dtf.format(new Date(d)) : '—');
export const formatDate = (d) => (d ? df.format(new Date(d)) : '—');
export const formatTime = (d) => (d ? tf.format(new Date(d)) : '—');

export function timeAgo(d) {
  if (!d) return '—';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(d);
}

export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDuration(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m} min`;
}

export const initials = (name = '') =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const homeForRole = (role) =>
  ({ PATIENT: '/patient', PARAMEDIC: '/pro', DOCTOR: '/pro', SPECIALIST: '/pro', ADMIN: '/admin' })[role] || '/';
