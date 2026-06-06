DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WriterTier') THEN
    CREATE TYPE "WriterTier" AS ENUM (
      'WANT_TO_WORK_WITH',
      'CONSIDER_WORKING_WITH',
      'NEED_TO_CHANGE_MY_MIND'
    );
  END IF;
END $$;

ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "writerTier" "WriterTier";

UPDATE "Contact"
SET "writerTier" = CASE
  WHEN "type" = 'WRITER' AND "highPriority" = true THEN 'WANT_TO_WORK_WITH'::"WriterTier"
  WHEN "type" = 'WRITER' THEN 'CONSIDER_WORKING_WITH'::"WriterTier"
  ELSE NULL
END
WHERE "writerTier" IS NULL;

CREATE INDEX IF NOT EXISTS "Contact_writerTier_idx" ON "Contact"("writerTier");

ALTER TABLE "Contact"
  DROP COLUMN IF EXISTS "highPriority";
