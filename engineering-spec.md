# X Automation Engineering Specification

## 1. Purpose

This document translates the PRD in plan.md into an implementation-oriented engineering specification for version 1 of X-automation.

The system will be built as a single-user application that:
1. Manages approved X accounts.
2. Stores account preferences and competitor sets.
3. Runs asynchronous research pipelines.
4. Aggregates creator, competitor, X-native, and external trend signals.
5. Uses Gemini Flash to generate draft posts.
6. Validates drafts for novelty, style fit, and policy risk.
7. Persists evidence, artifacts, and review decisions.

Version 1 explicitly excludes publishing, scheduling, and engagement automation.

## 2. Architecture Summary

### 2.1 Current foundation

The codebase currently provides:
1. JWT-based login on the server.
2. A minimal React client with login and a protected home page.
3. A Prisma-backed PostgreSQL database with placeholder models.

### 2.2 Target architecture

The target architecture should remain aligned with the current NestJS and React structure but add domain modules and asynchronous orchestration.

### 2.3 Recommended backend modules

1. auth
Owns admin authentication and JWT issuance.
2. managed-accounts
Owns account records, account metadata, and connection status.
3. credentials
Owns encrypted API tokens and encrypted browser session artifacts.
4. preferences
Owns account goals, exclusions, and style constraints.
5. competitors
Owns manual competitors and system-suggested competitors.
6. research-runs
Owns run lifecycle, stage progress, retries, and artifact indexes.
7. source-ingestion
Owns creator, competitor, X trend, and external source reads.
8. topic-scoring
Owns normalized topic candidate scoring.
9. generation
Owns Gemini prompt construction, generation, and response validation.
10. review
Owns draft review decisions and edited outputs.
11. audit
Owns security and product audit logging.

### 2.3.1 Shared backend conventions

1. Every feature module lives under `server/src/<feature-name>/` and keeps its primary Nest files at the module root: `<feature>.module.ts`, `<feature>.service.ts`, and controller files when the module exposes HTTP endpoints.
2. Request and response DTOs live under `server/src/<feature-name>/dto/`.
3. Feature-specific guards, strategies, adapters, and policies stay inside their feature module folder. Cross-cutting infrastructure that is reused across modules lives under `server/src/shared/`.
4. Successful HTTP responses use the shared envelope `{ success: true, requestId, data, meta? }`.
5. Error HTTP responses use the shared envelope `{ success: false, requestId, error: { code, message, details? } }`.
6. Shared error codes are stable, uppercase identifiers intended for client branching and audit review. Initial v1 taxonomy includes `VALIDATION_FAILED`, `AUTH_INVALID_CREDENTIALS`, `AUTH_UNAUTHORIZED`, `AUTH_FORBIDDEN`, `RESOURCE_NOT_FOUND`, `RESOURCE_CONFLICT`, `BAD_REQUEST`, `RATE_LIMITED`, and `INTERNAL_ERROR`.
7. Pagination query DTOs use shared validation defaults with `page`, `pageSize`, and a response `meta.pagination` object containing `page`, `pageSize`, `totalItems`, and `totalPages`.
8. Every HTTP request propagates an `x-request-id` header. Incoming values are preserved when supplied by the caller; otherwise the server generates one and echoes it in the response.
9. Global validation uses NestJS `ValidationPipe` with transformation enabled, whitelist enforcement enabled, non-whitelisted fields rejected, and validation failures mapped into the shared error envelope.

### 2.3.2 Shared frontend conventions

1. The client keeps the existing React Router stack and does not add a separate state-management or data-fetching library in v1.
2. All API calls go through a shared typed client under `client/src/shared/services/` that applies the base URL, bearer token, request id header, shared response-envelope parsing, and normalized application errors.
3. Auth token persistence remains in local storage for v1, with helper functions isolated in `client/src/services/auth.ts`.
4. Authenticated routes render inside a shared layout under `client/src/layouts/` and use nested routes so navigation chrome, logout actions, and page spacing stay consistent.
5. Reusable loading, error, and empty states live under `client/src/shared/components/` and should be used before page-specific fallback markup is introduced.
6. Future run-progress screens use the shared polling hook under `client/src/shared/hooks/`, with an immediate leading fetch, a default 10-second interval, automatic pause while the document is hidden, and explicit stop conditions for terminal run states.
7. Shared API failures expose stable error codes from the backend envelope so views can branch on `AUTH_INVALID_CREDENTIALS`, `VALIDATION_FAILED`, and later domain-specific codes without duplicating axios handling.

### 2.4 Recommended infrastructure components

1. PostgreSQL for source-of-truth product state.
2. Redis-backed queue for asynchronous stage execution.
3. Prisma ORM for relational persistence.
4. Gemini Flash as the primary model provider.
5. A provider abstraction for X API, browser-driven reads, and external trend sources.
6. Encrypted secret storage for X credentials and browser session artifacts.

### 2.5 Recommended queue technology

BullMQ is the recommended queue layer because it fits the NestJS runtime model, supports retries and delayed jobs, and is a practical choice for persisted async orchestration.

### 2.6 Locked implementation decisions

1. Creator-history policy: analyze a rolling 180-day window, target the most recent 120 posts, require a minimum viable corpus of 40 posts, and backfill up to 365 days until 120 posts are gathered or a hard cap of 250 posts is reached. In v1 this policy is global-only and not overrideable per managed account.
2. noveltyLookbackDays default: 120 days, configurable within a bounded range of 30 to 365 days.
3. Active-run rule: only one active research run is allowed per managed account in v1, and both QUEUED and RUNNING count as active.
4. Competitor suggestions are generated only during research runs. There is no dedicated on-demand refresh endpoint in v1.
5. Initial topic-scoring formula: overallScore = 0.35 * creatorFitScore + 0.20 * trendMomentumScore + 0.25 * noveltyScore + 0.15 * audienceFitScore + 0.05 * (1 - policyRiskScore), with a hard exclusion for policyRiskScore >= 0.70.
6. First-release external provider bundle: Google Trends, a first-party curated RSS and news aggregation pipeline, and GDELT enrichment.
7. Credential protection model: envelope encryption using a per-record AES-256-GCM data-encryption key wrapped by a KMS or Vault-managed key-encryption key, with an environment-managed master-key fallback permitted only for local development.
8. Browser automation scope: strictly read-only. Passive session validation for read access is allowed, but account mutation and broader health workflows are not.

## 3. Domain Model

### 3.1 Design principles

