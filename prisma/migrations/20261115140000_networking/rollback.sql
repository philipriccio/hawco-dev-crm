-- Local/maintenance rollback only. Refuse to erase used networking evidence.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM "Meeting" WHERE "sourceKey" IS NOT NULL OR "occurrence" <> 'UNKNOWN') OR EXISTS (SELECT 1 FROM "MeetingNote") OR EXISTS (SELECT 1 FROM "NetworkingEmail") OR EXISTS (SELECT 1 FROM "NetworkingPreferences") THEN
  RAISE EXCEPTION 'Networking evidence exists: retain additive schema and roll back application code only';
 END IF;
END $$;
DROP TABLE "MeetingNote", "NetworkingEmail", "NetworkingPreferences";
DROP INDEX "Meeting_sourceKey_key";
ALTER TABLE "Meeting" DROP COLUMN "sourceKey", DROP COLUMN "sourceFingerprint", DROP COLUMN "provenance", DROP COLUMN "occurrence", DROP COLUMN "datePrecision";
ALTER TABLE "GoogleCalendarEvent" DROP COLUMN "sourceCalendarId";
COMMIT;
