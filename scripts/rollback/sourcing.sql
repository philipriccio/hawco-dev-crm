-- Run only after reverting application code, taking a verified backup, and checking
-- that no sourcing data must be retained. This intentionally refuses populated DBs.
BEGIN;
LOCK TABLE "SourcingLead", "SourcingEvent", "SourcingBrief" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "SourcingLead") OR EXISTS (SELECT 1 FROM "SourcingEvent") OR EXISTS (SELECT 1 FROM "SourcingBrief") THEN
  RAISE EXCEPTION 'Refusing rollback: sourcing data exists. Restore/reconcile from verified backup instead.';
 END IF;
END $$;
DROP TABLE "SourcingEvent";
DROP TABLE "SourcingLead";
DROP TABLE "SourcingBrief";
COMMIT;
