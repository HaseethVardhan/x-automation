CREATE TYPE "public"."ManagedAccountStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISCONNECTED', 'ARCHIVED');

CREATE TYPE "public"."AccountConnectionMode" AS ENUM ('API_ONLY', 'BROWSER_ONLY', 'HYBRID');

CREATE TABLE "public"."ManagedAccount" (
    "id" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,
    "displayName" TEXT,
    "category" TEXT NOT NULL,
    "status" "public"."ManagedAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "connectionMode" "public"."AccountConnectionMode" NOT NULL,
    "goalsSummary" TEXT,
    "notes" TEXT,
    "createdByAdminUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagedAccount_xHandle_key" ON "public"."ManagedAccount"("xHandle");
CREATE INDEX "ManagedAccount_status_idx" ON "public"."ManagedAccount"("status");
CREATE INDEX "ManagedAccount_category_idx" ON "public"."ManagedAccount"("category");

ALTER TABLE "public"."ManagedAccount"
ADD CONSTRAINT "ManagedAccount_createdByAdminUserId_fkey"
FOREIGN KEY ("createdByAdminUserId") REFERENCES "public"."AdminUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;