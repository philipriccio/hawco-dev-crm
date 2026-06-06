DO $$ BEGIN
  CREATE TYPE "IpPropertyType" AS ENUM ('BOOK', 'PLAY', 'ARTICLE', 'SHORT_STORY', 'MUSICAL', 'PODCAST', 'LIFE_RIGHTS', 'SCREENPLAY', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IpRightsStatus" AS ENUM ('TO_RESEARCH', 'AVAILABLE', 'PUBLIC_DOMAIN', 'INQUIRY_SENT', 'IN_CONVERSATION', 'OPTION_OFFERED', 'OPTIONED', 'SECURED', 'PASSED', 'UNAVAILABLE', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IpInterest" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IpChainStatus" AS ENUM ('UNKNOWN', 'CLEAN', 'NEEDS_LEGAL_REVIEW', 'PROBLEMATIC');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IpDocumentType" AS ENUM ('AGREEMENT', 'RIGHTS_CORRESPONDENCE', 'SOURCE_MATERIAL', 'LEGAL_NOTE', 'ONE_SHEET', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "IpProperty" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "IpPropertyType" NOT NULL,
  "status" "IpRightsStatus" NOT NULL DEFAULT 'TO_RESEARCH',
  "interest" "IpInterest" NOT NULL DEFAULT 'MEDIUM',
  "creator" TEXT,
  "publisher" TEXT,
  "sourceYear" TEXT,
  "country" TEXT,
  "language" TEXT,
  "sourceUrl" TEXT,
  "sourceLocation" TEXT,
  "uploadAllowed" BOOLEAN,
  "rightsHolderName" TEXT,
  "rightsHolderContactId" TEXT,
  "rightsHolderCompanyId" TEXT,
  "rightsSought" TEXT,
  "territory" TEXT,
  "termNotes" TEXT,
  "exclusivity" TEXT,
  "optionStartDate" TIMESTAMP(3),
  "optionExpiryDate" TIMESTAMP(3),
  "extensionDeadline" TIMESTAMP(3),
  "optionFee" TEXT,
  "purchasePrice" TEXT,
  "dealNotes" TEXT,
  "chainOfTitleStatus" "IpChainStatus" NOT NULL DEFAULT 'UNKNOWN',
  "chainOfTitleNotes" TEXT,
  "encumbranceNotes" TEXT,
  "legalReviewStatus" TEXT,
  "emailTrail" TEXT,
  "meetingNotes" TEXT,
  "nextAction" TEXT,
  "lastContactAt" TIMESTAMP(3),
  "notes" TEXT,
  "projectId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpProperty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IpDocument" (
  "id" TEXT NOT NULL,
  "ipPropertyId" TEXT NOT NULL,
  "type" "IpDocumentType" NOT NULL DEFAULT 'OTHER',
  "title" TEXT NOT NULL,
  "fileName" TEXT,
  "fileUrl" TEXT,
  "externalUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IpDocument_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IpProperty_projectId_fkey') THEN
    ALTER TABLE "IpProperty" ADD CONSTRAINT "IpProperty_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IpProperty_rightsHolderContactId_fkey') THEN
    ALTER TABLE "IpProperty" ADD CONSTRAINT "IpProperty_rightsHolderContactId_fkey" FOREIGN KEY ("rightsHolderContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IpProperty_rightsHolderCompanyId_fkey') THEN
    ALTER TABLE "IpProperty" ADD CONSTRAINT "IpProperty_rightsHolderCompanyId_fkey" FOREIGN KEY ("rightsHolderCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IpDocument_ipPropertyId_fkey') THEN
    ALTER TABLE "IpDocument" ADD CONSTRAINT "IpDocument_ipPropertyId_fkey" FOREIGN KEY ("ipPropertyId") REFERENCES "IpProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IpProperty_status_idx" ON "IpProperty"("status");
CREATE INDEX IF NOT EXISTS "IpProperty_interest_idx" ON "IpProperty"("interest");
CREATE INDEX IF NOT EXISTS "IpProperty_type_idx" ON "IpProperty"("type");
CREATE INDEX IF NOT EXISTS "IpProperty_optionExpiryDate_idx" ON "IpProperty"("optionExpiryDate");
CREATE INDEX IF NOT EXISTS "IpProperty_projectId_idx" ON "IpProperty"("projectId");
CREATE INDEX IF NOT EXISTS "IpProperty_rightsHolderContactId_idx" ON "IpProperty"("rightsHolderContactId");
CREATE INDEX IF NOT EXISTS "IpProperty_rightsHolderCompanyId_idx" ON "IpProperty"("rightsHolderCompanyId");
CREATE INDEX IF NOT EXISTS "IpDocument_ipPropertyId_idx" ON "IpDocument"("ipPropertyId");
CREATE INDEX IF NOT EXISTS "IpDocument_type_idx" ON "IpDocument"("type");

INSERT INTO "IpProperty" (
  "id", "title", "type", "status", "interest", "creator", "publisher", "sourceYear",
  "country", "language", "rightsHolderName", "rightsSought", "territory", "chainOfTitleStatus",
  "chainOfTitleNotes", "encumbranceNotes", "legalReviewStatus", "sourceLocation", "uploadAllowed",
  "nextAction", "notes", "createdAt", "updatedAt"
) VALUES
  (
    'ip-suburban-motel-plays',
    'Suburban Motel plays',
    'PLAY',
    'IN_CONVERSATION',
    'HIGH',
    'George F. Walker',
    NULL,
    '1997-2003',
    'Canada',
    'English',
    'Rights holder to confirm',
    'Television/series adaptation rights to confirm.',
    'Canada and international to confirm',
    'NEEDS_LEGAL_REVIEW',
    'Confirm current controller of stage and screen/adaptation rights before any development spend.',
    'Check whether any prior screen/TV options, publisher approvals, or reserved stage rights exist.',
    'Not reviewed',
    'Track metadata for the play cycle; upload source material only if rights/storage allow.',
    false,
    'Confirm rights holder and whether TV adaptation rights are available.',
    'Starter IP pursuit added from Philip: Suburban Motel plays by George F. Walker.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'ip-come-from-away',
    'Come From Away',
    'MUSICAL',
    'TO_RESEARCH',
    'HIGH',
    'Irene Sankoff and David Hein',
    NULL,
    '2013',
    'Canada',
    'English',
    'Rights holder to confirm',
    'Television/film adaptation or related dramatic rights to confirm.',
    'Canada and international to confirm',
    'UNKNOWN',
    'Major existing stage musical; chain of title and adaptation control need careful confirmation.',
    'Expect layered rights across authors, producers, stage licensors, and underlying real-life/story elements.',
    'Not reviewed',
    'Track metadata only until upload permissions are clear.',
    false,
    'Identify representative/licensor and clarify which screen rights, if any, are available.',
    'Starter IP pursuit added from Philip: Come From Away the musical.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'ip-alpine-divorce',
    'Alpine Divorce',
    'SHORT_STORY',
    'PUBLIC_DOMAIN',
    'MEDIUM',
    'To verify',
    NULL,
    NULL,
    NULL,
    'English',
    'Public domain, to verify',
    'Adaptation rights expected to be available if public-domain status is confirmed.',
    'Canada and international to confirm',
    'NEEDS_LEGAL_REVIEW',
    'Confirm author, publication date, jurisdiction, and public-domain status before relying on this.',
    'Even public-domain source material can have title, translation, edition, or later adaptation issues.',
    'Not reviewed',
    'Public-domain/source link to be added once verified.',
    true,
    'Verify bibliographic details and public-domain basis.',
    'Starter IP pursuit added from Philip: Alpine Divorce, described as a public-domain short story.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "type" = EXCLUDED."type",
  "status" = EXCLUDED."status",
  "interest" = EXCLUDED."interest",
  "creator" = EXCLUDED."creator",
  "publisher" = EXCLUDED."publisher",
  "sourceYear" = EXCLUDED."sourceYear",
  "country" = EXCLUDED."country",
  "language" = EXCLUDED."language",
  "rightsHolderName" = EXCLUDED."rightsHolderName",
  "rightsSought" = EXCLUDED."rightsSought",
  "territory" = EXCLUDED."territory",
  "chainOfTitleStatus" = EXCLUDED."chainOfTitleStatus",
  "chainOfTitleNotes" = EXCLUDED."chainOfTitleNotes",
  "encumbranceNotes" = EXCLUDED."encumbranceNotes",
  "legalReviewStatus" = EXCLUDED."legalReviewStatus",
  "sourceLocation" = EXCLUDED."sourceLocation",
  "uploadAllowed" = EXCLUDED."uploadAllowed",
  "nextAction" = EXCLUDED."nextAction",
  "notes" = EXCLUDED."notes",
  "updatedAt" = CURRENT_TIMESTAMP;
