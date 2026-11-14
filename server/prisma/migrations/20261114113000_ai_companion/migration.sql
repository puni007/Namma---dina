ALTER TABLE "UserSettings"
ADD COLUMN "aiCompanionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiMorningBriefingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiQuickAddEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiComebackPlanEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "aiWeeklyReflectionEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AIUsage_userId_createdAt_idx" ON "AIUsage"("userId", "createdAt");

ALTER TABLE "AIUsage"
ADD CONSTRAINT "AIUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
