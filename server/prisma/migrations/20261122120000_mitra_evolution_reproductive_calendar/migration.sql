-- CreateTable
CREATE TABLE IF NOT EXISTS "MitraState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "evolutionStage" TEXT NOT NULL DEFAULT 'ember',
    "mood" TEXT NOT NULL DEFAULT 'happy',
    "flameColor" TEXT NOT NULL DEFAULT 'aurora-mint',
    "streakDays" INTEGER NOT NULL DEFAULT 1,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastLevelUpAt" TIMESTAMP(3),
    "lastInteractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MitraState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReproductiveProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "mode" TEXT NOT NULL DEFAULT 'cycle',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentGivenAt" TIMESTAMP(3),
    "cycleLengthDays" INTEGER NOT NULL DEFAULT 28,
    "periodLengthDays" INTEGER NOT NULL DEFAULT 5,
    "lastPeriodStart" DATE,
    "pregnantSince" DATE,
    "estimatedDueDate" DATE,
    "encryptedNotes" TEXT,
    "encryptedSymptoms" TEXT,
    "privacyPinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReproductiveProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CycleEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "phase" TEXT,
    "flowIntensity" TEXT,
    "encryptedSymptoms" TEXT,
    "encryptedMood" TEXT,
    "temperatureCelsius" DOUBLE PRECISION,
    "fetalMovementCount" INTEGER,
    "notesEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CycleEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReproductiveProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CycleEntry_profileId_date_key" ON "CycleEntry"("profileId", "date");
CREATE INDEX IF NOT EXISTS "CycleEntry_profileId_date_idx" ON "CycleEntry"("profileId", "date");

-- CreateTable
CREATE TABLE IF NOT EXISTS "CalendarSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "provider" TEXT NOT NULL DEFAULT 'ical',
    "feedToken" TEXT NOT NULL UNIQUE,
    "syncToken" TEXT,
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "syncDirection" TEXT NOT NULL DEFAULT 'bidirectional',
    "externalCalendarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
