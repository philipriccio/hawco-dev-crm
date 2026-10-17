CREATE TABLE "EmailReply" (
  "id" TEXT NOT NULL,
  "mailbox" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "latestMessageId" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "context" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailReply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailReply_status_check" CHECK ("status" IN ('OPEN', 'RESOLVED', 'DISMISSED'))
);
CREATE UNIQUE INDEX "EmailReply_mailbox_threadId_key" ON "EmailReply"("mailbox", "threadId");
CREATE INDEX "EmailReply_status_receivedAt_idx" ON "EmailReply"("status", "receivedAt");
