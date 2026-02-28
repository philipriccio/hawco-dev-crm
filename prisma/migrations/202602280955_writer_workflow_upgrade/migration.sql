-- Additive migration for writer-development workflow upgrade

ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'CONSIDER_RELATIONSHIP';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'REWRITE_IN_PROGRESS';

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "firstReadAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readPriority" INTEGER,
  ADD COLUMN IF NOT EXISTS "considerRelationship" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rewriteStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "pitchReady" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "pitchChecklist" JSONB;

CREATE TABLE IF NOT EXISTS "WriterSignal" (
  "id" TEXT NOT NULL,
  "writerId" TEXT NOT NULL,
  "signalType" TEXT NOT NULL,
  "note" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WriterSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WriterSignal_writerId_createdAt_idx" ON "WriterSignal"("writerId", "createdAt");
CREATE INDEX IF NOT EXISTS "WriterSignal_signalType_idx" ON "WriterSignal"("signalType");

DO $$ BEGIN
  ALTER TABLE "WriterSignal" ADD CONSTRAINT "WriterSignal_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "WriterSignal" ADD CONSTRAINT "WriterSignal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "RewriteCycle" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "cycleNumber" INTEGER NOT NULL,
  "notesSentAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "rewriteReceivedAt" TIMESTAMP(3),
  "rereadAt" TIMESTAMP(3),
  "outcomeNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewriteCycle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RewriteCycle_projectId_cycleNumber_key" ON "RewriteCycle"("projectId", "cycleNumber");
CREATE INDEX IF NOT EXISTS "RewriteCycle_projectId_createdAt_idx" ON "RewriteCycle"("projectId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "RewriteCycle" ADD CONSTRAINT "RewriteCycle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
