CREATE TABLE "public"."AccountPreference" (
    "id" TEXT NOT NULL,
    "managedAccountId" TEXT NOT NULL,
    "objective" TEXT,
    "toneGuidance" JSONB,
    "bannedThemes" JSONB,
    "bannedClaims" JSONB,
    "bannedFormats" JSONB,
    "preferredFormats" JSONB,
    "competitorSuggestionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "externalTrendEnabled" BOOLEAN NOT NULL DEFAULT true,
    "noveltyLookbackDays" INTEGER NOT NULL DEFAULT 120,
    "maxDraftVariants" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountPreference_managedAccountId_key" ON "public"."AccountPreference"("managedAccountId");

ALTER TABLE "public"."AccountPreference"
ADD CONSTRAINT "AccountPreference_managedAccountId_fkey"
FOREIGN KEY ("managedAccountId") REFERENCES "public"."ManagedAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;