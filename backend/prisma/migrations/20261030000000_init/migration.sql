-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('PATIENT', 'PARAMEDIC', 'DOCTOR', 'SPECIALIST', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "public"."ConditionSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ClinicalCategory" AS ENUM ('GENERAL', 'CARDIOLOGY', 'NEUROLOGY', 'RESPIRATORY', 'ENDOCRINOLOGY', 'NEPHROLOGY', 'HAEMATOLOGY');

-- CreateEnum
CREATE TYPE "public"."AuthorizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'DENIED');

-- CreateEnum
CREATE TYPE "public"."EmergencyReason" AS ENUM ('PATIENT_UNCONSCIOUS', 'UNABLE_TO_COMMUNICATE', 'CRITICAL_EMERGENCY', 'UNKNOWN_MEDICAL_HISTORY', 'IMMEDIATE_TREATMENT_REQUIRED');

-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('LOGIN', 'BREAK_GLASS');

-- CreateEnum
CREATE TYPE "public"."AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "status" "public"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "emergencyIdIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateOfBirth" DATE NOT NULL,
    "gender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalProfile" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Allergy" (
    "id" TEXT NOT NULL,
    "medicalProfileId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "public"."AllergySeverity" NOT NULL,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChronicCondition" (
    "id" TEXT NOT NULL,
    "medicalProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" "public"."ConditionSeverity" NOT NULL,
    "category" "public"."ClinicalCategory" NOT NULL DEFAULT 'GENERAL',
    "diagnosedYear" INTEGER,
    "notes" TEXT,

    CONSTRAINT "ChronicCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Medication" (
    "id" TEXT NOT NULL,
    "medicalProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "category" "public"."ClinicalCategory" NOT NULL DEFAULT 'GENERAL',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "alertNote" TEXT,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalAlert" (
    "id" TEXT NOT NULL,
    "medicalProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "MedicalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicalHistoryEntry" (
    "id" TEXT NOT NULL,
    "medicalProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "public"."ClinicalCategory" NOT NULL DEFAULT 'GENERAL',
    "year" INTEGER,
    "notes" TEXT,

    CONSTRAINT "MedicalHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmergencyContact" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthcareProfessional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "specialty" "public"."ClinicalCategory",
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthcareProfessional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmergencyAuthorization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientEmergencyId" TEXT NOT NULL,
    "professionalRefId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "professionalRole" "public"."Role" NOT NULL,
    "organization" TEXT NOT NULL,
    "reason" "public"."EmergencyReason" NOT NULL,
    "justification" TEXT NOT NULL,
    "treatmentPurpose" TEXT,
    "specialtyScope" "public"."ClinicalCategory",
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "durationSeconds" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokedByRole" "public"."Role",
    "revocationReason" TEXT,
    "denialReason" TEXT,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OtpVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "authorizationId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "outcome" "public"."AuditOutcome" NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "public"."Role",
    "actorName" TEXT,
    "professionalId" TEXT,
    "organization" TEXT,
    "patientEmergencyId" TEXT,
    "authorizationId" TEXT,
    "reason" TEXT,
    "justification" TEXT,
    "categoriesAccessed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessDurationSec" INTEGER,
    "expiryStatus" TEXT,
    "denialReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "public"."PatientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_emergencyId_key" ON "public"."PatientProfile"("emergencyId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalProfile_patientId_key" ON "public"."MedicalProfile"("patientId");

-- CreateIndex
CREATE INDEX "Allergy_medicalProfileId_idx" ON "public"."Allergy"("medicalProfileId");

-- CreateIndex
CREATE INDEX "ChronicCondition_medicalProfileId_idx" ON "public"."ChronicCondition"("medicalProfileId");

-- CreateIndex
CREATE INDEX "Medication_medicalProfileId_idx" ON "public"."Medication"("medicalProfileId");

-- CreateIndex
CREATE INDEX "MedicalAlert_medicalProfileId_idx" ON "public"."MedicalAlert"("medicalProfileId");

-- CreateIndex
CREATE INDEX "MedicalHistoryEntry_medicalProfileId_idx" ON "public"."MedicalHistoryEntry"("medicalProfileId");

-- CreateIndex
CREATE INDEX "EmergencyContact_patientId_idx" ON "public"."EmergencyContact"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthcareProfessional_userId_key" ON "public"."HealthcareProfessional"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthcareProfessional_professionalId_key" ON "public"."HealthcareProfessional"("professionalId");

-- CreateIndex
CREATE INDEX "HealthcareProfessional_verificationStatus_idx" ON "public"."HealthcareProfessional"("verificationStatus");

-- CreateIndex
CREATE INDEX "EmergencyAuthorization_status_expiresAt_idx" ON "public"."EmergencyAuthorization"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "EmergencyAuthorization_professionalRefId_idx" ON "public"."EmergencyAuthorization"("professionalRefId");

-- CreateIndex
CREATE INDEX "EmergencyAuthorization_patientId_idx" ON "public"."EmergencyAuthorization"("patientId");

-- CreateIndex
CREATE INDEX "EmergencyAuthorization_requestedAt_idx" ON "public"."EmergencyAuthorization"("requestedAt");

-- CreateIndex
CREATE INDEX "OtpVerification_userId_purpose_idx" ON "public"."OtpVerification"("userId", "purpose");

-- CreateIndex
CREATE INDEX "OtpVerification_authorizationId_idx" ON "public"."OtpVerification"("authorizationId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_outcome_idx" ON "public"."AuditLog"("outcome");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "public"."AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_patientEmergencyId_idx" ON "public"."AuditLog"("patientEmergencyId");

-- CreateIndex
CREATE INDEX "AuditLog_authorizationId_idx" ON "public"."AuditLog"("authorizationId");

-- CreateIndex
CREATE INDEX "AuditLog_actorRole_idx" ON "public"."AuditLog"("actorRole");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalProfile" ADD CONSTRAINT "MedicalProfile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allergy" ADD CONSTRAINT "Allergy_medicalProfileId_fkey" FOREIGN KEY ("medicalProfileId") REFERENCES "public"."MedicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChronicCondition" ADD CONSTRAINT "ChronicCondition_medicalProfileId_fkey" FOREIGN KEY ("medicalProfileId") REFERENCES "public"."MedicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Medication" ADD CONSTRAINT "Medication_medicalProfileId_fkey" FOREIGN KEY ("medicalProfileId") REFERENCES "public"."MedicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalAlert" ADD CONSTRAINT "MedicalAlert_medicalProfileId_fkey" FOREIGN KEY ("medicalProfileId") REFERENCES "public"."MedicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicalHistoryEntry" ADD CONSTRAINT "MedicalHistoryEntry_medicalProfileId_fkey" FOREIGN KEY ("medicalProfileId") REFERENCES "public"."MedicalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyContact" ADD CONSTRAINT "EmergencyContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthcareProfessional" ADD CONSTRAINT "HealthcareProfessional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyAuthorization" ADD CONSTRAINT "EmergencyAuthorization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyAuthorization" ADD CONSTRAINT "EmergencyAuthorization_professionalRefId_fkey" FOREIGN KEY ("professionalRefId") REFERENCES "public"."HealthcareProfessional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OtpVerification" ADD CONSTRAINT "OtpVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OtpVerification" ADD CONSTRAINT "OtpVerification_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "public"."EmergencyAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Audit log immutability: audit events can never be edited or deleted through the application.
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
