ALTER TABLE "Project" ADD COLUMN "releaseStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW', ADD COLUMN "releaseEvidence" TEXT, ADD COLUMN "releaseReviewedBy" TEXT, ADD COLUMN "releaseReviewedAt" TIMESTAMP(3);
ALTER TABLE "Material" ADD COLUMN "intakeKey" TEXT, ADD COLUMN "requestFingerprint" TEXT, ADD COLUMN "familyId" TEXT, ADD COLUMN "supersedesId" TEXT, ADD COLUMN "approvedAt" TIMESTAMP(3), ADD COLUMN "approvedBy" TEXT;
CREATE UNIQUE INDEX "Material_intakeKey_key" ON "Material"("intakeKey");
CREATE UNIQUE INDEX "Material_supersedesId_key" ON "Material"("supersedesId");
CREATE UNIQUE INDEX "Material_current_approved_family" ON "Material"("projectId", "familyId") WHERE "approvedAt" IS NOT NULL;
ALTER TABLE "Material" ADD CONSTRAINT "Material_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ALTER COLUMN "contactId" DROP NOT NULL, ADD COLUMN "projectId" TEXT, ADD COLUMN "ownerName" TEXT, ADD COLUMN "dueAt" TIMESTAMP(3), ADD COLUMN "waitingOn" TEXT, ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_context_check" CHECK ("contactId" IS NOT NULL OR "projectId" IS NOT NULL);
