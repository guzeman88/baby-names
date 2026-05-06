-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "ListType" AS ENUM ('LIKED', 'PASSED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SwipeDecision" AS ENUM ('LIKED', 'PASSED');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('BOY', 'GIRL', 'BOTH');

-- CreateTable
CREATE TABLE "Name" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "gender" "Gender" NOT NULL,
    "popularityRank" INTEGER NOT NULL,
    "popularityPercentile" DOUBLE PRECISION NOT NULL,
    "totalBirths" INTEGER NOT NULL,
    "recentBirths" INTEGER NOT NULL,
    "peakRank" INTEGER NOT NULL,
    "peakYear" INTEGER NOT NULL,
    "firstYear" INTEGER NOT NULL,
    "lastYear" INTEGER NOT NULL,

    CONSTRAINT "Name_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameYearlyStat" (
    "id" SERIAL NOT NULL,
    "nameId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "births" INTEGER NOT NULL,
    "rankThatYear" INTEGER,

    CONSTRAINT "NameYearlyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(72) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastName" VARCHAR(64),
    "genderPref" "GenderPreference" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "type" "ListType" NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListEntry" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "nameId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwipeHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nameId" INTEGER NOT NULL,
    "decision" "SwipeDecision" NOT NULL,
    "swipedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwipeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Name_gender_popularityRank_idx" ON "Name"("gender", "popularityRank");

-- CreateIndex
CREATE INDEX "Name_gender_popularityPercentile_idx" ON "Name"("gender", "popularityPercentile");

-- CreateIndex
CREATE INDEX "Name_name_idx" ON "Name"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Name_name_gender_key" ON "Name"("name", "gender");

-- CreateIndex
CREATE INDEX "NameYearlyStat_nameId_idx" ON "NameYearlyStat"("nameId");

-- CreateIndex
CREATE INDEX "NameYearlyStat_year_idx" ON "NameYearlyStat"("year");

-- CreateIndex
CREATE UNIQUE INDEX "NameYearlyStat_nameId_year_key" ON "NameYearlyStat"("nameId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerification_tokenHash_key" ON "EmailVerification"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");

-- CreateIndex
CREATE INDEX "List_userId_idx" ON "List"("userId");

-- CreateIndex
CREATE INDEX "List_userId_type_idx" ON "List"("userId", "type");

-- CreateIndex
CREATE INDEX "ListEntry_listId_position_idx" ON "ListEntry"("listId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ListEntry_listId_nameId_key" ON "ListEntry"("listId", "nameId");

-- CreateIndex
CREATE INDEX "SwipeHistory_userId_idx" ON "SwipeHistory"("userId");

-- CreateIndex
CREATE INDEX "SwipeHistory_userId_decision_idx" ON "SwipeHistory"("userId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "SwipeHistory_userId_nameId_key" ON "SwipeHistory"("userId", "nameId");

-- AddForeignKey
ALTER TABLE "NameYearlyStat" ADD CONSTRAINT "NameYearlyStat_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "Name"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListEntry" ADD CONSTRAINT "ListEntry_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListEntry" ADD CONSTRAINT "ListEntry_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "Name"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeHistory" ADD CONSTRAINT "SwipeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeHistory" ADD CONSTRAINT "SwipeHistory_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "Name"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
