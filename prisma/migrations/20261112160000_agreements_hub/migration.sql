-- CreateTable
CREATE TABLE "AgreementWorkspace" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementEvent" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementDocument" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "parentId" TEXT,
    "classification" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementLegal" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mimeType" TEXT,
    "hash" TEXT,
    "parentId" TEXT,
    "bytes" BYTEA,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementLegal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementReminder" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "dateId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DELIVERED',
    "snoozedUntil" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementImport" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "expectedVersion" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'STAGED',
    "actorId" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "hash" TEXT NOT NULL,
    "parentId" TEXT,
    "source" JSONB NOT NULL,
    "decisions" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgreementEvent_agreementId_version_key" ON "AgreementEvent"("agreementId", "version");

-- CreateIndex
CREATE INDEX "AgreementDocument_agreementId_idx" ON "AgreementDocument"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementLegal_agreementId_idx" ON "AgreementLegal"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementReminder_agreementId_idx" ON "AgreementReminder"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementTemplate_type_versionLabel_key" ON "AgreementTemplate"("type", "versionLabel");

-- AddForeignKey
ALTER TABLE "AgreementWorkspace" ADD CONSTRAINT "AgreementWorkspace_id_fkey" FOREIGN KEY ("id") REFERENCES "ProjectAgreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
