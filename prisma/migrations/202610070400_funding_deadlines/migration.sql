CREATE TABLE "FundingDeadline" (
  "id" TEXT NOT NULL,
  "program" TEXT NOT NULL,
  "funder" TEXT,
  "round" TEXT,
  "closingDate" DATE NOT NULL,
  "sourceUrl" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'TENTATIVE',
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FundingDeadline_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FundingDeadline_status_check" CHECK ("status" IN ('TENTATIVE', 'CONFIRMED'))
);
CREATE INDEX "FundingDeadline_archived_closingDate_idx" ON "FundingDeadline"("archived", "closingDate");
