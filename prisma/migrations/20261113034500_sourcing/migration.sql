-- CreateTable
CREATE TABLE "SourcingLead" (
    "id" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creator" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'NEW',
    "decisionReason" TEXT NOT NULL DEFAULT '',
    "sourceChannel" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceDate" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'DESCRIPTION_ONLY',
    "fit" TEXT NOT NULL DEFAULT '',
    "gap" TEXT NOT NULL DEFAULT '',
    "nextStep" TEXT NOT NULL DEFAULT '',
    "rightsStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "rightsEvidence" TEXT NOT NULL DEFAULT '',
    "rightsCheckedOn" TEXT NOT NULL DEFAULT '',
    "contactId" TEXT,
    "projectId" TEXT,
    "ipId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "occurredOn" TEXT NOT NULL DEFAULT '',
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingBrief" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcingBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcingLead_identityKey_key" ON "SourcingLead"("identityKey");

-- CreateIndex
CREATE INDEX "SourcingLead_decision_updatedAt_idx" ON "SourcingLead"("decision", "updatedAt");

-- CreateIndex
CREATE INDEX "SourcingEvent_leadId_createdAt_idx" ON "SourcingEvent"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingBrief_version_key" ON "SourcingBrief"("version");

-- AddForeignKey
ALTER TABLE "SourcingLead" ADD CONSTRAINT "SourcingLead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingLead" ADD CONSTRAINT "SourcingLead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingLead" ADD CONSTRAINT "SourcingLead_ipId_fkey" FOREIGN KEY ("ipId") REFERENCES "IpProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingEvent" ADD CONSTRAINT "SourcingEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "SourcingLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
