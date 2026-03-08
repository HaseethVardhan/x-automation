# Prisma Workflow

## Development Seed Baseline

V1 includes a minimal development seed that creates or updates:

1. One owner `AdminUser` used by the existing login flow.
2. One `ManagedAccount` linked to that owner.

Run it with:

```bash
pnpm run db:seed
```

Default development seed values:

1. `SEED_ADMIN_EMAIL=owner@x-automation.local`
2. `SEED_ADMIN_PASSWORD=dev-owner-password`
3. `SEED_MANAGED_ACCOUNT_HANDLE=xautomationdemo`
4. `SEED_MANAGED_ACCOUNT_DISPLAY_NAME=X Automation Demo`
5. `SEED_MANAGED_ACCOUNT_CATEGORY=technology`
6. `SEED_MANAGED_ACCOUNT_CONNECTION_MODE=HYBRID`
7. `SEED_MANAGED_ACCOUNT_GOALS_SUMMARY=Development seed account for local workflow setup.`

The seed is intentionally idempotent. It upserts the owner admin by email and the managed account by canonical `xHandle`.

For a no-write preview, set `SEED_DRY_RUN=true` before running the script.

## Migration Order

Development workflow:

1. Update `prisma/schema.prisma`.
2. Create the next migration with `pnpm exec prisma migrate dev --name <change-name>`.
3. Regenerate the client with `pnpm exec prisma generate` if you need it explicitly outside the migration command.
4. Run `pnpm run db:seed` to restore the baseline owner account and managed account after schema resets.
5. Start the application or run tests against the migrated database.

CI workflow:

1. Install dependencies.
2. Apply committed migrations with `pnpm exec prisma migrate deploy`.
3. Regenerate the client with `pnpm exec prisma generate`.
4. Run seeds only in disposable or explicitly prepared environments.
5. Run build and test steps after the database schema is current.

## Rollback Guidance

This repository uses forward-only Prisma migrations.

1. Do not edit a migration after it has been applied outside a disposable local environment.
2. For shared environments, rollback by restoring a database backup or snapshot, then deploy a corrective forward migration.
3. For local disposable environments, prefer `pnpm exec prisma migrate reset` followed by `pnpm run db:seed`.
4. Treat production seed execution as blocked unless `ALLOW_PRODUCTION_SEED=true` is set intentionally.