CREATE TABLE "ProjectAgreement" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "agreementType" TEXT,
  "status" TEXT,
  "counterparty" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "fileName" TEXT,
  "fileUrl" TEXT,
  "fileSize" INTEGER,
  "mimeType" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevelopmentCost" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT,
  "vendor" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DevelopmentCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectAgreement_projectId_idx" ON "ProjectAgreement"("projectId");
CREATE INDEX "ProjectAgreement_status_idx" ON "ProjectAgreement"("status");
CREATE INDEX "ProjectAgreement_expiryDate_idx" ON "ProjectAgreement"("expiryDate");
CREATE INDEX "DevelopmentCost_projectId_idx" ON "DevelopmentCost"("projectId");
CREATE INDEX "DevelopmentCost_spentAt_idx" ON "DevelopmentCost"("spentAt");
CREATE INDEX "DevelopmentCost_category_idx" ON "DevelopmentCost"("category");

ALTER TABLE "ProjectAgreement"
  ADD CONSTRAINT "ProjectAgreement_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevelopmentCost"
  ADD CONSTRAINT "DevelopmentCost_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
