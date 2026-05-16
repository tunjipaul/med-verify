-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CORPER', 'DOCTOR', 'COORDINATOR', 'ABUJA_ADMIN', 'DG', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MctStatus" AS ENUM ('CREATED', 'UNDER_REVIEW', 'REVIEW_REQUIRED', 'ESCALATED', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('AUTO_APPROVE', 'REVIEW_REQUIRED', 'ESCALATE', 'AUTO_REJECT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HospitalTier" AS ENUM ('TIER_1', 'TIER_2');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'MCT_CREATED', 'MCT_TRANSITION_ATTEMPT', 'MCT_TRANSITION_SUCCESS', 'MCT_TRANSITION_FAILED', 'REPORT_CREATED', 'REPORT_UPDATED', 'VERIFICATION_CODE_GENERATED', 'VERIFICATION_CODE_VALIDATED', 'VERIFICATION_CODE_FAILED', 'VERIFICATION_CODE_EXTENDED', 'DECISION_GENERATED', 'DECISION_OVERRIDDEN', 'DECISION_FINALIZED', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corper" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "callUpNumber" TEXT NOT NULL,
    "nin" TEXT,
    "bvn" TEXT,
    "phone" TEXT,
    "postedState" TEXT,
    "currentState" TEXT,
    "isMobilized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Corper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "tier" "HospitalTier" NOT NULL,
    "approvedRegistryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "mdcnNumber" TEXT NOT NULL,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MctCase" (
    "id" TEXT NOT NULL,
    "corperId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "doctorId" TEXT,
    "status" "MctStatus" NOT NULL DEFAULT 'CREATED',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskBreakdown" JSONB,
    "referralTag" BOOLEAN NOT NULL DEFAULT false,
    "identityMatch" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MctCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "mctCaseId" TEXT NOT NULL,
    "corperId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "codeValue" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "extendedById" TEXT,
    "extensionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDecision" (
    "id" TEXT NOT NULL,
    "mctCaseId" TEXT NOT NULL,
    "outcome" "DecisionOutcome" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskBreakdown" JSONB,
    "reasonText" TEXT,
    "decidedById" TEXT,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "mctCaseId" TEXT,
    "targetId" TEXT,
    "payloadSummary" JSONB,
    "sourceIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Corper_userId_key" ON "Corper"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Corper_callUpNumber_key" ON "Corper"("callUpNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Corper_nin_key" ON "Corper"("nin");

-- CreateIndex
CREATE UNIQUE INDEX "Corper_bvn_key" ON "Corper"("bvn");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_approvedRegistryId_key" ON "Hospital"("approvedRegistryId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_mdcnNumber_key" ON "Doctor"("mdcnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCode_codeValue_key" ON "VerificationCode"("codeValue");

-- AddForeignKey
ALTER TABLE "Corper" ADD CONSTRAINT "Corper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MctCase" ADD CONSTRAINT "MctCase_corperId_fkey" FOREIGN KEY ("corperId") REFERENCES "Corper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MctCase" ADD CONSTRAINT "MctCase_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MctCase" ADD CONSTRAINT "MctCase_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_mctCaseId_fkey" FOREIGN KEY ("mctCaseId") REFERENCES "MctCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDecision" ADD CONSTRAINT "CaseDecision_mctCaseId_fkey" FOREIGN KEY ("mctCaseId") REFERENCES "MctCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDecision" ADD CONSTRAINT "CaseDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_mctCaseId_fkey" FOREIGN KEY ("mctCaseId") REFERENCES "MctCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