1. Separate account metadata from sensitive credentials.
2. Separate run records from large artifacts.
3. Persist stage outputs so partial runs remain inspectable.
4. Normalize core entities, but allow JSON payloads for provider-specific evidence snapshots.
5. Add timestamps and auditability to every mutable record.

### 3.2 Primary entities

The following tables are required in v1.

### 3.3 Schema tables

#### AdminUser

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID | Existing model |
| email | String | Yes | Unique, indexed | Existing login identity |
| passwordHash | String | Yes |  | Existing bcrypt hash |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at | Add for auditability |

Indexes:
1. Unique on email.

Retention:
1. Permanent while the owner account is active.

#### ManagedAccount

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| xHandle | String | Yes | Unique, indexed | Canonical lowercase handle without @ |
| displayName | String | No |  | Human label |
| category | String | Yes | Indexed | Primary content category |
| status | Enum(ManagedAccountStatus) | Yes | Default ACTIVE | ACTIVE, PAUSED, DISCONNECTED, ARCHIVED |
| connectionMode | Enum(AccountConnectionMode) | Yes |  | API_ONLY, BROWSER_ONLY, HYBRID |
| goalsSummary | String | No |  | High-level operator summary |
| notes | String | No |  | Internal notes |
| createdByAdminUserId | String | Yes | FK -> AdminUser.id |  |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |
| archivedAt | DateTime | No |  | Soft archive marker |

Indexes:
1. Unique on xHandle.
2. Index on status.
3. Index on category.

Retention:
1. Soft-delete only in v1.

#### ManagedAccountCredential

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| managedAccountId | String | Yes | FK -> ManagedAccount.id, indexed |  |
| credentialType | Enum(CredentialType) | Yes | Indexed | X_API_TOKEN, X_API_REFRESH_TOKEN, BROWSER_SESSION |
| encryptedPayload | String | Yes |  | Encrypted blob |
| keyVersion | String | Yes |  | Encryption key version |
| status | Enum(CredentialStatus) | Yes | Default ACTIVE | ACTIVE, REVOKED, EXPIRED, INVALID |
| lastValidatedAt | DateTime | No |  | Last health check |
| expiresAt | DateTime | No |  | Optional expiration |
| createdByAdminUserId | String | Yes | FK -> AdminUser.id |  |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |
| revokedAt | DateTime | No |  |  |

Indexes:
1. Index on managedAccountId and credentialType.
2. Index on status.

Retention:
1. Revoked records retained for audit.
2. Encrypted payload never logged.

#### AccountPreference

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| managedAccountId | String | Yes | FK -> ManagedAccount.id, unique | One active preference profile per account in v1 |
| objective | String | No |  | Reach, authority, engagement, education, etc. |
| toneGuidance | Json | No |  | Structured tone hints |
| bannedThemes | Json | No |  | Array of blocked themes |
| bannedClaims | Json | No |  | Array of blocked claims or sensitive assertions |
| bannedFormats | Json | No |  | Avoid threads, hashtags, etc. |
| preferredFormats | Json | No |  | Single-post, question-led, contrarian, etc. |
| competitorSuggestionEnabled | Boolean | Yes | Default true |  |
| externalTrendEnabled | Boolean | Yes | Default true |  |
| noveltyLookbackDays | Int | Yes | Default 120 | Bounded configuration range: 30 to 365; this is the per-account override point for novelty checks, not for creator-history collection |
| maxDraftVariants | Int | Yes | Default 3 | Clamp in service layer |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |

Indexes:
1. Unique on managedAccountId.

Retention:
1. Current record updated in place in v1.
2. Preference revisions can be added later if needed.

#### Competitor

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| managedAccountId | String | Yes | FK -> ManagedAccount.id, indexed | Scoped to one managed account |
| xHandle | String | Yes | Indexed | Canonical lowercase handle |
| displayName | String | No |  |  |
| source | Enum(CompetitorSource) | Yes |  | MANUAL, SUGGESTED_ACCEPTED |
| status | Enum(CompetitorStatus) | Yes | Default ACTIVE | ACTIVE, REJECTED, ARCHIVED |
| acceptedFromSuggestionId | String | No | FK -> CompetitorSuggestion.id | Optional provenance |
| createdByAdminUserId | String | No | FK -> AdminUser.id | For manual adds |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |

Indexes:
1. Unique on managedAccountId and xHandle.
2. Index on status.

Retention:
1. Archived instead of deleted.

#### CompetitorSuggestion

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| managedAccountId | String | Yes | FK -> ManagedAccount.id, indexed |  |
| xHandle | String | Yes | Indexed |  |
| displayName | String | No |  |  |
| suggestionReason | Json | Yes |  | Evidence summary |
| confidenceScore | Decimal | Yes |  | 0.00 - 1.00 |
| status | Enum(SuggestionStatus) | Yes | Default PENDING | PENDING, ACCEPTED, REJECTED, EXPIRED |
| generatedByRunId | String | No | FK -> ResearchRun.id | Optional |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |
| decidedAt | DateTime | No |  |  |

Indexes:
1. Unique on managedAccountId and xHandle and status if active suggestions must dedupe.
2. Index on status.
3. Index on generatedByRunId.

Retention:
1. Retain for quality analysis.

#### ResearchRun

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| managedAccountId | String | Yes | FK -> ManagedAccount.id, indexed |  |
| requestedByAdminUserId | String | Yes | FK -> AdminUser.id |  |
| status | Enum(RunStatus) | Yes | Indexed | QUEUED, RUNNING, PARTIAL, FAILED, COMPLETED, REVIEWED, CANCELED |
| priority | Enum(RunPriority) | Yes | Default NORMAL | LOW, NORMAL, HIGH |
| currentStage | Enum(RunStage) | No | Indexed | Current active stage |
| progressPercent | Int | Yes | Default 0 | 0 - 100 |
| inputSnapshot | Json | Yes |  | Preferences, competitors, options at run start |
| summary | Json | No |  | Final run summary |
| warningCount | Int | Yes | Default 0 |  |
| errorCount | Int | Yes | Default 0 |  |
| startedAt | DateTime | No |  |  |
| completedAt | DateTime | No |  |  |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |

Indexes:
1. Index on managedAccountId and createdAt descending.
2. Index on status.
3. Index on currentStage.

Retention:
1. Retain all runs in v1.
2. Artifacts may have TTL or archival rules.

