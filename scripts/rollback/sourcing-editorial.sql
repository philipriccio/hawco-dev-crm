BEGIN;
LOCK TABLE "SourcingLead", "SourcingEvent" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "SourcingLead" WHERE "editorialSynopsis" <> '' OR "editorialGenre" <> '' OR "editorialAccolades" <> '' OR "editorialSales" <> '' OR "editorialWhy" <> '' OR "editorialCaveat" <> '' OR "editorialSources" <> '[]'::jsonb) OR EXISTS (SELECT 1 FROM "SourcingEvent" WHERE kind = 'EDITORIAL') THEN
  RAISE EXCEPTION 'Refusing rollback: editorial content or history exists. Preserve and reconcile first.';
 END IF;
END $$;
ALTER TABLE "SourcingLead" DROP COLUMN "editorialSynopsis", DROP COLUMN "editorialGenre", DROP COLUMN "editorialAccolades", DROP COLUMN "editorialSales", DROP COLUMN "editorialWhy", DROP COLUMN "editorialCaveat", DROP COLUMN "editorialSources";
COMMIT;
