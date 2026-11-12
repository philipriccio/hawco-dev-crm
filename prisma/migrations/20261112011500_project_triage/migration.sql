-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'PASS_KEEP_WRITER';
ALTER TYPE "ProjectStatus" ADD VALUE 'NOT_READING';
ALTER TYPE "ProjectStatus" ADD VALUE 'REFERENCE_ONLY';
ALTER TYPE "ProjectStatus" ADD VALUE 'SHELVED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "classification" TEXT NOT NULL DEFAULT 'SUBMISSION',
ADD COLUMN     "readDateLabel" TEXT,
ADD COLUMN     "readDatePrecision" TEXT,
ADD COLUMN     "readState" TEXT NOT NULL DEFAULT 'UNREAD';

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "classification" TEXT NOT NULL DEFAULT 'SUBMISSION',
ADD COLUMN     "readDateLabel" TEXT,
ADD COLUMN     "readDatePrecision" TEXT,
ADD COLUMN     "readState" TEXT NOT NULL DEFAULT 'UNREAD';

-- CreateTable
CREATE TABLE "TriageNote" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageMutation" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "projectId" TEXT,
    "materialId" TEXT,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "undoUntil" TIMESTAMP(3) NOT NULL,
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "TriageMutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TriageNote_projectId_createdAt_idx" ON "TriageNote"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "TriageMutation_projectId_idx" ON "TriageMutation"("projectId");

-- AddForeignKey
ALTER TABLE "TriageNote" ADD CONSTRAINT "TriageNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing submissions retain their classification. New unclassified intake is held out of queues.
ALTER TABLE "Project" ALTER COLUMN "classification" SET DEFAULT 'NEEDS_REVIEW';
ALTER TABLE "Material" ALTER COLUMN "classification" SET DEFAULT 'NEEDS_REVIEW';
-- These dates are already recorded facts, not inferred reads from status or coverage.
UPDATE "Project" SET "readState"='READ',"readDatePrecision"='EXACT' WHERE "firstReadAt" IS NOT NULL;
UPDATE "Material" SET "readState"='READ',"readDatePrecision"='EXACT' WHERE "readAt" IS NOT NULL;
