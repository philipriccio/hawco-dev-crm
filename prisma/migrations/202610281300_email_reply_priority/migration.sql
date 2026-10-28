ALTER TABLE "EmailReply" ADD COLUMN "isNetwork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "priorityRank" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN "priorityReason" TEXT;
ALTER TABLE "EmailReply" ADD CONSTRAINT "EmailReply_priorityRank_check" CHECK ("priorityRank" BETWEEN 1 AND 10000);
