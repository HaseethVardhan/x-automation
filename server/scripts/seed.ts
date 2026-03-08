import 'dotenv/config';

import { AccountConnectionMode, PrismaClient } from '../node_modules/.prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'owner@x-automation.local';
const DEFAULT_ADMIN_PASSWORD = 'dev-owner-password';
const DEFAULT_MANAGED_ACCOUNT_HANDLE = 'xautomationdemo';
const DEFAULT_MANAGED_ACCOUNT_DISPLAY_NAME = 'X Automation Demo';
const DEFAULT_MANAGED_ACCOUNT_CATEGORY = 'technology';
const DEFAULT_MANAGED_ACCOUNT_GOALS_SUMMARY =
  'Development seed account for local workflow setup.';

function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase();
}

function parseConnectionMode(value: string | undefined): AccountConnectionMode {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue) {
    return AccountConnectionMode.HYBRID;
  }

  switch (normalizedValue) {
    case AccountConnectionMode.API_ONLY:
      return AccountConnectionMode.API_ONLY;
    case AccountConnectionMode.BROWSER_ONLY:
      return AccountConnectionMode.BROWSER_ONLY;
    case AccountConnectionMode.HYBRID:
      return AccountConnectionMode.HYBRID;
    default:
      throw new Error(
        `Invalid SEED_MANAGED_ACCOUNT_CONNECTION_MODE: ${value}. Expected API_ONLY, BROWSER_ONLY, or HYBRID.`,
      );
  }
}

async function main() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PRODUCTION_SEED !== 'true'
  ) {
    throw new Error(
      'Refusing to run the development seed in production. Set ALLOW_PRODUCTION_SEED=true only if this is intentional.',
    );
  }

  const seedAdminEmail =
    process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() ?? DEFAULT_ADMIN_EMAIL;
  const seedAdminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const managedAccountHandle = normalizeHandle(
    process.env.SEED_MANAGED_ACCOUNT_HANDLE ?? DEFAULT_MANAGED_ACCOUNT_HANDLE,
  );
  const managedAccountDisplayName =
    process.env.SEED_MANAGED_ACCOUNT_DISPLAY_NAME?.trim() ||
    DEFAULT_MANAGED_ACCOUNT_DISPLAY_NAME;
  const managedAccountCategory =
    process.env.SEED_MANAGED_ACCOUNT_CATEGORY?.trim() ||
    DEFAULT_MANAGED_ACCOUNT_CATEGORY;
  const managedAccountGoalsSummary =
    process.env.SEED_MANAGED_ACCOUNT_GOALS_SUMMARY?.trim() ||
    DEFAULT_MANAGED_ACCOUNT_GOALS_SUMMARY;
  const connectionMode = parseConnectionMode(
    process.env.SEED_MANAGED_ACCOUNT_CONNECTION_MODE,
  );
  const dryRun = process.env.SEED_DRY_RUN === 'true';

  if (!managedAccountHandle) {
    throw new Error('SEED_MANAGED_ACCOUNT_HANDLE must contain at least one character.');
  }

  if (!seedAdminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD must not be empty.');
  }

  const passwordHash = await bcrypt.hash(seedAdminPassword, 10);

  if (dryRun) {
    console.log('Seed dry run configuration:');
    console.log(
      JSON.stringify(
        {
          adminEmail: seedAdminEmail,
          managedAccountHandle,
          managedAccountDisplayName,
          managedAccountCategory,
          managedAccountGoalsSummary,
          connectionMode,
        },
        null,
        2,
      ),
    );

    return;
  }

  const result = await prisma.$transaction(async (transaction) => {
    const adminUser = await transaction.adminUser.upsert({
      where: { email: seedAdminEmail },
      update: {
        passwordHash,
      },
      create: {
        email: seedAdminEmail,
        passwordHash,
      },
    });

    const managedAccount = await transaction.managedAccount.upsert({
      where: { xHandle: managedAccountHandle },
      update: {
        displayName: managedAccountDisplayName,
        category: managedAccountCategory,
        connectionMode,
        goalsSummary: managedAccountGoalsSummary,
        createdByAdminUserId: adminUser.id,
        archivedAt: null,
      },
      create: {
        xHandle: managedAccountHandle,
        displayName: managedAccountDisplayName,
        category: managedAccountCategory,
        connectionMode,
        goalsSummary: managedAccountGoalsSummary,
        createdByAdminUserId: adminUser.id,
      },
    });

    return {
      adminUser,
      managedAccount,
    };
  });

  console.log('Development seed applied successfully.');
  console.log(
    JSON.stringify(
      {
        adminUserId: result.adminUser.id,
        adminEmail: result.adminUser.email,
        managedAccountId: result.managedAccount.id,
        managedAccountHandle: result.managedAccount.xHandle,
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });