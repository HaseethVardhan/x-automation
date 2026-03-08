CREATE TYPE "public"."RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PARTIAL', 'FAILED', 'COMPLETED', 'REVIEWED', 'CANCELED');

CREATE TYPE "public"."RunPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

CREATE TYPE "public"."RunStage" AS ENUM ('PREPARE', 'COLLECT_CREATOR_DATA', 'ANALYZE_CREATOR', 'SUGGEST_COMPETITORS', 'COLLECT_COMPETITOR_DATA', 'ANALYZE_COMPETITORS', 'COLLECT_TRENDS', 'SCORE_TOPICS', 'GENERATE_DRAFTS', 'VALIDATE_DRAFTS', 'FINALIZE_RUN');

CREATE TYPE "public"."StageStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED');

CREATE TABLE "public"."ResearchRun" (
    "id" TEXT NOT NULL,
    "managedAccountId" TEXT NOT NULL,
    "requestedByAdminUserId" TEXT NOT NULL,
    "status" "public"."RunStatus" NOT NULL,
    "priority" "public"."RunPriority" NOT NULL DEFAULT 'NORMAL',
    "currentStage" "public"."RunStage",
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "inputSnapshot" JSONB NOT NULL,
    "summary" JSONB,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ResearchRunStage" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "stage" "public"."RunStage" NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."StageStatus" NOT NULL,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "inputRef" JSONB,
    "outputRef" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchRunStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchRun_managedAccountId_createdAt_idx" ON "public"."ResearchRun"("managedAccountId", "createdAt" DESC);
CREATE INDEX "ResearchRun_status_idx" ON "public"."ResearchRun"("status");
CREATE INDEX "ResearchRun_currentStage_idx" ON "public"."ResearchRun"("currentStage");

CREATE UNIQUE INDEX "ResearchRunStage_researchRunId_stage_attemptNumber_key" ON "public"."ResearchRunStage"("researchRunId", "stage", "attemptNumber");
CREATE INDEX "ResearchRunStage_researchRunId_stage_idx" ON "public"."ResearchRunStage"("researchRunId", "stage");
CREATE INDEX "ResearchRunStage_status_idx" ON "public"."ResearchRunStage"("status");

ALTER TABLE "public"."ResearchRun"
ADD CONSTRAINT "ResearchRun_managedAccountId_fkey"
FOREIGN KEY ("managedAccountId") REFERENCES "public"."ManagedAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."ResearchRun"
ADD CONSTRAINT "ResearchRun_requestedByAdminUserId_fkey"
FOREIGN KEY ("requestedByAdminUserId") REFERENCES "public"."AdminUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."ResearchRunStage"
ADD CONSTRAINT "ResearchRunStage_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitorSuggestion"
ADD CONSTRAINT "CompetitorSuggestion_generatedByRunId_fkey"
FOREIGN KEY ("generatedByRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE SET NULL ON UPDATE CASCADE;