#### ResearchRunStage

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| researchRunId | String | Yes | FK -> ResearchRun.id, indexed |  |
| stage | Enum(RunStage) | Yes | Indexed | One row per stage attempt |
| attemptNumber | Int | Yes | Default 1 | Retry-safe |
| status | Enum(StageStatus) | Yes | Indexed | PENDING, RUNNING, COMPLETED, PARTIAL, FAILED, SKIPPED |
| progressPercent | Int | Yes | Default 0 |  |
| inputRef | Json | No |  | Artifact refs or stage parameters |
| outputRef | Json | No |  | Artifact refs or summary ids |
| errorCode | String | No |  |  |
| errorMessage | String | No |  | Sanitized only |
| startedAt | DateTime | No |  |  |
| completedAt | DateTime | No |  |  |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |

Indexes:
1. Unique on researchRunId, stage, attemptNumber.
2. Index on researchRunId and stage.
3. Index on status.

Retention:
1. Retain for debugging and observability.

#### SourceSnapshot

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| researchRunId | String | Yes | FK -> ResearchRun.id, indexed |  |
| sourceType | Enum(SourceType) | Yes | Indexed | CREATOR_POSTS, COMPETITOR_POSTS, X_TRENDS, EXTERNAL_NEWS, EXTERNAL_WEB |
| sourceKey | String | Yes | Indexed | Provider-specific identifier |
| fetchedAt | DateTime | Yes | Default now() |  |
| itemCount | Int | Yes | Default 0 |  |
| rawPayload | Json | Yes |  | Raw normalized snapshot |
| normalizedPayload | Json | No |  | Optional post-normalization record |
| retentionUntil | DateTime | No |  | Optional TTL boundary |
| createdAt | DateTime | Yes | Default now() |  |

Indexes:
1. Index on researchRunId and sourceType.
2. Index on sourceKey.

Retention:
1. Raw payload retention may be shorter than run metadata.

#### CreatorProfileArtifact

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| researchRunId | String | Yes | FK -> ResearchRun.id, unique | One creator profile summary per run |
| accountSnapshotWindowDays | Int | Yes |  |  |
| analyzedPostCount | Int | Yes |  |  |
| styleProfile | Json | Yes |  | Voice, hook, pacing, vocab patterns |
| topicProfile | Json | Yes |  | Topic clusters and recurrence |
| engagementProfile | Json | No |  | Observed signal summary |
| exclusionsProfile | Json | No |  | Derived repetition boundaries |
| createdAt | DateTime | Yes | Default now() |  |

Indexes:
1. Unique on researchRunId.

Retention:
1. Retain with run.

#### CompetitorInsightArtifact

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| researchRunId | String | Yes | FK -> ResearchRun.id, unique | Aggregate competitor analysis |
| competitorCount | Int | Yes |  |  |
| postingPatternSummary | Json | Yes |  |  |
| topicPatternSummary | Json | Yes |  |  |
| hookPatternSummary | Json | Yes |  |  |
| gapOpportunities | Json | No |  |  |
| createdAt | DateTime | Yes | Default now() |  |

Indexes:
1. Unique on researchRunId.

#### TopicCandidate

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| researchRunId | String | Yes | FK -> ResearchRun.id, indexed |  |
| topicKey | String | Yes | Indexed | Canonical dedupe key |
| title | String | Yes |  | Human-readable topic label |
| description | String | No |  |  |
| sourceMix | Json | Yes |  | Which sources contributed |
| creatorFitScore | Decimal | Yes |  | 0.00 - 1.00 |
| trendMomentumScore | Decimal | Yes |  | 0.00 - 1.00 |
| noveltyScore | Decimal | Yes |  | 0.00 - 1.00 |
| audienceFitScore | Decimal | Yes |  | 0.00 - 1.00 |
| policyRiskScore | Decimal | Yes |  | 0.00 - 1.00, lower is better |
| overallScore | Decimal | Yes | Indexed | Weighted score |
| rationale | Json | Yes |  | Evidence-backed explanation |
| status | Enum(TopicCandidateStatus) | Yes | Default ACTIVE | ACTIVE, DROPPED, SELECTED |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |

Indexes:
1. Unique on researchRunId and topicKey.
2. Index on researchRunId and overallScore descending.
3. Index on status.

#### DraftVariant

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| researchRunId | String | Yes | FK -> ResearchRun.id, indexed |  |
| topicCandidateId | String | Yes | FK -> TopicCandidate.id, indexed |  |
| variantNumber | Int | Yes |  | 1..N per run/topic |
| content | String | Yes |  | Generated or edited draft |
| generationPromptVersion | String | Yes |  | Prompt governance |
| modelName | String | Yes |  | gemini-flash variant used |
| styleFitScore | Decimal | No |  | 0.00 - 1.00 |
| noveltyScore | Decimal | No |  | 0.00 - 1.00 |
| duplicationRiskScore | Decimal | No |  | 0.00 - 1.00 |
| policyRiskScore | Decimal | No |  | 0.00 - 1.00 |
| evidenceSummary | Json | Yes |  | Why this was generated |
| validationSummary | Json | No |  | Post-generation checks |
| status | Enum(DraftVariantStatus) | Yes | Default GENERATED | GENERATED, FLAGGED, APPROVED, REJECTED, EDITED |
| createdAt | DateTime | Yes | Default now() |  |
| updatedAt | DateTime | Yes | Updated at |  |

Indexes:
1. Unique on researchRunId and topicCandidateId and variantNumber.
2. Index on researchRunId.
3. Index on status.

Retention:
1. Retain all variants for quality analysis.

#### ReviewDecision

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| draftVariantId | String | Yes | FK -> DraftVariant.id, unique if only one final decision in v1 |  |
| decidedByAdminUserId | String | Yes | FK -> AdminUser.id |  |
| decision | Enum(ReviewDecisionType) | Yes |  | APPROVED, REJECTED, NEEDS_RERUN |
| editedContent | String | No |  | If operator modified content |
| editDistance | Int | No |  | Stored for analytics |
| notes | String | No |  | Reviewer rationale |
| createdAt | DateTime | Yes | Default now() |  |

Indexes:
1. Unique on draftVariantId.
2. Index on decision.

#### AuditEvent

