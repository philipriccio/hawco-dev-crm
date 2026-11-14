ALTER TABLE "SourcingLead" ADD COLUMN "dismissedAt" TIMESTAMP(3);
CREATE INDEX "SourcingLead_dismissedAt_updatedAt_idx" ON "SourcingLead"("dismissedAt", "updatedAt");
