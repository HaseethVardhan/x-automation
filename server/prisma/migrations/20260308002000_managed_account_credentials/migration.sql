CREATE TYPE "public"."CredentialType" AS ENUM ('X_API_TOKEN', 'X_API_REFRESH_TOKEN', 'BROWSER_SESSION');

CREATE TYPE "public"."CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'INVALID');

CREATE TABLE "public"."ManagedAccountCredential" (
    "id" TEXT NOT NULL,
    "managedAccountId" TEXT NOT NULL,
    "credentialType" "public"."CredentialType" NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL,
    "status" "public"."CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastValidatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdByAdminUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedAccountCredential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagedAccountCredential_managedAccountId_credentialType_idx" ON "public"."ManagedAccountCredential"("managedAccountId", "credentialType");
CREATE INDEX "ManagedAccountCredential_status_idx" ON "public"."ManagedAccountCredential"("status");

ALTER TABLE "public"."ManagedAccountCredential"
ADD CONSTRAINT "ManagedAccountCredential_managedAccountId_fkey"
FOREIGN KEY ("managedAccountId") REFERENCES "public"."ManagedAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."ManagedAccountCredential"
ADD CONSTRAINT "ManagedAccountCredential_createdByAdminUserId_fkey"
FOREIGN KEY ("createdByAdminUserId") REFERENCES "public"."AdminUser"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;