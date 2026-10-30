import { z } from 'zod';

const trimmed = (min, max, label) =>
  z.string({ required_error: `${label} is required` }).trim().min(min, `${label} must be at least ${min} characters`).max(max, `${label} is too long`);
const optionalText = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const CATEGORIES = ['GENERAL', 'CARDIOLOGY', 'NEUROLOGY', 'RESPIRATORY', 'ENDOCRINOLOGY', 'NEPHROLOGY', 'HAEMATOLOGY'];
export const REASONS = [
  'PATIENT_UNCONSCIOUS',
  'UNABLE_TO_COMMUNICATE',
  'CRITICAL_EMERGENCY',
  'UNKNOWN_MEDICAL_HISTORY',
  'IMMEDIATE_TREATMENT_REQUIRED',
];

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(160);
const phone = z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,16}$/, 'Enter a valid mobile number');
const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d < new Date() && d.getUTCFullYear() > 1900;
  }, 'Enter a valid date of birth');

export const allergySchema = z.object({
  allergen: trimmed(1, 120, 'Allergen'),
  reaction: optionalText(240),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
});
export const conditionSchema = z.object({
  name: trimmed(1, 160, 'Condition'),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']),
  category: z.enum(CATEGORIES).default('GENERAL'),
  diagnosedYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  notes: optionalText(500),
});
export const medicationSchema = z.object({
  name: trimmed(1, 160, 'Medication'),
  dosage: optionalText(80),
  frequency: optionalText(80),
  category: z.enum(CATEGORIES).default('GENERAL'),
  isCritical: z.boolean().default(false),
  alertNote: optionalText(300),
});
export const alertSchema = z.object({ title: trimmed(1, 160, 'Alert'), details: optionalText(400) });
export const historySchema = z.object({
  title: trimmed(1, 200, 'History entry'),
  category: z.enum(CATEGORIES).default('GENERAL'),
  year: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  notes: optionalText(600),
});
export const contactSchema = z.object({
  name: trimmed(2, 120, 'Contact name'),
  relationship: trimmed(2, 60, 'Relationship'),
  phone,
  isPrimary: z.boolean().default(false),
});

export const medicalSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS).optional().nullable(),
  allergies: z.array(allergySchema).max(30).default([]),
  conditions: z.array(conditionSchema).max(30).default([]),
  medications: z.array(medicationSchema).max(40).default([]),
  alerts: z.array(alertSchema).max(20).default([]),
  history: z.array(historySchema).max(40).default([]),
});

export const patientRegisterSchema = z.object({
  fullName: trimmed(2, 120, 'Full name'),
  email,
  phone,
  password,
  dateOfBirth,
  gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  medical: medicalSchema.default({}),
  contacts: z.array(contactSchema).min(1, 'Add at least one emergency contact').max(5),
});

export const professionalRegisterSchema = z
  .object({
    professionalId: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2,5}-[A-Z0-9-]{3,20}$/, 'Professional ID format: e.g. MH-DOC-20431'),
    fullName: trimmed(2, 120, 'Full name'),
    email,
    password,
    role: z.enum(['PARAMEDIC', 'DOCTOR', 'SPECIALIST']),
    organization: trimmed(2, 160, 'Organization'),
    specialty: z.enum(CATEGORIES).optional().nullable(),
  })
  .refine((v) => v.role !== 'SPECIALIST' || (v.specialty && v.specialty !== 'GENERAL'), {
    path: ['specialty'],
    message: 'Specialists must select a clinical specialty',
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(128),
  portal: z.enum(['patient', 'professional']).default('patient'),
});

export const otpSchema = z.object({
  challengeId: z.string().uuid('Invalid verification challenge'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const updatePatientSchema = z.object({
  fullName: trimmed(2, 120, 'Full name').optional(),
  phone: phone.optional(),
  dateOfBirth: dateOfBirth.optional(),
  gender: z.enum(['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  medical: medicalSchema.optional(),
  contacts: z.array(contactSchema).min(1, 'Keep at least one emergency contact').max(5).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const revokeSchema = z.object({
  authorizationId: z.string().uuid(),
  reason: optionalText(300),
});

export const identifySchema = z.object({ emergencyId: z.string().trim().min(1, 'Emergency ID is required').max(120) });

export const requestAccessSchema = z.object({
  emergencyId: z.string().trim().min(1).max(120),
  reason: z.enum(REASONS, { errorMap: () => ({ message: 'Select an emergency reason' }) }),
  justification: trimmed(15, 500, 'Justification'),
  treatmentPurpose: optionalText(300),
  acknowledged: z.literal(true, { errorMap: () => ({ message: 'You must acknowledge that this access is recorded and monitored' }) }),
});

export const breakGlassOtpSchema = z.object({
  authorizationId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const endAccessSchema = z.object({ reason: optionalText(300) });

export const verifyProfessionalSchema = z.object({
  professionalId: z.string().uuid(),
  decision: z.enum(['VERIFY', 'REJECT']),
});

export const accountStatusSchema = z.object({ userId: z.string().uuid(), status: z.enum(['ACTIVE', 'SUSPENDED']) });

export const adminRevokeSchema = z.object({
  authorizationId: z.string().uuid(),
  reason: trimmed(3, 300, 'Revocation reason'),
});

export const settingsSchema = z.object({
  authorizationDurationSeconds: z.coerce.number().int().min(60).max(3600),
});
