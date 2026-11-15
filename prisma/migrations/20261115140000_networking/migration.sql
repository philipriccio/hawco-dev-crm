-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "datePrecision" TEXT NOT NULL DEFAULT 'TIME',
ADD COLUMN     "occurrence" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "provenance" JSONB,
ADD COLUMN     "sourceFingerprint" TEXT,
ADD COLUMN     "sourceKey" TEXT;

-- AlterTable
ALTER TABLE "GoogleCalendarEvent" ADD COLUMN     "sourceCalendarId" TEXT;

-- CreateTable
CREATE TABLE "MeetingNote" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetworkingPreferences" (
    "userId" TEXT NOT NULL,
    "buyerDays" INTEGER NOT NULL DEFAULT 56,
    "priorityDays" INTEGER NOT NULL DEFAULT 90,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkingPreferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "NetworkingEmail" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "mailbox" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetworkingEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingNote_sourceKey_key" ON "MeetingNote"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkingEmail_sourceKey_key" ON "NetworkingEmail"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "NetworkingEmail_mailbox_messageId_contactId_key" ON "NetworkingEmail"("mailbox", "messageId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_sourceKey_key" ON "Meeting"("sourceKey");

-- AddForeignKey
ALTER TABLE "MeetingNote" ADD CONSTRAINT "MeetingNote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

