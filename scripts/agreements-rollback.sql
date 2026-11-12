-- Candidate-only rollback rehearsal. Never discard populated agreement workspaces.
-- For populated deployments: restore the approved pre-migration backup or plan a
-- reviewed export/restore. This guard deliberately refuses destructive rollback.
BEGIN;
LOCK TABLE "AgreementWorkspace", "AgreementEvent", "AgreementDocument", "AgreementLegal", "AgreementReminder", "AgreementImport", "AgreementTemplate" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "AgreementWorkspace") OR EXISTS (SELECT 1 FROM "AgreementEvent") OR EXISTS (SELECT 1 FROM "AgreementDocument") OR EXISTS (SELECT 1 FROM "AgreementLegal") OR EXISTS (SELECT 1 FROM "AgreementReminder") OR EXISTS (SELECT 1 FROM "AgreementImport") OR EXISTS (SELECT 1 FROM "AgreementTemplate") THEN
    RAISE EXCEPTION 'Refusing rollback: new agreement data exists. Preserve/export it under authorized review first.';
  END IF;
END $$;
DROP TABLE "AgreementTemplate", "AgreementImport", "AgreementReminder", "AgreementLegal", "AgreementDocument", "AgreementEvent", "AgreementWorkspace";
COMMIT;
