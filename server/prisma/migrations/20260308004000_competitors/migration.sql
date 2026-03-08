CREATE TYPE "public"."CompetitorSource" AS ENUM ('MANUAL', 'SUGGESTED_ACCEPTED');

CREATE TYPE "public"."CompetitorStatus" AS ENUM ('ACTIVE', 'REJECTED', 'ARCHIVED');

CREATE TYPE "public"."SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

CREATE TABLE "public"."Competitor" (
    "id" TEXT NOT NULL,
    "managedAccountId" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,
    "displayName" TEXT,
    "source" "public"."CompetitorSource" NOT NULL,
    "status" "public"."CompetitorStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptedFromSuggestionId" TEXT,
    "createdByAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."CompetitorSuggestion" (
    "id" TEXT NOT NULL,
    "managedAccountId" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,
    "displayName" TEXT,
    "suggestionReason" JSONB NOT NULL,
    "confidenceScore" DECIMAL(3,2) NOT NULL,
    "status" "public"."SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "generatedByRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "CompetitorSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Competitor_managedAccountId_xHandle_key" ON "public"."Competitor"("managedAccountId", "xHandle");
CREATE UNIQUE INDEX "Competitor_acceptedFromSuggestionId_key" ON "public"."Competitor"("acceptedFromSuggestionId");
CREATE INDEX "Competitor_xHandle_idx" ON "public"."Competitor"("xHandle");
CREATE INDEX "Competitor_status_idx" ON "public"."Competitor"("status");

CREATE UNIQUE INDEX "CompetitorSuggestion_managedAccountId_xHandle_status_key" ON "public"."CompetitorSuggestion"("managedAccountId", "xHandle", "status");
CREATE INDEX "CompetitorSuggestion_xHandle_idx" ON "public"."CompetitorSuggestion"("xHandle");
CREATE INDEX "CompetitorSuggestion_status_idx" ON "public"."CompetitorSuggestion"("status");
CREATE INDEX "CompetitorSuggestion_generatedByRunId_idx" ON "public"."CompetitorSuggestion"("generatedByRunId");

ALTER TABLE "public"."Competitor"
ADD CONSTRAINT "Competitor_managedAccountId_fkey"
FOREIGN KEY ("managedAccountId") REFERENCES "public"."ManagedAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Competitor"
ADD CONSTRAINT "Competitor_createdByAdminUserId_fkey"
FOREIGN KEY ("createdByAdminUserId") REFERENCES "public"."AdminUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Competitor"
ADD CONSTRAINT "Competitor_acceptedFromSuggestionId_fkey"
FOREIGN KEY ("acceptedFromSuggestionId") REFERENCES "public"."CompetitorSuggestion"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitorSuggestion"
ADD CONSTRAINT "CompetitorSuggestion_managedAccountId_fkey"
FOREIGN KEY ("managedAccountId") REFERENCES "public"."ManagedAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;