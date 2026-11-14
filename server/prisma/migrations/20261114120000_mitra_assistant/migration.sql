CREATE TABLE "AssistantSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "launcherVisible" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'auto',
    "proactiveNudgesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '07:00',
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tourCompletedAt" TIMESTAMP(3),
    "aiConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "status" TEXT,
    "toolCall" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssistantSettings_userId_key" ON "AssistantSettings"("userId");
CREATE INDEX "AssistantSettings_userId_proactiveNudgesEnabled_idx" ON "AssistantSettings"("userId", "proactiveNudgesEnabled");
CREATE INDEX "AssistantMessage_userId_createdAt_idx" ON "AssistantMessage"("userId", "createdAt");
CREATE INDEX "AssistantMessage_expiresAt_idx" ON "AssistantMessage"("expiresAt");

ALTER TABLE "AssistantSettings"
ADD CONSTRAINT "AssistantSettings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssistantMessage"
ADD CONSTRAINT "AssistantMessage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