| Field | Type | Required | Constraints | Notes |
| --- | --- | --- | --- | --- |
| id | String | Yes | PK, UUID |  |
| actorAdminUserId | String | No | FK -> AdminUser.id, indexed |  |
| managedAccountId | String | No | FK -> ManagedAccount.id, indexed |  |
| researchRunId | String | No | FK -> ResearchRun.id, indexed |  |
| eventType | Enum(AuditEventType) | Yes | Indexed | LOGIN, CREDENTIAL_CREATED, RUN_CREATED, RUN_CANCELED, DRAFT_APPROVED, etc. |
| entityType | String | Yes |  |  |
| entityId | String | Yes |  |  |
| metadata | Json | No |  | Sanitized payload only |
| createdAt | DateTime | Yes | Default now() |  |

Indexes:
1. Index on createdAt descending.
2. Index on eventType.
3. Index on actorAdminUserId.

Retention:
1. Permanent in v1.

### 3.4 Required enums

| Enum | Values |
| --- | --- |
| ManagedAccountStatus | ACTIVE, PAUSED, DISCONNECTED, ARCHIVED |
| AccountConnectionMode | API_ONLY, BROWSER_ONLY, HYBRID |
| CredentialType | X_API_TOKEN, X_API_REFRESH_TOKEN, BROWSER_SESSION |
| CredentialStatus | ACTIVE, REVOKED, EXPIRED, INVALID |
| CompetitorSource | MANUAL, SUGGESTED_ACCEPTED |
| CompetitorStatus | ACTIVE, REJECTED, ARCHIVED |
| SuggestionStatus | PENDING, ACCEPTED, REJECTED, EXPIRED |
| RunStatus | QUEUED, RUNNING, PARTIAL, FAILED, COMPLETED, REVIEWED, CANCELED |
| RunPriority | LOW, NORMAL, HIGH |
| RunStage | PREPARE, COLLECT_CREATOR_DATA, ANALYZE_CREATOR, SUGGEST_COMPETITORS, COLLECT_COMPETITOR_DATA, ANALYZE_COMPETITORS, COLLECT_TRENDS, SCORE_TOPICS, GENERATE_DRAFTS, VALIDATE_DRAFTS, FINALIZE_RUN |
| StageStatus | PENDING, RUNNING, COMPLETED, PARTIAL, FAILED, SKIPPED |
| SourceType | CREATOR_POSTS, COMPETITOR_POSTS, X_TRENDS, EXTERNAL_NEWS, EXTERNAL_WEB |
| TopicCandidateStatus | ACTIVE, DROPPED, SELECTED |
| DraftVariantStatus | GENERATED, FLAGGED, APPROVED, REJECTED, EDITED |
| ReviewDecisionType | APPROVED, REJECTED, NEEDS_RERUN |
| AuditEventType | LOGIN, LOGOUT, CREDENTIAL_CREATED, CREDENTIAL_REVOKED, MANAGED_ACCOUNT_CREATED, MANAGED_ACCOUNT_UPDATED, COMPETITOR_ADDED, SUGGESTION_ACCEPTED, RUN_CREATED, RUN_STARTED, RUN_STAGE_COMPLETED, RUN_FAILED, DRAFT_GENERATED, DRAFT_APPROVED, DRAFT_REJECTED |

### 3.5 Relationship summary

1. AdminUser has many ManagedAccount records through createdByAdminUserId.
2. ManagedAccount has many ManagedAccountCredential records.
3. ManagedAccount has one AccountPreference in v1.
4. ManagedAccount has many Competitor records.
5. ManagedAccount has many CompetitorSuggestion records.
6. ManagedAccount has many ResearchRun records.
7. ResearchRun has many ResearchRunStage records.
8. ResearchRun has many SourceSnapshot records.
9. ResearchRun has one CreatorProfileArtifact.
10. ResearchRun has one CompetitorInsightArtifact.
11. ResearchRun has many TopicCandidate records.
12. TopicCandidate has many DraftVariant records.
13. DraftVariant has zero or one ReviewDecision.

## 4. API Design

### 4.1 API conventions

1. All endpoints except auth login are JWT-protected.
2. All request and response DTOs should be versionable and explicit.
3. Validation should use class-validator.
4. Response envelopes should be consistent.

