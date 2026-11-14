ALTER TABLE "SourcingLead"
 ADD COLUMN "editorialSynopsis" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "editorialGenre" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "editorialAccolades" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "editorialSales" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "editorialWhy" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "editorialCaveat" TEXT NOT NULL DEFAULT '',
 ADD COLUMN "editorialSources" JSONB NOT NULL DEFAULT '[]';
