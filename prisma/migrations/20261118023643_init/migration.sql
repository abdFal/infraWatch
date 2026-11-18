-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "TimeRange" AS ENUM ('H1', 'H3', 'H6', 'H12', 'H24');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SETTINGS_UPDATED', 'PREFERENCES_UPDATED', 'PROVIDER_ERROR', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "awsRegion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshIntervalSec" INTEGER NOT NULL DEFAULT 60,
    "defaultTimeRange" "TimeRange" NOT NULL DEFAULT 'H3',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_preferences_userId_key" ON "monitoring_preferences"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_createdAt_idx" ON "activity_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_preferences" ADD CONSTRAINT "monitoring_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
