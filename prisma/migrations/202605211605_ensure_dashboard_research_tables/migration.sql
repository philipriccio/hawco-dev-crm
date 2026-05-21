-- Idempotent safety migration for CRM tables that were introduced during earlier db-push-era releases.
-- Production already has these tables; this keeps migrate-deploy safe on environments that missed those db pushes.

CREATE TABLE IF NOT EXISTS "ResearchDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  "tags" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResearchDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BuyerNote" (
  "id" TEXT NOT NULL,
  "buyer" TEXT NOT NULL,
  "notes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuyerNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FollowUp" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FollowUp_contactId_idx" ON "FollowUp"("contactId");
CREATE INDEX IF NOT EXISTS "FollowUp_completed_idx" ON "FollowUp"("completed");

DO $$ BEGIN
  ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
