CREATE TABLE "ProjectAgreementContact" (
  "id" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "role" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectAgreementContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectAgreementContact_agreementId_contactId_key"
  ON "ProjectAgreementContact"("agreementId", "contactId");

CREATE INDEX "ProjectAgreementContact_agreementId_idx"
  ON "ProjectAgreementContact"("agreementId");

CREATE INDEX "ProjectAgreementContact_contactId_idx"
  ON "ProjectAgreementContact"("contactId");

ALTER TABLE "ProjectAgreementContact"
  ADD CONSTRAINT "ProjectAgreementContact_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "ProjectAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAgreementContact"
  ADD CONSTRAINT "ProjectAgreementContact_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
