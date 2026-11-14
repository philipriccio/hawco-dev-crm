BEGIN;
LOCK TABLE "SourcingLead", "SourcingEvent" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "SourcingLead" WHERE "dismissedAt" IS NOT NULL) OR EXISTS (SELECT 1 FROM "SourcingEvent" WHERE kind IN ('DISMISSED','RESTORED')) THEN
  RAISE EXCEPTION 'Refusing rollback: dismissal state or history exists. Preserve data and plan reconciliation.';
 END IF;
END $$;
DROP INDEX "SourcingLead_dismissedAt_updatedAt_idx";
ALTER TABLE "SourcingLead" DROP COLUMN "dismissedAt";
COMMIT;
