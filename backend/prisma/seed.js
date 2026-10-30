/**
 * Repeatable demo seed. Every record is synthetic. Run with `npm run db:seed`.
 * Pass --if-empty to skip seeding when users already exist (used by the Docker entrypoint).
 *
 * Seeded patients get fixed Emergency IDs so the README can reference them; IDs created through
 * registration are random (80-bit) as normal.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
export const DEMO_PASSWORD = 'Demo@12345';

const PATIENTS = [
  {
    email: 'ananya.rao@demo.emergi.in', fullName: 'Ananya Rao', phone: '+91 98200 11001', dob: '1991-04-12', gender: 'FEMALE',
    emergencyId: 'EA-7KQ2-M9XD-4TPR-H3VB',
    medical: {
      bloodGroup: 'O+',
      allergies: [
        { allergen: 'Penicillin', reaction: 'Anaphylaxis', severity: 'LIFE_THREATENING' },
        { allergen: 'Peanuts', reaction: 'Throat swelling, hives', severity: 'SEVERE' },
        { allergen: 'Latex', reaction: 'Contact dermatitis', severity: 'MILD' },
      ],
      conditions: [
        { name: 'Type 1 diabetes mellitus', severity: 'CRITICAL', category: 'ENDOCRINOLOGY', diagnosedYear: 2004, notes: 'Insulin pump not used; multiple daily injections' },
        { name: 'Asthma', severity: 'MAJOR', category: 'RESPIRATORY', diagnosedYear: 2009 },
        { name: 'Hypothyroidism', severity: 'MINOR', category: 'ENDOCRINOLOGY', diagnosedYear: 2018 },
      ],
      medications: [
        { name: 'Insulin glargine', dosage: '20 units', frequency: 'Once nightly', category: 'ENDOCRINOLOGY', isCritical: true, alertNote: 'Insulin-dependent — check blood glucose immediately' },
        { name: 'Insulin aspart', dosage: 'Sliding scale', frequency: 'With meals', category: 'ENDOCRINOLOGY', isCritical: true, alertNote: 'Risk of hypoglycaemia if unconscious' },
        { name: 'Salbutamol inhaler', dosage: '100 mcg', frequency: 'As needed', category: 'RESPIRATORY' },
        { name: 'Levothyroxine', dosage: '50 mcg', frequency: 'Once daily', category: 'ENDOCRINOLOGY' },
      ],
      alerts: [
        { title: 'Insulin-dependent diabetic', details: 'Unresponsiveness may indicate hypoglycaemia' },
        { title: 'Carries adrenaline auto-injector', details: 'Left side pocket of handbag' },
      ],
      history: [
        { title: 'Diabetic ketoacidosis admission', category: 'ENDOCRINOLOGY', year: 2019, notes: 'ICU stay, 3 days' },
        { title: 'Acute asthma exacerbation', category: 'RESPIRATORY', year: 2021, notes: 'Nebulised therapy, discharged same day' },
        { title: 'Laparoscopic appendectomy', category: 'GENERAL', year: 2012 },
      ],
    },
    contacts: [
      { name: 'Vikram Rao', relationship: 'Spouse', phone: '+91 98200 11002', isPrimary: true },
      { name: 'Meera Iyer', relationship: 'Sister', phone: '+91 98200 11003' },
    ],
  },
  {
    email: 'rohan.deshmukh@demo.emergi.in', fullName: 'Rohan Deshmukh', phone: '+91 98220 22001', dob: '1968-09-03', gender: 'MALE',
    emergencyId: 'EA-3NWB-8RFZ-K2MA-T6QD',
    medical: {
      bloodGroup: 'B+',
      allergies: [
        { allergen: 'Aspirin', reaction: 'Bronchospasm', severity: 'SEVERE' },
        { allergen: 'Iodinated contrast', reaction: 'Urticaria', severity: 'MODERATE' },
      ],
      conditions: [
        { name: 'Coronary artery disease', severity: 'CRITICAL', category: 'CARDIOLOGY', diagnosedYear: 2017 },
        { name: 'Atrial fibrillation', severity: 'MAJOR', category: 'CARDIOLOGY', diagnosedYear: 2021 },
        { name: 'Hypertension', severity: 'MAJOR', category: 'CARDIOLOGY', diagnosedYear: 2010 },
        { name: 'Chronic kidney disease, stage 3a', severity: 'MAJOR', category: 'NEPHROLOGY', diagnosedYear: 2023, notes: 'eGFR ~52' },
      ],
      medications: [
        { name: 'Apixaban', dosage: '5 mg', frequency: 'Twice daily', category: 'CARDIOLOGY', isCritical: true, alertNote: 'Anticoagulant — high bleeding risk' },
        { name: 'Metoprolol succinate', dosage: '50 mg', frequency: 'Once daily', category: 'CARDIOLOGY' },
        { name: 'Atorvastatin', dosage: '40 mg', frequency: 'Once nightly', category: 'CARDIOLOGY' },
        { name: 'Ramipril', dosage: '5 mg', frequency: 'Once daily', category: 'NEPHROLOGY' },
      ],
      alerts: [
        { title: 'Permanent pacemaker (2022)', details: 'MRI conditional device' },
        { title: 'On anticoagulation', details: 'Apixaban — consider reversal before procedures' },
      ],
      history: [
        { title: 'Coronary artery bypass graft (CABG ×3)', category: 'CARDIOLOGY', year: 2020 },
        { title: 'Percutaneous coronary intervention', category: 'CARDIOLOGY', year: 2017 },
        { title: 'Acute kidney injury after contrast study', category: 'NEPHROLOGY', year: 2023 },
      ],
    },
    contacts: [
      { name: 'Sunita Deshmukh', relationship: 'Spouse', phone: '+91 98220 22002', isPrimary: true },
      { name: 'Aditya Deshmukh', relationship: 'Son', phone: '+91 98220 22003' },
    ],
  },
  {
    email: 'fatima.shaikh@demo.emergi.in', fullName: 'Fatima Shaikh', phone: '+91 99300 33001', dob: '1985-01-22', gender: 'FEMALE',
    emergencyId: 'EA-9PXC-5HJG-2VNE-R8KY',
    medical: {
      bloodGroup: 'A-',
      allergies: [
        { allergen: 'Sulfonamides', reaction: 'Stevens–Johnson syndrome (2014)', severity: 'LIFE_THREATENING' },
        { allergen: 'Shellfish', reaction: 'Vomiting, rash', severity: 'MODERATE' },
      ],
      conditions: [
        { name: 'Focal epilepsy', severity: 'CRITICAL', category: 'NEUROLOGY', diagnosedYear: 2008, notes: 'Last seizure March 2025' },
        { name: 'Chronic migraine', severity: 'MINOR', category: 'NEUROLOGY', diagnosedYear: 2012 },
      ],
      medications: [
        { name: 'Levetiracetam', dosage: '750 mg', frequency: 'Twice daily', category: 'NEUROLOGY', isCritical: true, alertNote: 'Do not interrupt — breakthrough seizure risk' },
        { name: 'Sumatriptan', dosage: '50 mg', frequency: 'As needed', category: 'NEUROLOGY' },
      ],
      alerts: [{ title: 'Epilepsy', details: 'Seizures typically last under 3 minutes; recovery position' }],
      history: [
        { title: 'Status epilepticus admission', category: 'NEUROLOGY', year: 2018 },
        { title: 'Caesarean section', category: 'GENERAL', year: 2016 },
      ],
    },
    contacts: [{ name: 'Imran Shaikh', relationship: 'Spouse', phone: '+91 99300 33002', isPrimary: true }],
  },
  {
    email: 'arjun.kulkarni@demo.emergi.in', fullName: 'Arjun Kulkarni', phone: '+91 97300 44001', dob: '2001-07-15', gender: 'MALE',
    emergencyId: 'EA-4MDT-7WQA-6BZH-N1PS',
    medical: {
      bloodGroup: 'AB+',
      allergies: [{ allergen: 'Bee venom', reaction: 'Anaphylaxis', severity: 'LIFE_THREATENING' }],
      conditions: [{ name: 'Haemophilia A (severe)', severity: 'CRITICAL', category: 'HAEMATOLOGY', diagnosedYear: 2002 }],
      medications: [
        { name: 'Factor VIII concentrate', dosage: '2000 IU', frequency: 'Three times weekly', category: 'HAEMATOLOGY', isCritical: true, alertNote: 'Bleeding disorder — avoid intramuscular injections' },
      ],
      alerts: [{ title: 'Severe bleeding disorder', details: 'Contact haemophilia centre for factor replacement' }],
      history: [{ title: 'Right knee haemarthrosis', category: 'HAEMATOLOGY', year: 2019 }],
    },
    contacts: [
      { name: 'Sneha Kulkarni', relationship: 'Mother', phone: '+91 97300 44002', isPrimary: true },
      { name: 'Prakash Kulkarni', relationship: 'Father', phone: '+91 97300 44003' },
    ],
  },
  {
    email: 'priya.nair@demo.emergi.in', fullName: 'Priya Nair', phone: '+91 98670 55001', dob: '1956-11-30', gender: 'FEMALE',
    emergencyId: 'EA-6HRV-2KXM-9QTB-C5FW',
    medical: {
      bloodGroup: 'O-',
      allergies: [
        { allergen: 'Morphine', reaction: 'Respiratory depression', severity: 'SEVERE' },
        { allergen: 'Codeine', reaction: 'Severe nausea', severity: 'MODERATE' },
      ],
      conditions: [
        { name: 'Heart failure with reduced ejection fraction', severity: 'CRITICAL', category: 'CARDIOLOGY', diagnosedYear: 2020, notes: 'EF 30%' },
        { name: 'Chronic obstructive pulmonary disease', severity: 'MAJOR', category: 'RESPIRATORY', diagnosedYear: 2015 },
        { name: 'Type 2 diabetes mellitus', severity: 'MAJOR', category: 'ENDOCRINOLOGY', diagnosedYear: 2011 },
      ],
      medications: [
        { name: 'Home oxygen', dosage: '2 L/min', frequency: 'Continuous', category: 'RESPIRATORY', isCritical: true, alertNote: 'CO₂ retainer — target SpO₂ 88–92%' },
        { name: 'Furosemide', dosage: '40 mg', frequency: 'Once daily', category: 'CARDIOLOGY' },
        { name: 'Sacubitril/valsartan', dosage: '49/51 mg', frequency: 'Twice daily', category: 'CARDIOLOGY' },
        { name: 'Tiotropium inhaler', dosage: '18 mcg', frequency: 'Once daily', category: 'RESPIRATORY' },
        { name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', category: 'ENDOCRINOLOGY' },
      ],
      alerts: [{ title: 'Controlled oxygen only', details: 'Risk of hypercapnic respiratory failure with high-flow oxygen' }],
      history: [
        { title: 'Decompensated heart failure admission', category: 'CARDIOLOGY', year: 2022 },
        { title: 'Community-acquired pneumonia', category: 'RESPIRATORY', year: 2023 },
        { title: 'Right hip replacement', category: 'GENERAL', year: 2019 },
      ],
    },
    contacts: [
      { name: 'Rahul Nair', relationship: 'Son', phone: '+91 98670 55002', isPrimary: true },
      { name: 'Lakshmi Menon', relationship: 'Neighbour', phone: '+91 98670 55003' },
    ],
  },
];

const PROFESSIONALS = [
  { email: 'sameer.patil@demo.emergi.in', fullName: 'Sameer Patil', role: 'PARAMEDIC', professionalId: 'MH-PARA-10231', organization: 'Pune Ambulance Network', verified: true },
  { email: 'kavita.jadhav@demo.emergi.in', fullName: 'Kavita Jadhav', role: 'PARAMEDIC', professionalId: 'MH-PARA-10877', organization: 'Mumbai Rapid Response EMS', verified: true },
  { email: 'neha.joshi@demo.emergi.in', fullName: 'Dr. Neha Joshi', role: 'DOCTOR', professionalId: 'MH-DOC-20431', organization: 'Pune City General Hospital', verified: true },
  { email: 'rahul.mehta@demo.emergi.in', fullName: 'Dr. Rahul Mehta', role: 'DOCTOR', professionalId: 'MH-DOC-20788', organization: 'Nashik Community Hospital', verified: true },
  { email: 'aditi.kale@demo.emergi.in', fullName: 'Dr. Aditi Kale', role: 'DOCTOR', professionalId: 'MH-DOC-21002', organization: 'Nagpur District Hospital', verified: false },
  { email: 'vikram.sathe@demo.emergi.in', fullName: 'Dr. Vikram Sathe', role: 'SPECIALIST', specialty: 'CARDIOLOGY', professionalId: 'MH-SPC-30115', organization: 'Western Cardiac Centre', verified: true },
  { email: 'leena.gokhale@demo.emergi.in', fullName: 'Dr. Leena Gokhale', role: 'SPECIALIST', specialty: 'NEUROLOGY', professionalId: 'MH-SPC-30472', organization: 'Konkan Neurosciences Institute', verified: true },
];

const ADMIN = { email: 'admin@demo.emergi.in', fullName: 'Asha Kulkarni', role: 'ADMIN' };

const REASONS = ['PATIENT_UNCONSCIOUS', 'UNABLE_TO_COMMUNICATE', 'CRITICAL_EMERGENCY', 'UNKNOWN_MEDICAL_HISTORY', 'IMMEDIATE_TREATMENT_REQUIRED'];
const JUSTIFICATIONS = [
  'Found unresponsive at roadside, no identification other than Emergi-Access card.',
  'Collapsed at workplace, colleagues unaware of medical history. Need allergy status before treatment.',
  'Road traffic collision, patient confused and unable to give history.',
  'Brought to emergency department post-seizure, drowsy and non-verbal.',
  'Severe breathlessness on arrival, unable to speak in full sentences.',
  'Suspected hypoglycaemia, patient unconscious. Checking diabetes and medication history.',
  'Chest pain with hypotension, need anticoagulant status before intervention.',
];
const CATEGORIES = {
  PARAMEDIC: ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'MAJOR_CONDITIONS', 'MEDICATION_ALERTS', 'EMERGENCY_CONTACTS'],
  DOCTOR: ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'MAJOR_CONDITIONS', 'CURRENT_MEDICATIONS', 'MEDICAL_HISTORY'],
  SPECIALIST: ['BLOOD_GROUP', 'CRITICAL_ALERTS', 'SEVERE_ALLERGIES', 'SPECIALTY_CONDITIONS', 'SPECIALTY_MEDICATIONS', 'SPECIALTY_HISTORY'],
};

// Deterministic PRNG so the seeded history is identical on every run.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function reset() {
  // TRUNCATE bypasses the audit-log UPDATE/DELETE trigger by design: only an operator with direct
  // database access can wipe the demo dataset.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    "AuditLog", "OtpVerification", "EmergencyAuthorization", "EmergencyContact", "MedicalHistoryEntry",
    "MedicalAlert", "Medication", "ChronicCondition", "Allergy", "MedicalProfile", "PatientProfile",
    "HealthcareProfessional", "Session", "SystemSetting", "User" RESTART IDENTITY CASCADE`);
}

export async function seed({ withHistory = true } = {}) {
  await reset();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.create({ data: { ...ADMIN, passwordHash } });

  const patients = [];
  for (const p of PATIENTS) {
    const user = await prisma.user.create({
      data: {
        email: p.email, fullName: p.fullName, phone: p.phone, role: 'PATIENT', passwordHash,
        patient: {
          create: {
            emergencyId: p.emergencyId,
            dateOfBirth: new Date(`${p.dob}T00:00:00Z`),
            gender: p.gender,
            medical: {
              create: {
                bloodGroup: p.medical.bloodGroup,
                allergies: { create: p.medical.allergies },
                conditions: { create: p.medical.conditions },
                medications: { create: p.medical.medications },
                alerts: { create: p.medical.alerts },
                history: { create: p.medical.history },
              },
            },
            contacts: { create: p.contacts },
          },
        },
      },
      include: { patient: true },
    });
    patients.push(user);
  }

  const pros = [];
  for (const p of PROFESSIONALS) {
    const user = await prisma.user.create({
      data: {
        email: p.email, fullName: p.fullName, role: p.role, passwordHash,
        professional: {
          create: {
            professionalId: p.professionalId,
            organization: p.organization,
            specialty: p.specialty ?? null,
            verificationStatus: p.verified ? 'VERIFIED' : 'PENDING',
            verifiedAt: p.verified ? new Date(Date.now() - 20 * 86400_000) : null,
            verifiedById: p.verified ? admin.id : null,
          },
        },
      },
      include: { professional: true },
    });
    pros.push(user);
  }

  if (withHistory) await seedHistory({ patients, pros: pros.filter((p) => p.professional.verificationStatus === 'VERIFIED'), allPros: pros, admin });

  return { admin, patients, pros };
}

/** Fourteen days of plausible, finished activity so dashboards and analytics are meaningful. */
async function seedHistory({ patients, pros, allPros, admin }) {
  const rand = mulberry32(20261030);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const now = Date.now();
  const logs = [];

  const actorFields = (u) => ({
    actorUserId: u.id, actorRole: u.role, actorName: u.fullName,
    professionalId: u.professional?.professionalId ?? null, organization: u.professional?.organization ?? null,
  });

  for (let i = 0; i < 46; i++) {
    const pro = pick(pros);
    const patient = pick(patients);
    const role = pro.role;
    // Weighted toward recent days; never within the last two hours so nothing is left ACTIVE.
    const requestedAt = new Date(now - (2 * 3600_000 + Math.floor(Math.pow(rand(), 1.4) * 14 * 86400_000)));
    const roll = rand();
    const status = roll < 0.68 ? 'EXPIRED' : roll < 0.86 ? 'REVOKED' : 'DENIED';
    const reason = pick(REASONS);
    const justification = pick(JUSTIFICATIONS);
    const durationSeconds = 300;
    const grantedAt = status === 'DENIED' ? null : new Date(requestedAt.getTime() + (40 + Math.floor(rand() * 60)) * 1000);
    const expiresAt = grantedAt ? new Date(grantedAt.getTime() + durationSeconds * 1000) : null;
    const revokedAt = status === 'REVOKED' ? new Date(grantedAt.getTime() + (60 + Math.floor(rand() * 200)) * 1000) : null;
    const revoker = status === 'REVOKED' ? (rand() < 0.5 ? admin : patient) : null;
    const endedAt = status === 'EXPIRED' ? expiresAt : status === 'REVOKED' ? revokedAt : new Date(requestedAt.getTime() + 90_000);
    const specialtyScope = role === 'SPECIALIST' ? pro.professional.specialty : null;
    const denialReason = status === 'DENIED' ? pick(['OTP_ATTEMPTS_EXCEEDED', 'OTP_EXPIRED', 'SUPERSEDED_BY_NEW_REQUEST']) : null;

    const a = await prisma.emergencyAuthorization.create({
      data: {
        patientId: patient.patient.id, patientEmergencyId: patient.patient.emergencyId,
        professionalRefId: pro.professional.id, professionalId: pro.professional.professionalId,
        professionalRole: role, organization: pro.professional.organization,
        reason, justification, specialtyScope,
        treatmentPurpose: specialtyScope ? `Emergency ${specialtyScope.toLowerCase()} consultation` : null,
        otpVerified: status !== 'DENIED', status, durationSeconds, requestedAt, grantedAt, expiresAt, endedAt,
        revokedAt, revokedByUserId: revoker?.id ?? null, revokedByRole: revoker?.role ?? null,
        revocationReason: revoker ? (revoker.role === 'ADMIN' ? 'Access no longer clinically required' : 'Revoked by patient') : null,
        denialReason, accessCount: status === 'DENIED' ? 0 : 1 + Math.floor(rand() * 3),
        lastAccessedAt: grantedAt ? new Date(grantedAt.getTime() + 20_000) : null,
      },
    });

    const base = { ...actorFields(pro), patientEmergencyId: a.patientEmergencyId, authorizationId: a.id, ipAddress: '10.20.0.' + (10 + Math.floor(rand() * 200)) };
    const at = (ms) => new Date(requestedAt.getTime() + ms);
    logs.push({ ...base, action: 'PATIENT_IDENTIFIED', outcome: 'SUCCESS', authorizationId: null, createdAt: at(-30_000) });
    logs.push({ ...base, action: 'EMERGENCY_ACCESS_REQUESTED', outcome: 'SUCCESS', reason, justification, createdAt: at(0) });
    if (status === 'DENIED') {
      if (denialReason === 'OTP_ATTEMPTS_EXCEEDED') {
        for (let k = 0; k < 5; k++) logs.push({ ...base, action: 'BREAK_GLASS_OTP_FAILED', outcome: 'FAILURE', denialReason: 'OTP_INVALID', createdAt: at(20_000 + k * 6000) });
      }
      logs.push({ ...base, action: 'EMERGENCY_ACCESS_DENIED', outcome: 'DENIED', reason, justification, denialReason, createdAt: at(90_000) });
      continue;
    }
    logs.push({ ...base, action: 'EMERGENCY_ACCESS_GRANTED', outcome: 'SUCCESS', reason, justification, categoriesAccessed: CATEGORIES[role], accessDurationSec: durationSeconds, expiryStatus: 'ACTIVE', createdAt: grantedAt });
    logs.push({ ...base, action: 'MEDICAL_INFORMATION_VIEWED', outcome: 'SUCCESS', reason, categoriesAccessed: CATEGORIES[role], accessDurationSec: 2, expiryStatus: 'ACTIVE', createdAt: new Date(grantedAt.getTime() + 2000) });
    if (status === 'EXPIRED') {
      logs.push({ ...base, actorUserId: null, actorName: null, action: 'EMERGENCY_ACCESS_EXPIRED', outcome: 'SUCCESS', accessDurationSec: durationSeconds, expiryStatus: 'EXPIRED', metadata: { by: 'SYSTEM' }, createdAt: expiresAt });
    } else {
      logs.push({
        ...actorFields(revoker), patientEmergencyId: a.patientEmergencyId, authorizationId: a.id,
        action: 'EMERGENCY_ACCESS_REVOKED', outcome: 'SUCCESS', reason, expiryStatus: 'REVOKED',
        accessDurationSec: Math.round((revokedAt - grantedAt) / 1000),
        metadata: { revocationReason: a.revocationReason, affectedProfessionalId: a.professionalId, affectedRole: role },
        createdAt: revokedAt,
      });
    }
  }

  // A pattern the suspicious-activity monitor should flag: repeated unknown IDs from one paramedic.
  const kavita = pros.find((p) => p.email.startsWith('kavita'));
  for (const [i, bad] of ['EA-0000-0000-0000-0001', 'EA-7KQ2-M9XD-4TPR-H3VC', 'EA-7KQ2-M9XD-4TPR-H3VD', 'EA-1111-2222-3333-4444'].entries()) {
    logs.push({ ...actorFields(kavita), action: 'IDENTIFY_FAILED', outcome: 'DENIED', patientEmergencyId: bad, denialReason: 'UNKNOWN_EMERGENCY_ID', createdAt: new Date(now - (5 - i) * 9 * 60_000) });
  }
  // The unverified doctor tried to use emergency access.
  const aditi = allPros.find((p) => p.email.startsWith('aditi'));
  logs.push({ ...actorFields(aditi), action: 'EMERGENCY_ACCESS_DENIED', outcome: 'DENIED', patientEmergencyId: 'EA-9PXC-5HJG-2VNE-R8KY', denialReason: 'PROFESSIONAL_NOT_VERIFIED', createdAt: new Date(now - 3 * 3600_000) });
  // Professional verification history.
  for (const p of pros) {
    logs.push({ ...actorFields(admin), action: 'PROFESSIONAL_VERIFIED', outcome: 'SUCCESS', metadata: { subjectProfessionalId: p.professional.professionalId, subjectName: p.fullName, subjectRole: p.role }, createdAt: new Date(now - 20 * 86400_000) });
  }

  await prisma.auditLog.createMany({ data: logs.map((l) => ({ categoriesAccessed: [], ...l })) });
}

async function main() {
  if (process.argv.includes('--if-empty') && (await prisma.user.count()) > 0) {
    console.log('[seed] database already contains data — skipping');
    return;
  }
  const { patients, pros } = await seed();
  console.log(`[seed] created 1 administrator, ${patients.length} patients, ${pros.length} professionals`);
  console.log(`[seed] all demo accounts use the password: ${DEMO_PASSWORD}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('seed.js')) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