Recommended response envelope:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Recommended error envelope:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "RUN_NOT_FOUND",
    "message": "Research run not found"
  }
}
```

### 4.2 Auth endpoints

#### POST /auth/login

Purpose:
Authenticate the single owner account.

Auth:
Public.

Request:

```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "data": {
    "accessToken": "jwt",
    "user": {
      "id": "uuid",
      "email": "admin@example.com"
    }
  },
  "meta": {},
  "error": null
}
```

Errors:
1. INVALID_CREDENTIALS

### 4.3 Managed account endpoints

#### GET /managed-accounts

Purpose:
List managed accounts.

Auth:
Required.

Query params:
1. status
2. category
3. search
4. page
5. pageSize

Response data:
Array of managed account summaries.

Errors:
1. VALIDATION_ERROR

#### POST /managed-accounts

Purpose:
Create a managed account.

Auth:
Required.

Request:

```json
{
  "xHandle": "creator_handle",
  "displayName": "Creator Name",
  "category": "startup",
  "connectionMode": "HYBRID",
  "goalsSummary": "Grow reach with founder-led product content"
}
```

Response:
Created managed account detail.

Errors:
1. DUPLICATE_HANDLE
2. VALIDATION_ERROR

#### GET /managed-accounts/:accountId

Purpose:
Retrieve account detail and connection status summary.

Auth:
Required.

Errors:
1. MANAGED_ACCOUNT_NOT_FOUND

#### PATCH /managed-accounts/:accountId

Purpose:
Update account metadata.

Auth:
Required.

Errors:
1. MANAGED_ACCOUNT_NOT_FOUND
2. VALIDATION_ERROR

#### POST /managed-accounts/:accountId/archive

Purpose:
Soft archive a managed account.

Auth:
Required.

Errors:
1. MANAGED_ACCOUNT_NOT_FOUND
2. ACCOUNT_ALREADY_ARCHIVED

### 4.4 Credential endpoints

#### GET /managed-accounts/:accountId/credentials

Purpose:
List credential records without exposing secrets.

Auth:
Required.

Response:
Credential summaries only.

#### POST /managed-accounts/:accountId/credentials

Purpose:
Store an encrypted credential or browser session artifact.

Auth:
Required.

Request:

```json
{
  "credentialType": "BROWSER_SESSION",
  "payload": {
    "cookies": [{"name": "auth_token", "value": "..."}],
    "userAgent": "..."
  }
}
```

Server behavior:
1. Encrypt payload before persistence.
2. Never echo payload back in response.

Errors:
1. MANAGED_ACCOUNT_NOT_FOUND
2. INVALID_CREDENTIAL_PAYLOAD

#### POST /managed-accounts/:accountId/credentials/:credentialId/validate

Purpose:
Run a passive validation check against the credential.

Auth:
Required.

Response:

```json
{
  "data": {
    "status": "ACTIVE",
    "lastValidatedAt": "2026-03-08T12:00:00Z"
  },
  "meta": {},
  "error": null
}
```

Validation note:
1. Browser-session validation must remain read-only and must not perform any state-changing actions.

#### POST /managed-accounts/:accountId/credentials/:credentialId/revoke

Purpose:
Revoke a stored credential.

Auth:
Required.

Errors:
1. CREDENTIAL_NOT_FOUND

### 4.5 Preference endpoints

#### GET /managed-accounts/:accountId/preferences

Purpose:
Read the active preference profile.

#### PUT /managed-accounts/:accountId/preferences

Purpose:
Create or replace the active preference profile.

Request:

```json
{
  "objective": "reach",
  "toneGuidance": {
    "voice": "confident and concise"
  },
  "bannedThemes": ["politics"],
  "bannedClaims": ["guaranteed revenue outcomes"],
  "preferredFormats": ["question_hook", "pov_statement"],
  "noveltyLookbackDays": 120,
  "maxDraftVariants": 3
}
```

Errors:
1. MANAGED_ACCOUNT_NOT_FOUND
2. VALIDATION_ERROR

### 4.6 Competitor endpoints

#### GET /managed-accounts/:accountId/competitors

Purpose:
List active and archived competitors.

#### POST /managed-accounts/:accountId/competitors

Purpose:
Create a manual competitor.

Request:

```json
{
  "xHandle": "competitor_handle",
  "displayName": "Competitor Name"
}
```

Errors:
1. DUPLICATE_COMPETITOR
2. MANAGED_ACCOUNT_NOT_FOUND

#### PATCH /managed-accounts/:accountId/competitors/:competitorId

Purpose:
Update competitor metadata or status.

#### GET /managed-accounts/:accountId/competitor-suggestions

Purpose:
List pending and historical suggestions.

Rules:
1. Suggestions are generated only during research runs.
2. There is no manual refresh endpoint in v1.
3. Pending suggestions expire 30 days after creation if they remain undecided.
4. Rejected suggestions do not resurface automatically for the same managed account and handle in v1.
5. Expired suggestions may reappear only in a later research run when fresh evidence supports them.

#### POST /managed-accounts/:accountId/competitor-suggestions/:suggestionId/accept

Purpose:
Convert a suggestion into an active competitor.

Acceptance behavior:
1. Acceptance creates the active competitor immediately in the same operation.
2. The suggestion is marked ACCEPTED and retains provenance for audit and quality analysis.

Errors:
1. SUGGESTION_NOT_FOUND
2. SUGGESTION_NOT_PENDING

#### POST /managed-accounts/:accountId/competitor-suggestions/:suggestionId/reject

Purpose:
Reject a suggestion.

Rejection behavior:
1. Rejection marks the suggestion REJECTED immediately.
2. A rejected suggestion is retained for audit and does not reappear automatically in v1.

### 4.7 Research run endpoints

#### POST /managed-accounts/:accountId/runs

Purpose:
Create a new research run.

Auth:
Required.

Request:

```json
{
  "priority": "NORMAL",
  "forceCompetitorSuggestionRefresh": true,
  "forceExternalTrendRefresh": true
}
```

Concurrency rule:
1. A new run may be created only when the managed account has no existing run in QUEUED or RUNNING status.
2. Operators may cancel a queued or running run and then create a new run.
3. Superseding or overriding an existing active run within the create-run request is not supported in v1.

Response:

```json
{
  "data": {
    "id": "run_uuid",
    "status": "QUEUED",
    "currentStage": "PREPARE",
    "progressPercent": 0
  },
  "meta": {},
  "error": null
}
```

Errors:
1. MANAGED_ACCOUNT_NOT_FOUND
2. ACCOUNT_NOT_READY
3. RUN_ALREADY_ACTIVE

RUN_ALREADY_ACTIVE behavior:
1. HTTP status: 409 Conflict.
2. Error payload:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "RUN_ALREADY_ACTIVE",
    "message": "A queued or running research run already exists for this managed account. Cancel it before starting another run.",
    "details": {
      "blockingRunId": "run_uuid",
      "blockingRunStatus": "RUNNING"
    }
  }
}
```

Client behavior:
1. UI copy for blocked run creation should read: "A research run is already queued or running for this account. Cancel the active run before starting another."
2. The UI should direct the operator to the blocking run detail or offer a cancel action when the current view supports it.

#### GET /managed-accounts/:accountId/runs

Purpose:
List runs for an account.

Query params:
1. status
2. page
3. pageSize

#### GET /runs/:runId

Purpose:
Return run detail, high-level status, and summary.

#### GET /runs/:runId/stages

Purpose:
Return stage-level status entries.

#### GET /runs/:runId/artifacts

Purpose:
Return a list of available artifact references for a run.

#### GET /runs/:runId/artifacts/creator-profile

Purpose:
Return creator profile artifact.

#### GET /runs/:runId/artifacts/competitor-insights

Purpose:
Return competitor insight artifact.

#### GET /runs/:runId/topic-candidates

Purpose:
Return ranked topic candidates.

#### POST /runs/:runId/cancel

Purpose:
Cancel a queued or active run.

Successful cancellation clears the active-run block for later rerun requests.

Errors:
1. RUN_NOT_FOUND
2. RUN_NOT_CANCELABLE

### 4.8 Draft endpoints

#### GET /runs/:runId/drafts

Purpose:
List draft variants for a run.

#### GET /drafts/:draftId

Purpose:
Return draft detail including evidence and validation summary.

#### POST /drafts/:draftId/review

Purpose:
Persist a review decision.

Request:

```json
{
  "decision": "APPROVED",
  "editedContent": "Edited final draft",
  "notes": "Tightened hook and reduced claim intensity"
}
```

Response:

```json
{
  "data": {
    "reviewDecisionId": "uuid",
    "decision": "APPROVED"
  },
  "meta": {},
  "error": null
}
```

Errors:
1. DRAFT_NOT_FOUND
2. DRAFT_ALREADY_REVIEWED if v1 enforces a single terminal decision
3. VALIDATION_ERROR

### 4.9 Audit endpoints

#### GET /audit-events

Purpose:
List audit events for admin review.

