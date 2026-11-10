CREATE TABLE "ClaudeConnectionCredential" (
  "id" TEXT PRIMARY KEY CHECK ("id" = 'claude'),
  "passwordHash" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedBy" TEXT NOT NULL
);
CREATE TABLE "ClaudeConnectionThrottle" (
  "key" TEXT PRIMARY KEY,
  "attempts" INTEGER NOT NULL,
  "windowStart" TIMESTAMPTZ NOT NULL DEFAULT now()
);
