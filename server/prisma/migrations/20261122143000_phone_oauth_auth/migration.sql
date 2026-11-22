-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "facebookId" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'email';
ALTER TABLE "public"."User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "public"."User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNumber_key" ON "public"."User"("phoneNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "public"."User"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_facebookId_key" ON "public"."User"("facebookId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."PhoneOtp" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneOtp_phoneNumber_idx" ON "public"."PhoneOtp"("phoneNumber");