Query params:
1. actorAdminUserId
2. managedAccountId
3. researchRunId
4. eventType
5. page
6. pageSize

### 4.10 DTO validation requirements

All DTOs should include:
1. String normalization for xHandle values.
2. Numeric range validation for scores and lookback windows.
3. Enum validation for statuses and modes.
4. Explicit limits for payload sizes.
5. Rejection of unknown fields where practical.
6. Preference DTOs that accept noveltyLookbackDays must enforce the approved integer range of 30 to 365 with a default of 120.

## 5. Queue and Stage Orchestration

### 5.1 Queue model

Recommended queues:
1. research-run queue
Owns end-to-end orchestration.
2. source-ingestion queue
Owns provider fetch jobs.
3. generation queue
Owns Gemini generation and validation.

Recommended job idempotency key:
1. researchRunId plus stage plus attemptNumber.

### 5.2 Stage ordering

1. PREPARE
2. COLLECT_CREATOR_DATA
3. ANALYZE_CREATOR
4. SUGGEST_COMPETITORS
5. COLLECT_COMPETITOR_DATA
6. ANALYZE_COMPETITORS
7. COLLECT_TRENDS
8. SCORE_TOPICS
9. GENERATE_DRAFTS
10. VALIDATE_DRAFTS
11. FINALIZE_RUN

### 5.3 Stage definitions

#### Stage: PREPARE

Purpose:
Validate prerequisites and snapshot run inputs.

Inputs:
1. managedAccountId
2. current AccountPreference
3. active Competitor set
4. credential availability summary
5. run creation options

Outputs:
1. ResearchRun inputSnapshot
2. Initial ResearchRunStage record
3. prerequisite validation summary

Artifacts persisted:
1. inputSnapshot on ResearchRun

Retry behavior:
1. Retry zero times for validation failures.
2. Retry once for transient database conflicts.

Failure semantics:
1. Hard fail if account is archived, disconnected, or missing required access.
2. Hard fail if there is no usable credential path.

#### Stage: COLLECT_CREATOR_DATA

Purpose:
Fetch recent creator posts and observed metadata.

Inputs:
1. managedAccount handle
2. credential path
3. creator-history policy: rolling 180-day window, target 120 posts, minimum 40 posts, backfill up to 365 days, hard cap 250 posts; global-only in v1

Outputs:
1. SourceSnapshot records for creator posts and related source metadata

Artifacts persisted:
1. SourceSnapshot rows with rawPayload and normalizedPayload

Retry behavior:
1. Retry up to 3 times with exponential backoff for network or provider failures.

Failure semantics:
1. Hard fail if no creator data can be retrieved.
2. Partial success allowed if some metadata is missing but core post corpus exists.

#### Stage: ANALYZE_CREATOR

Purpose:
Build the creator profile artifact.

Inputs:
1. Creator SourceSnapshot records
2. AccountPreference

Outputs:
1. CreatorProfileArtifact

Artifacts persisted:
1. styleProfile
2. topicProfile
3. engagementProfile
4. exclusionsProfile

Retry behavior:
1. Retry twice for transient AI or processing errors.

Failure semantics:
1. Hard fail if post corpus is below minimum threshold.
2. Hard fail if profile generation returns malformed output after retries.

#### Stage: SUGGEST_COMPETITORS

Purpose:
Generate competitor suggestions during the research run for later operator review and for current-run context.

Inputs:
1. CreatorProfileArtifact
2. Existing competitors
3. Optional X network and topic similarity signals

Outputs:
1. CompetitorSuggestion records

Artifacts persisted:
1. suggestionReason
2. confidenceScore

Retry behavior:
1. Retry twice for transient provider failures.

Failure semantics:
1. Soft fail allowed. Run continues using existing manual competitors.

#### Stage: COLLECT_COMPETITOR_DATA

Purpose:
Fetch recent post and profile data for active competitors.

Inputs:
1. Active Competitor records
2. access providers

Outputs:
1. SourceSnapshot records for competitor posts

Retry behavior:
1. Retry each competitor fetch up to 3 times independently.

Failure semantics:
1. Partial success allowed if at least one competitor corpus is available.
2. If all competitor fetches fail, continue run with warningCount incremented.

#### Stage: ANALYZE_COMPETITORS

Purpose:
Aggregate competitor insights into a normalized artifact.

Inputs:
1. competitor SourceSnapshot rows
2. CreatorProfileArtifact

Outputs:
1. CompetitorInsightArtifact

Retry behavior:
1. Retry twice for transient processing errors.

Failure semantics:
1. Soft fail allowed if insufficient competitor data exists.
2. Continue with lower confidence topic scoring.

#### Stage: COLLECT_TRENDS

Purpose:
Fetch X-native and external trend signals.

Inputs:
1. account category
2. creator topic profile
3. externalTrendEnabled preference

Outputs:
1. SourceSnapshot rows for X_TRENDS, EXTERNAL_NEWS, EXTERNAL_WEB

Retry behavior:
1. Retry external provider calls up to 3 times.

Failure semantics:
1. Partial success allowed if at least one trend source succeeds.
2. Hard fail only if all sources fail and there are no fallback topic candidates from creator and competitor analysis.

#### Stage: SCORE_TOPICS

Purpose:
Rank topic candidates using heuristic scoring.

Inputs:
1. CreatorProfileArtifact
2. CompetitorInsightArtifact if available
3. trend SourceSnapshot records
4. AccountPreference

Outputs:
1. TopicCandidate rows

Artifacts persisted:
1. rationale payload per topic

Scoring guidance:
1. overallScore = 0.35 * creatorFitScore + 0.20 * trendMomentumScore + 0.25 * noveltyScore + 0.15 * audienceFitScore + 0.05 * (1 - policyRiskScore).
2. Any topic with policyRiskScore >= 0.70 is excluded before ranking.
3. Weights are stored in server config only in v1, with the above values as the approved defaults.
4. Weights are global in v1 and are not category-specific.
5. No additional minimum overall-score survival threshold is applied in v1 beyond the hard policy-risk exclusion and normal ranking.

Retry behavior:
1. Retry once for transient scoring service failures.

Failure semantics:
1. Hard fail if zero viable topic candidates remain after scoring and filters.

#### Stage: GENERATE_DRAFTS

Purpose:
Generate draft variants for top-ranked topics using Gemini Flash.

Inputs:
1. top TopicCandidate rows
2. CreatorProfileArtifact
3. AccountPreference
4. prompt version config

Outputs:
1. DraftVariant rows in GENERATED status

