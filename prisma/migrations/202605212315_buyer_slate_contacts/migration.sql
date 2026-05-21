CREATE TABLE IF NOT EXISTS "BuyerSlateContact" (
  "id" TEXT NOT NULL,
  "slateItemId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "role" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BuyerSlateContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BuyerSlateContact_slateItemId_contactId_key" ON "BuyerSlateContact"("slateItemId", "contactId");
CREATE INDEX IF NOT EXISTS "BuyerSlateContact_slateItemId_idx" ON "BuyerSlateContact"("slateItemId");
CREATE INDEX IF NOT EXISTS "BuyerSlateContact_contactId_idx" ON "BuyerSlateContact"("contactId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BuyerSlateContact_slateItemId_fkey'
  ) THEN
    ALTER TABLE "BuyerSlateContact"
      ADD CONSTRAINT "BuyerSlateContact_slateItemId_fkey"
      FOREIGN KEY ("slateItemId") REFERENCES "BuyerSlateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BuyerSlateContact_contactId_fkey'
  ) THEN
    ALTER TABLE "BuyerSlateContact"
      ADD CONSTRAINT "BuyerSlateContact_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
