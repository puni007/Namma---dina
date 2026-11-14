CREATE TABLE "BreathingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "inhaleSeconds" INTEGER NOT NULL,
    "holdSeconds" INTEGER NOT NULL,
    "exhaleSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreathingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BreathingSession_userId_date_idx" ON "BreathingSession"("userId", "date");

ALTER TABLE "BreathingSession"
ADD CONSTRAINT "BreathingSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