Artifacts persisted:
1. evidenceSummary
2. prompt version
3. model name

Retry behavior:
1. Retry Gemini calls up to 2 times for provider or parse failures.

Failure semantics:
1. Partial success allowed if at least one draft is generated.
2. Hard fail if all requested generations fail.

#### Stage: VALIDATE_DRAFTS

Purpose:
Run novelty, style-fit, duplication-risk, and policy-risk checks.

Inputs:
1. DraftVariant rows
2. creator history corpus
3. prior draft corpus
4. AccountPreference

Outputs:
1. Updated DraftVariant validation fields
2. Flagged or rejected statuses where needed

Validation checks:
1. lexical overlap with recent creator posts
2. semantic similarity with recent creator posts
3. style-profile fit score
4. banned theme and banned claim checks
5. spam-risk heuristics such as repetitive hooks or irrelevant trend stuffing

Retry behavior:
1. Retry once for transient validation service failures.

Failure semantics:
1. Hard fail if no surviving draft remains after validation.
2. Partial success if some variants are flagged but at least one is still reviewable.

#### Stage: FINALIZE_RUN

Purpose:
Compute final run summary and terminal state.

Inputs:
1. stage statuses
2. surviving drafts
3. warning and error counts

Outputs:
1. ResearchRun summary
2. terminal status COMPLETED or PARTIAL or FAILED

Retry behavior:
1. Retry once for transient persistence failure.

Failure semantics:
1. If finalization fails, keep run in RUNNING with administrative alert and replay capability.

### 5.4 Progress calculation

Recommended progress weights:
1. PREPARE: 5
2. COLLECT_CREATOR_DATA: 15
3. ANALYZE_CREATOR: 10
4. SUGGEST_COMPETITORS: 5
5. COLLECT_COMPETITOR_DATA: 15
6. ANALYZE_COMPETITORS: 10
7. COLLECT_TRENDS: 10
8. SCORE_TOPICS: 10
9. GENERATE_DRAFTS: 10
10. VALIDATE_DRAFTS: 5
11. FINALIZE_RUN: 5

### 5.5 Retry policy summary

1. Validation and prerequisite failures should not retry automatically.
2. External provider and network failures should use bounded retries with exponential backoff.
3. AI parse failures should retry with a reduced-output fallback prompt once before terminal failure.
4. Each stage attempt must create or update a ResearchRunStage row.

## 6. Integration Contracts

### 6.1 Provider abstraction rule

All external dependencies should be wrapped in provider interfaces. Core domain services should never depend directly on a concrete API or browser automation library.

Bootstrap strategy:
1. The initial abstraction may ship with one real provider implementation and stub implementations for other approved providers until each adapter is completed.
2. The approved provider set is still fixed to Google Trends, first-party curated RSS and news aggregation, and GDELT enrichment.

### 6.2 X source adapter contract

Interface:

```ts
interface XSourceAdapter {
  fetchAccountPosts(input: FetchAccountPostsInput): Promise<NormalizedPostSnapshot>
  fetchCompetitorPosts(input: FetchCompetitorPostsInput): Promise<NormalizedPostSnapshot>
  fetchTrendSignals(input: FetchTrendSignalsInput): Promise<NormalizedTrendSnapshot>
  validateCredential(input: ValidateCredentialInput): Promise<CredentialValidationResult>
}
```

Normalized account post snapshot should include:
1. account handle
2. fetch window
3. normalized posts
4. observed engagement metrics if available
5. source provenance

Recommended concrete implementations:
1. XApiAdapter
2. XBrowserReadAdapter
3. HybridXAdapter that selects best available provider path

### 6.3 Browser session adapter rules

1. Read-only in v1.
2. Must consume encrypted session artifacts only in memory.
3. Must never persist decrypted cookie payloads.
4. Must emit sanitized provider logs only.
5. Must fail closed when session validity is uncertain.
6. May perform passive session validation required for read access only.
7. Must not run state-changing actions or broader account-health workflows.

### 6.4 External trend adapter contract

Interface:

```ts
interface ExternalTrendAdapter {
  fetchSignals(input: ExternalTrendFetchInput): Promise<NormalizedExternalTrendSnapshot>
}
```

Normalized trend signal should include:
1. source name
2. topic label
3. summary
4. recency timestamp
5. confidence or source weight
6. optional source url

Approved first-release providers:
1. Google Trends for search momentum.
2. A first-party curated RSS and news aggregation pipeline for domain-relevant news discovery.
3. GDELT as a broad enrichment and fallback signal source.

### 6.5 Gemini generation adapter contract

Interface:

```ts
interface GenerationAdapter {
  generateDrafts(input: GenerateDraftsInput): Promise<GenerateDraftsResult>
  analyzeCreatorProfile(input: AnalyzeCreatorProfileInput): Promise<AnalyzeCreatorProfileResult>
  analyzeCompetitorCorpus(input: AnalyzeCompetitorCorpusInput): Promise<AnalyzeCompetitorCorpusResult>
}
```

Requirements:
1. All Gemini responses must be schema-validated.
2. Prompts must be versioned.
3. Prompt and response logs must be redacted where needed.
4. Model name and latency must be recorded per call.

## 7. Frontend Technical Design

### 7.1 Route map

Recommended authenticated routes under the protected shell:
1. /home
Dashboard summary and recent runs.
2. /home/accounts
Managed account list.
3. /home/accounts/:accountId
Managed account detail and configuration.
4. /home/accounts/:accountId/preferences
Preference editor.
5. /home/accounts/:accountId/competitors
Competitor workspace and suggestions.
6. /home/accounts/:accountId/runs
Run history list.
7. /home/runs/:runId
Run detail and stage monitor.
8. /home/runs/:runId/drafts/:draftId
Draft review detail.

### 7.2 Page responsibilities

Dashboard:
1. Show recent runs and statuses.
2. Highlight accounts needing credential validation or setup.

Managed account detail:
1. Show account metadata.
2. Show credential status summaries.
3. Show setup readiness for a run.

Competitor workspace:
1. Add manual competitors.
2. Accept and reject suggestions.
3. Display suggestion rationale.

Run detail page:
1. Poll or subscribe for stage progress.
2. Show stage statuses and warning states.
3. Link to artifacts and draft variants.

Draft review page:
1. Show generated content.
2. Show evidence summary.
3. Show validation results.
4. Allow edit and final decision submission.

### 7.3 Client-side service modules

