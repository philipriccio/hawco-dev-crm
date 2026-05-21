-- Remove empty/legacy BUYER contact type; NETWORK_EXEC covers buyer-side roles.
-- Safety: migrate any unexpected stragglers to NETWORK_EXEC before replacing the enum.
UPDATE "Contact" SET "type" = 'NETWORK_EXEC' WHERE "type" = 'BUYER';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactType') THEN
    ALTER TYPE "ContactType" RENAME TO "ContactType_old";
    CREATE TYPE "ContactType" AS ENUM ('WRITER', 'AGENT', 'MANAGER', 'NETWORK_EXEC', 'PRODUCER', 'OTHER');
    ALTER TABLE "Contact" ALTER COLUMN "type" TYPE "ContactType" USING "type"::text::"ContactType";
    DROP TYPE "ContactType_old";
  END IF;
END $$;
