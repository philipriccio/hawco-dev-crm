-- Buyers feature foundation: Company-backed buyers, slate items, and target-buyer project links.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "isBuyer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "lookingFor" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "brands" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "region" TEXT;

DO $$ BEGIN
  CREATE TYPE "BuyerSlateStatus" AS ENUM ('ON_AIR', 'IN_DEVELOPMENT', 'GREENLIT', 'ANNOUNCED', 'ENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "BuyerSlateItem" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "BuyerSlateStatus" NOT NULL,
  "logline" TEXT,
  "productionCompany" TEXT,
  "source" TEXT,
  "sourceUrl" TEXT,
  "dateNoted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BuyerSlateItem_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "BuyerSlateItem" ADD CONSTRAINT "BuyerSlateItem_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "Company_isBuyer_idx" ON "Company"("isBuyer");
CREATE INDEX IF NOT EXISTS "Company_region_idx" ON "Company"("region");
CREATE INDEX IF NOT EXISTS "ProjectCompany_role_idx" ON "ProjectCompany"("role");
CREATE INDEX IF NOT EXISTS "BuyerSlateItem_buyerId_idx" ON "BuyerSlateItem"("buyerId");
CREATE INDEX IF NOT EXISTS "BuyerSlateItem_status_idx" ON "BuyerSlateItem"("status");
CREATE INDEX IF NOT EXISTS "BuyerSlateItem_confirmed_idx" ON "BuyerSlateItem"("confirmed");
CREATE INDEX IF NOT EXISTS "BuyerSlateItem_dateNoted_idx" ON "BuyerSlateItem"("dateNoted");

-- Ensure phase-1 Canadian buyer companies exist and are flagged.
INSERT INTO "Company" ("id", "name", "type", "isBuyer", "brands", "region", "createdAt", "updatedAt") VALUES
  ('netflix-canada', 'Netflix Canada', 'NETWORK', true, 'Netflix Canada', 'Canada', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('disney-plus-canada', 'Disney+ Canada', 'NETWORK', true, 'Disney+ Canada', 'Canada', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "isBuyer" = true, "region" = COALESCE("Company"."region", EXCLUDED."region"), "brands" = COALESCE("Company"."brands", EXCLUDED."brands"), "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Company"
SET "isBuyer" = true,
    "region" = COALESCE("region", 'Canada'),
    "brands" = CASE
      WHEN "id" = 'bellmedia' THEN COALESCE("brands", 'CTV (broadcast), Crave (streaming)')
      WHEN "id" = 'cbc' THEN COALESCE("brands", 'CBC')
      ELSE COALESCE("brands", "name")
    END,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" IN ('cbc', 'bellmedia', 'netflix-canada', 'disney-plus-canada')
   OR lower("name") IN ('cbc', 'bell media', 'netflix canada', 'disney+ canada');

-- Migrate legacy BuyerNote content into Company.lookingFor without dropping BuyerNote.
UPDATE "Company" c
SET "lookingFor" = TRIM(BOTH E'\n' FROM CONCAT_WS(E'\n\n', NULLIF(c."lookingFor", ''), bn.notes)),
    "updatedAt" = CURRENT_TIMESTAMP
FROM "BuyerNote" bn
WHERE c."isBuyer" = true
  AND (
    lower(bn.buyer) = lower(c.name)
    OR (c.id = 'cbc' AND lower(bn.buyer) IN ('cbc comedy', 'cbc drama', 'cbc'))
    OR (c.id = 'bellmedia' AND lower(bn.buyer) IN ('ctv/crave', 'ctv', 'crave', 'bell media'))
    OR (c.id = 'netflix-canada' AND lower(bn.buyer) = 'netflix canada')
    OR (c.id = 'disney-plus-canada' AND lower(bn.buyer) = 'disney+ canada')
  )
  AND bn.notes IS NOT NULL
  AND bn.notes <> ''
  AND (c."lookingFor" IS NULL OR c."lookingFor" NOT LIKE '%' || bn.notes || '%');

-- Migrate existing targetNetwork strings into ProjectCompany TARGET_BUYER links where possible.
INSERT INTO "ProjectCompany" ("id", "projectId", "companyId", "role")
SELECT 'target-' || p.id || '-' || c.id, p.id, c.id, 'TARGET_BUYER'
FROM "Project" p
JOIN "Company" c ON c."isBuyer" = true AND (
  lower(p."targetNetwork") = lower(c.name)
  OR (c.id = 'cbc' AND p."targetNetwork" ILIKE '%CBC%')
  OR (c.id = 'bellmedia' AND (p."targetNetwork" ILIKE '%Bell%' OR p."targetNetwork" ILIKE '%CTV%' OR p."targetNetwork" ILIKE '%Crave%'))
  OR (c.id = 'netflix-canada' AND p."targetNetwork" ILIKE '%Netflix%')
  OR (c.id = 'disney-plus-canada' AND p."targetNetwork" ILIKE '%Disney%')
)
WHERE p."targetNetwork" IS NOT NULL AND p."targetNetwork" <> ''
ON CONFLICT ("projectId", "companyId") DO UPDATE SET "role" = 'TARGET_BUYER';