Recommended client services:
1. auth.ts
2. managedAccounts.ts
3. preferences.ts
4. competitors.ts
5. runs.ts
6. drafts.ts
7. audit.ts

### 7.4 Client auth improvement

The client should move from a standalone login helper to a shared authenticated API client with:
1. bearer token injection
2. 401 handling
3. typed request helpers

## 8. Security Design

### 8.1 Secret handling

1. Encrypt ManagedAccountCredential.encryptedPayload at the application boundary.
2. Store encryption key version in the row.
3. Keep decrypted credentials in memory only for the duration of the provider call.
4. Never expose raw credential payloads in logs, error messages, or API responses.
5. Production credential storage uses envelope encryption with a per-record AES-256-GCM data key wrapped by a KMS or Vault-managed wrapping key.
6. Environment-managed master-key fallback is allowed only for local development.
7. Wrapped-key rotation should use versioned wrapping keys, forward writes on the new version, controlled re-wrap of existing records, and retirement of old versions only after verification.

### 8.2 Minimal access model

1. All product APIs require the authenticated JWT session.
2. V1 does not introduce RBAC, permission tiers, or account-state workflows.
3. Sensitive operations rely on the existing authenticated session plus audit logging.
4. Credential create and revoke actions are restricted to the authenticated owner admin in v1.

### 8.3 Audit coverage

Audit events must be written for:
1. login and logout
2. managed account create and update
3. credential create, validate, and revoke
4. competitor add and suggestion acceptance or rejection
5. run create, cancel, fail, and complete
6. draft approval and rejection

### 8.4 PII and sensitive data boundaries

1. Do not store more browser-session material than required.
2. Add retentionUntil on snapshots that include sensitive provider payloads.
3. Prefer normalized content artifacts over unbounded raw dumps where practical.
4. Browser automation is limited to passive session validation and read-only fetch behavior for approved managed accounts.
5. Browser automation may not create posts, schedule content, mutate account settings, or run broader account-health workflows in v1.

## 9. Observability

### 9.1 Logs

Structured logs should include:
1. requestId
2. researchRunId where applicable
3. stage
4. provider name
5. latency
6. terminal outcome

### 9.2 Metrics

Emit backend metrics for:
1. run count by status
2. stage latency by stage and provider
3. provider failure rate
4. generation success rate
5. validation rejection rate
6. approval rate

### 9.3 Alerts

Alert conditions should include:
1. repeated provider failure spikes
2. queue backlog growth beyond threshold
3. generation parse failures above threshold
4. credential validation failure spikes

## 10. Testing Strategy

### 10.1 Unit tests

1. DTO validation rules
2. topic scoring logic
3. novelty and duplication checks
4. prompt builder behavior
5. stage transition logic

### 10.2 Integration tests

1. managed account CRUD
2. competitor suggestion acceptance flow
3. run creation and stage persistence
4. draft review submission
5. encrypted credential persistence behavior

### 10.3 End-to-end tests

1. Login to account selection to run creation.
2. Run progress to draft review.
3. Partial failure path with degraded competitor or trend source.

### 10.4 Fixture strategy

Use deterministic fixtures for:
1. creator post corpora
2. competitor corpora
3. trend snapshots
4. Gemini structured responses

## 11. Migration Plan

### 11.1 Database migration sequence

1. Keep AdminUser minimal and add updatedAt only if needed for consistency.
2. Add ManagedAccount and ManagedAccountCredential.
3. Add AccountPreference, Competitor, CompetitorSuggestion.
4. Add ResearchRun and ResearchRunStage.
5. Add SourceSnapshot and analysis artifacts.
6. Add TopicCandidate, DraftVariant, ReviewDecision, AuditEvent.

### 11.2 Backend rollout sequence

1. Add DTO validation and response envelopes.
2. Implement managed account and preference modules.
3. Implement competitor module.
4. Implement run creation and queue skeleton.
5. Implement source ingestion adapters.
6. Implement generation and validation pipeline.
7. Implement review endpoints.

### 11.3 Frontend rollout sequence

1. Add authenticated shell and API client.
2. Add managed account list and detail pages.
3. Add competitor workspace.
4. Add run history and run detail screens.
5. Add draft review screen.

## 12. Approved Implementation Decisions

The following decisions are now locked for v1 and should be treated as implementation defaults rather than open questions:
1. Creator history uses the hybrid 180-day and 120-post policy defined in section 2.6, and that collection policy is global-only in v1.
2. Only one active run is allowed per managed account, and queued plus running states both count as active.
3. Competitor suggestions are computed only during research runs, accepted suggestions become active immediately, pending suggestions expire after 30 days, rejected suggestions do not resurface automatically in v1, and expired suggestions may reappear only in a later run with fresh evidence.
4. Topic scoring uses the approved v1 weighted formula and policy-risk hard gate defined in section 2.6, with config-only global weights and no additional minimum score threshold in v1.
5. The first-release external provider bundle is Google Trends, a first-party curated RSS and news aggregation pipeline, and GDELT enrichment.
6. Provider integrations may bootstrap with one real implementation plus stubs behind provider interfaces until each approved adapter is completed.
7. Credential storage uses envelope encryption with KMS or Vault-managed wrapping keys, with environment-key fallback allowed only for local development, and wrapped-key rotation must remain versioned and auditable.
8. Only the authenticated owner admin may create or revoke credentials in v1.
9. Browser automation remains strictly read-only and limited to passive validation plus read fetches.

## 13. Recommended File and Module Targets

### 13.1 Backend

Recommended additions under server/src:
1. managed-accounts/
2. credentials/
3. preferences/
4. competitors/
5. research-runs/
6. source-ingestion/
7. topic-scoring/
8. generation/
9. review/
10. audit/

### 13.2 Frontend

Recommended additions under client/src:
1. pages/AccountsPage.tsx
2. pages/AccountDetailPage.tsx
3. pages/AccountPreferencesPage.tsx
4. pages/CompetitorsPage.tsx
5. pages/RunsPage.tsx
6. pages/RunDetailPage.tsx
7. pages/DraftReviewPage.tsx
8. services/api.ts
9. services/managedAccounts.ts
10. services/runs.ts
11. services/drafts.ts

## 14. Delivery Readiness Checklist

Engineering should not start feature implementation until the following are true:
1. The schema and enum set are approved.
2. The run-stage contract and failure semantics are approved.
3. The initial provider set is approved.
4. The credential encryption approach is approved.
5. The topic scoring weights and novelty thresholds have initial defaults.
6. The review workflow is approved as the v1 terminal step.
