CREATE TYPE "public"."SourceType" AS ENUM ('CREATOR_POSTS', 'COMPETITOR_POSTS', 'X_TRENDS', 'EXTERNAL_NEWS', 'EXTERNAL_WEB');

CREATE TYPE "public"."TopicCandidateStatus" AS ENUM ('ACTIVE', 'DROPPED', 'SELECTED');

CREATE TYPE "public"."DraftVariantStatus" AS ENUM ('GENERATED', 'FLAGGED', 'APPROVED', 'REJECTED', 'EDITED');

CREATE TYPE "public"."ReviewDecisionType" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_RERUN');

CREATE TYPE "public"."AuditEventType" AS ENUM ('LOGIN', 'LOGOUT', 'CREDENTIAL_CREATED', 'CREDENTIAL_REVOKED', 'MANAGED_ACCOUNT_CREATED', 'MANAGED_ACCOUNT_UPDATED', 'COMPETITOR_ADDED', 'SUGGESTION_ACCEPTED', 'RUN_CREATED', 'RUN_STARTED', 'RUN_STAGE_COMPLETED', 'RUN_FAILED', 'DRAFT_GENERATED', 'DRAFT_APPROVED', 'DRAFT_REJECTED');

CREATE TABLE "public"."SourceSnapshot" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "sourceType" "public"."SourceType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "rawPayload" JSONB NOT NULL,
    "normalizedPayload" JSONB,
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."CreatorProfileArtifact" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "accountSnapshotWindowDays" INTEGER NOT NULL,
    "analyzedPostCount" INTEGER NOT NULL,
    "styleProfile" JSONB NOT NULL,
    "topicProfile" JSONB NOT NULL,
    "engagementProfile" JSONB,
    "exclusionsProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorProfileArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."CompetitorInsightArtifact" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "competitorCount" INTEGER NOT NULL,
    "postingPatternSummary" JSONB NOT NULL,
    "topicPatternSummary" JSONB NOT NULL,
    "hookPatternSummary" JSONB NOT NULL,
    "gapOpportunities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorInsightArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."TopicCandidate" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "topicKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceMix" JSONB NOT NULL,
    "creatorFitScore" DECIMAL(3,2) NOT NULL,
    "trendMomentumScore" DECIMAL(3,2) NOT NULL,
    "noveltyScore" DECIMAL(3,2) NOT NULL,
    "audienceFitScore" DECIMAL(3,2) NOT NULL,
    "policyRiskScore" DECIMAL(3,2) NOT NULL,
    "overallScore" DECIMAL(3,2) NOT NULL,
    "rationale" JSONB NOT NULL,
    "status" "public"."TopicCandidateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."DraftVariant" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "topicCandidateId" TEXT NOT NULL,
    "variantNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "generationPromptVersion" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "styleFitScore" DECIMAL(3,2),
    "noveltyScore" DECIMAL(3,2),
    "duplicationRiskScore" DECIMAL(3,2),
    "policyRiskScore" DECIMAL(3,2),
    "evidenceSummary" JSONB NOT NULL,
    "validationSummary" JSONB,
    "status" "public"."DraftVariantStatus" NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ReviewDecision" (
    "id" TEXT NOT NULL,
    "draftVariantId" TEXT NOT NULL,
    "decidedByAdminUserId" TEXT NOT NULL,
    "decision" "public"."ReviewDecisionType" NOT NULL,
    "editedContent" TEXT,
    "editDistance" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."AuditEvent" (
    "id" TEXT NOT NULL,
    "actorAdminUserId" TEXT,
    "managedAccountId" TEXT,
    "researchRunId" TEXT,
    "eventType" "public"."AuditEventType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SourceSnapshot_researchRunId_sourceType_idx" ON "public"."SourceSnapshot"("researchRunId", "sourceType");
CREATE INDEX "SourceSnapshot_sourceKey_idx" ON "public"."SourceSnapshot"("sourceKey");

CREATE UNIQUE INDEX "CreatorProfileArtifact_researchRunId_key" ON "public"."CreatorProfileArtifact"("researchRunId");

CREATE UNIQUE INDEX "CompetitorInsightArtifact_researchRunId_key" ON "public"."CompetitorInsightArtifact"("researchRunId");

CREATE UNIQUE INDEX "TopicCandidate_researchRunId_topicKey_key" ON "public"."TopicCandidate"("researchRunId", "topicKey");
CREATE INDEX "TopicCandidate_researchRunId_overallScore_idx" ON "public"."TopicCandidate"("researchRunId", "overallScore" DESC);
CREATE INDEX "TopicCandidate_status_idx" ON "public"."TopicCandidate"("status");

CREATE UNIQUE INDEX "DraftVariant_researchRunId_topicCandidateId_variantNumber_key" ON "public"."DraftVariant"("researchRunId", "topicCandidateId", "variantNumber");
CREATE INDEX "DraftVariant_researchRunId_idx" ON "public"."DraftVariant"("researchRunId");
CREATE INDEX "DraftVariant_status_idx" ON "public"."DraftVariant"("status");

CREATE UNIQUE INDEX "ReviewDecision_draftVariantId_key" ON "public"."ReviewDecision"("draftVariantId");
CREATE INDEX "ReviewDecision_decision_idx" ON "public"."ReviewDecision"("decision");

CREATE INDEX "AuditEvent_createdAt_idx" ON "public"."AuditEvent"("createdAt" DESC);
CREATE INDEX "AuditEvent_eventType_idx" ON "public"."AuditEvent"("eventType");
CREATE INDEX "AuditEvent_actorAdminUserId_idx" ON "public"."AuditEvent"("actorAdminUserId");
CREATE INDEX "AuditEvent_managedAccountId_idx" ON "public"."AuditEvent"("managedAccountId");
CREATE INDEX "AuditEvent_researchRunId_idx" ON "public"."AuditEvent"("researchRunId");

ALTER TABLE "public"."SourceSnapshot"
ADD CONSTRAINT "SourceSnapshot_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CreatorProfileArtifact"
ADD CONSTRAINT "CreatorProfileArtifact_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."CompetitorInsightArtifact"
ADD CONSTRAINT "CompetitorInsightArtifact_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."TopicCandidate"
ADD CONSTRAINT "TopicCandidate_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."DraftVariant"
ADD CONSTRAINT "DraftVariant_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."DraftVariant"
ADD CONSTRAINT "DraftVariant_topicCandidateId_fkey"
FOREIGN KEY ("topicCandidateId") REFERENCES "public"."TopicCandidate"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."ReviewDecision"
ADD CONSTRAINT "ReviewDecision_draftVariantId_fkey"
FOREIGN KEY ("draftVariantId") REFERENCES "public"."DraftVariant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."ReviewDecision"
ADD CONSTRAINT "ReviewDecision_decidedByAdminUserId_fkey"
FOREIGN KEY ("decidedByAdminUserId") REFERENCES "public"."AdminUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_actorAdminUserId_fkey"
FOREIGN KEY ("actorAdminUserId") REFERENCES "public"."AdminUser"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_managedAccountId_fkey"
FOREIGN KEY ("managedAccountId") REFERENCES "public"."ManagedAccount"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."AuditEvent"
ADD CONSTRAINT "AuditEvent_researchRunId_fkey"
FOREIGN KEY ("researchRunId") REFERENCES "public"."ResearchRun"("id")
ON DELETE SET NULL ON UPDATE CASCADE;